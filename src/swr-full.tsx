import {
    Accessor,
    batch,
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
import { createStore } from "solid-js/store";

import { StoreItem } from "./store";
import useSwr, { Mutator, SwrOpts, useSwrContext } from "./swr";
import { uFn, useWinEvent } from "./utils";
import { setDefaultResultOrder } from "dns";

type Fallback = {
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
    return (
        // eslint-disable-next-line solid/reactivity
        <Context.Provider value={mergeProps(useSwrFullContext(), props.value)}>
            {props.children}
        </Context.Provider>
    );
};

type GetKey<D> = (index: number, prev: D | undefined) => string | undefined;

type MatchMutateFilter = (key: string) => boolean;

export function useMatchMutate() {
    const ctx = useSwrContext();

    const update = <D,>(key: string, mutator: Mutator<D>) => {
        if (mutator instanceof Function) {
            ctx.store.updateDataProduce(key, mutator);
        } else {
            ctx.store.update(key, { data: mutator });
        }
    };

    const mutate = <D,>(filter: MatchMutateFilter, payload: Mutator<D>) => {
        batch(() => {
            const keys = ctx.store.keys().filter(filter);
            for (const key of keys) {
                update(key, payload);
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

export default function useSwrFull<D, E>(
    key: Accessor<string | undefined>,
    opts?: Partial<SwrFullOpts & SwrOpts<D, E>>
): ReturnType<typeof useSwr<D, E>> {
    const ctx = mergeProps(useSwrContext(), useSwrFullContext(), opts);

    const [lazyKey, setLazyKey] = createSignal("");

    const core = useSwr<D, E>(key, opts);

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
        const k = key();
        if (ctx.keepPreviousData && core.v()?.data && k) setLazyKey(k);
    });

    const v = createMemo((): StoreItem<D, E> => {
        const item = ctx.store.lookupOrDef<D, E>(key());
        if (!ctx.keepPreviousData) return item;

        const lazy = ctx.store.lookupOrDef<D, E>(lazyKey());

        // untrack here to not track all item properties when v is accessed
        return untrack(() => {
            const fallback = key() ? ctx.fallback[key()!] : undefined;
            const data = item.data || lazy.data || fallback;
            // eslint-disable-next-line solid/reactivity
            return mergeProps(item, { data }) as StoreItem<D, E>;
        });
    });

    return {
        ...core,
        v,
    };
}
