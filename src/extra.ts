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

import {
    createMutator,
    createRevalidator,
    Mutator,
    SwrOpts,
    useSwr,
    useSwrContext,
} from "./core";
import { StoreItem } from "./store";
import { uFn, useWinEvent } from "./utils";

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

export function useMatchRevalidate(opts?: SwrOpts) {
    const ctx = opts || useSwrContext();
    const revalidator = createRevalidator(ctx);

    const revalidate = (filter: (key: string) => boolean) => {
        batch(() => {
            const keys = ctx.store
                .keys()
                .filter(filter)
                // reduce unnecessary network requests
                .filter(x => ctx.store.lookupOrDef(x)._mountedCount > 0);

            for (const key of keys) {
                void revalidator(key);
            }
        });
    };

    return uFn(revalidate);
}

export function useMatchMutate(opts?: SwrOpts) {
    const ctx = opts || useSwrContext();
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
        const item = ctx.store.lookupOrDef<D, E>(key());

        const lazy = ctx.store.lookupOrDef<D, E>(lazyKey());
        const keepPrev = ctx.keepPreviousData;

        // untrack here to not track all item properties when v is accessed
        return untrack(() => {
            let data = item.data;
            if (keepPrev && lazy.data) data = lazy.data;

            const fallback = key() ? ctx.fallback[key()!] : undefined;
            // eslint-disable-next-line solid/reactivity
            return mergeProps(item, { data: data || fallback }) as StoreItem<D, E>;
        });
    });

    return {
        ...core,
        hasFetched,
        v,
    };
}
