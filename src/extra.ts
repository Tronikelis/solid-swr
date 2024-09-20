import {
    Accessor,
    batch,
    createComponent,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    JSX,
    mergeProps,
    on,
    onCleanup,
    untrack,
    useContext,
} from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";

import {
    createMutator,
    createRevalidator,
    Mutator,
    SwrOpts,
    useSwr,
    useSwrContext,
} from "./core";
import { StoreItem } from "./store";
import { tryCatch, uFn, useWinEvent } from "./utils";

export type Fallback = {
    [key: string]: unknown;
};

export type SwrFullOpts = {
    keepPreviousData: boolean;
    revalidateOnFocus: boolean;
    revalidateOnOnline: boolean;
    fallback: Fallback;
    refreshInterval: number;
};

const Context = createContext<SwrFullOpts>({
    keepPreviousData: false,
    revalidateOnFocus: true,
    revalidateOnOnline: true,
    fallback: {},
    refreshInterval: 0,
});

export const useSwrFullContext = () => useContext(Context);

export const SwrFullProvider = (props: {
    children: JSX.Element;
    value: Partial<SwrFullOpts>;
}) => {
    // eslint-disable-next-line solid/reactivity
    const value = mergeProps(useSwrFullContext(), props.value);

    return createComponent(Context.Provider, {
        value,
        get children() {
            return props.children;
        },
    });
};

export type GetKey<D> = (index: number, prev: D | undefined) => string | undefined;

export function useMatchMutate() {
    const ctx = useSwrContext();
    const mutator = createMutator(ctx);

    const mutate = <D>(filter: (key: string) => boolean, payload: Mutator<D>) => {
        batch(() => {
            const keys = ctx.store.keys().filter(filter);

            for (const key of keys) {
                mutator(key, payload);
            }
        });
    };

    return uFn(mutate);
}

export function useSwrMutation<A, TD, TE, DD, DE>(
    key: Accessor<string | undefined>,
    fetcher: (arg: A) => Promise<TD>
) {
    const [isTriggering, setIsTriggering] = createSignal(false);
    const [err, setErr] = createSignal<TE | undefined>();

    const revalidator = createRevalidator();
    const revalidate = () => {
        const k = key();
        if (!k) return;
        return revalidator<DD, DE>(k);
    };

    const mutator = createMutator();
    const mutate = (payload: Mutator<DD>) => {
        const k = key();
        if (!k) return;
        return mutator<DD, DE>(k, payload);
    };

    /** this throws on errors */
    const trigger = uFn(async (arg: A): Promise<TD> => {
        setErr(undefined);

        setIsTriggering(true);
        const [err, res] = await tryCatch<TD, TE>(() => fetcher(arg));
        setIsTriggering(false);

        if (err) {
            setErr(() => err);
            throw err;
        }

        return res as TD;
    });

    return {
        err,
        trigger,
        mutate,
        revalidate,
        isTriggering,
    };
}

export function useSwrInfinite<D, E>(getKey: GetKey<D>, local?: Partial<SwrOpts<D, E>>) {
    const [data, setData] = createSignal<Accessor<StoreItem<D, E>>[]>([]);
    const [err, setErr] = createSignal<E | undefined>();
    const [isLoading, setIsLoading] = createSignal(false);

    const [index, setIndex] = createSignal(0);

    const ctx = mergeProps(useSwrContext(), local);

    createEffect(
        on(index, index => {
            const key = getKey(index, data().at(-1)?.().data);
            if (!key) return;

            setIsLoading(true);
            setErr(undefined);

            useSwr<D, E>(() => key, {
                ...local,
                onSuccess: () => {
                    setIsLoading(false);
                    setData(prev => {
                        prev = [...prev];
                        // eslint-disable-next-line solid/reactivity
                        prev[index] = () => ctx.store.lookupOrDef<D, E>(key);
                        return prev;
                    });
                },
                onError: (_, err) => {
                    setIsLoading(false);
                    setErr(() => err);
                },
            });
        })
    );

    return {
        index,
        setIndex,
        isLoading,
        data,
        err,
    };
}

export function useSwrFull<D, E>(
    key: Accessor<string | undefined>,
    _opts?: Partial<SwrFullOpts & SwrOpts<D, E>>
) {
    const ctx = mergeProps(useSwrContext(), useSwrFullContext(), _opts);

    const [lazyKey, setLazyKey] = createSignal("");

    const core = useSwr<D, E>(key, ctx);

    const [hasFetched, setHasFetched] = createSignal(false);
    // untrack is probably not needed here
    setHasFetched(untrack(() => !!core.v().data));

    createEffect(() => {
        if (ctx.refreshInterval <= 0) return;
        const interval = setInterval(core.revalidate, ctx.refreshInterval);
        onCleanup(() => clearInterval(interval));
    });

    createEffect(() => {
        if (!ctx.revalidateOnFocus) return;
        useWinEvent("focus", core.revalidate);
    });

    createEffect(() => {
        if (!ctx.revalidateOnOnline) return;
        useWinEvent("online", core.revalidate);
    });

    createEffect(() => {
        if (core.v().data || core.v().err) setHasFetched(true);
    });

    createEffect(() => {
        const k = key();
        if (ctx.keepPreviousData && core.v().data && k) setLazyKey(k);
    });

    const v = createMemo((): StoreItem<D, E> => {
        let item = ctx.store.lookupOrDef<D, E>(key());

        const lazy = ctx.store.lookupOrDef<D, E>(lazyKey());
        const keepPrev = ctx.keepPreviousData;

        // untrack here to not track all item properties when v is accessed
        return untrack(() => {
            if (keepPrev) item = lazy;

            const fallback = key() ? ctx.fallback[key()!] : undefined;
            const data = item.data || fallback;
            // eslint-disable-next-line solid/reactivity
            return mergeProps(item, { data }) as StoreItem<D, E>;
        });
    });

    return {
        ...core,
        hasFetched,
        v,
    };
}

/** freezes data after first truthy assignment of it */
export function createSwrImmutable<D, E>(key: Accessor<string | undefined>) {
    const ctx = useSwrContext();

    const [data, setData] = createStore<{ v: D | undefined }>({
        v: undefined,
    });

    let set = false;

    const trySet = () => {
        const current = unwrap(ctx.store.lookupOrDef<D, E>(key())).data;
        if (!current || set) return;

        set = true;
        setData("v", reconcile(current));
    };

    trySet();

    createEffect(trySet);

    return { v: () => data.v };
}