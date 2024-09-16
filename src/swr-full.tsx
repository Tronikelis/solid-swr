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

type InfiniteState<D, E> = {
    data: (D | undefined)[];
    err: E | undefined;
    isLoading: boolean;
};

type MatchMutateFilter = (key: string) => boolean;

export function useMatchMutate() {
    const ctx = useSwrContext();

    const mutate = <D,>(filter: MatchMutateFilter, payload: Mutator<D>) => {
        batch(() => {
            const keys = ctx.store.keys().filter(filter);
            for (const key of keys) {
                if (payload instanceof Function) {
                    ctx.store.updateDataProduce(key, payload);
                } else {
                    ctx.store.update(key, { data: payload });
                }
            }
        });
    };

    return uFn(mutate);
}

export function useSwrInfinite<D, E>(getKey: GetKey<D>, local?: Partial<SwrOpts<D, E>>) {
    const [state, setState] = createStore<InfiniteState<D, E>>({
        data: [],
        err: undefined,
        isLoading: false,
    });

    const [index, setIndex] = createSignal(0);

    createEffect(
        on(index, staticIndex => {
            const key = getKey(staticIndex, state.data?.at(-1));
            if (!key) return;

            const core = useSwr<D, E>(() => key, {
                ...local,
                onSuccess: (_, res) => setState("data", staticIndex, res),
                onError: (_, err) => setState("err", err),
            });

            createEffect(() => {
                setState("isLoading", core.v().isLoading);
            });
        })
    );

    return {
        index,
        setIndex,
        state,
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
