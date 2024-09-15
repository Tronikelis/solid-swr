import {
    Accessor,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    JSX,
    mergeProps,
    untrack,
    useContext,
} from "solid-js";

import { StoreItem } from "./store";
import useSwr, { SwrOpts, useSwrContext } from "./swr";
import { useWinEvent } from "./utils";

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

export default function useSwrFull<D, E>(
    key: Accessor<string | undefined>,
    opts?: Partial<SwrFullOpts & SwrOpts<D, E>>
): ReturnType<typeof useSwr<D, E>> {
    const ctx = mergeProps(useSwrContext(), useSwrFullContext(), opts);

    const [lazyKey, setLazyKey] = createSignal("");

    const core = useSwr<D, E>(key, opts);

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
        const item = ctx.store.lookupUpsert<D, E>(key());
        if (!ctx.keepPreviousData) return item;

        const lazy = ctx.store.lookupUpsert<D, E>(lazyKey());

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
