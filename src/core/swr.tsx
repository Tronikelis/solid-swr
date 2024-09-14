import {
    Accessor,
    createContext,
    createEffect,
    createMemo,
    JSX,
    mergeProps,
    onCleanup,
    useContext,
} from "solid-js";
import { unwrap } from "solid-js/store";

import uFn from "~/utils/uFn";

import Store from "./store";

type FetcherOpts = {
    signal: AbortSignal;
};

type SwrOpts = {
    isImmutable: boolean;
    store: Store;
    fetcher: (key: string, { signal }: FetcherOpts) => Promise<unknown>;
};

export const useSwrContext = () => {
    return useContext(Context);
};

const Context = createContext<SwrOpts>({
    store: new Store(),
    fetcher: k => Promise.resolve(k),
    isImmutable: false,
});

export const SwrProvider = (props: { value: Partial<SwrOpts>; children: JSX.Element }) => {
    const prev = useSwrContext();

    return (
        // eslint-disable-next-line solid/reactivity
        <Context.Provider value={mergeProps(prev, props.value)}>
            {props.children}
        </Context.Provider>
    );
};

export default function useSWR<D, E>(
    key: Accessor<string | undefined>,
    local?: Partial<SwrOpts>
) {
    const ctx = mergeProps(useSwrContext(), local);

    const runWithKey = <T extends (k: string) => any>(fn: T): ReturnType<T> | undefined => {
        const k = key();
        if (!k) return;
        return fn(k);
    };

    // eslint-disable-next-line solid/reactivity
    const revalidate = uFn(
        async (): Promise<D | undefined> =>
            // eslint-disable-next-line solid/reactivity
            runWithKey(async k => {
                const item = ctx.store.lookup(k);
                if (!item || item.isBusy) return;

                const controller = new AbortController();
                onCleanup(() => {
                    controller.abort();
                });

                if (ctx.isImmutable && item.data != null) {
                    return;
                }

                ctx.store.update(k, {
                    isBusy: true,
                    isLoading: true,
                });

                // todo: err handling
                const res = await ctx.fetcher(k, { signal: controller.signal });

                ctx.store.update(k, {
                    data: res,
                    isBusy: false,
                    isLoading: false,
                    err: undefined,
                });

                return res as D;
            })
    );

    const mutate = uFn((update: (prev: D | undefined) => D | undefined) =>
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            const current = unwrap(ctx.store.lookup<D, E>(k));
            const latest = update(current?.data);
            if (!latest) return;

            ctx.store.update(k, { ...current, data: latest });
        })
    );

    // eslint-disable-next-line solid/reactivity
    runWithKey(k => {
        const item = ctx.store.lookup<D, E>(k);
        if (!item) {
            ctx.store.insert<D, E>(k, {
                err: undefined,
                data: undefined,
                isBusy: false,
                isLoading: true,
            });

            // revalidate
            void revalidate();
        }
    });

    createEffect(() => revalidate());

    const v = createMemo(() =>
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            return ctx.store.lookup<D, E>(k);
        })
    );

    return {
        mutate,
        revalidate,
        // eslint-disable-next-line solid/reactivity
        get v() {
            return v();
        },
    };
}
