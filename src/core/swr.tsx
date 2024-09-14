import {
    Accessor,
    createContext,
    createEffect,
    JSX,
    mergeProps,
    on,
    onCleanup,
    useContext,
} from "solid-js";
import { unwrap } from "solid-js/store";

import uFn from "~/utils/uFn";

import Store, { StoreItem } from "./store";

type FetcherOpts = {
    signal: AbortSignal;
};

type SwrOpts = {
    store: Store;
    fetcher: (key: string, { signal }: FetcherOpts) => Promise<unknown>;
};

export const useSwrContext = () => {
    return useContext(Context);
};

const Context = createContext<SwrOpts>({
    store: new Store(),
    fetcher: k => Promise.resolve(k),
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

    const lookup = (): StoreItem<D, E> | undefined =>
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            const item = ctx.store.lookup<D, E>(k);
            if (item) return item;

            ctx.store.insert<D, E>(k, {
                err: undefined,
                data: undefined,
                isBusy: false,
                isLoading: false,
            });

            return ctx.store.lookup<D, E>(k);
        });

    // eslint-disable-next-line solid/reactivity
    const revalidate = uFn(
        async (): Promise<D | undefined> =>
            // eslint-disable-next-line solid/reactivity
            runWithKey(async k => {
                const item = lookup();
                if (!item || item.isBusy) return;

                const controller = new AbortController();
                onCleanup(() => {
                    controller.abort();
                });

                ctx.store.update(k, {
                    err: undefined,
                    isBusy: true,
                    isLoading: true,
                });

                // todo: err handling
                const res = await ctx.fetcher(k, { signal: controller.signal });

                ctx.store.update(k, {
                    data: res,
                    isBusy: false,
                    isLoading: false,
                });

                return res as D;
            })
    );

    const mutate = uFn((update: (prev: D | undefined) => D | undefined) =>
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            const current = unwrap(lookup());
            const latest = update(current?.data);
            if (!latest) return;

            ctx.store.update(k, { ...current, data: latest });
        })
    );

    // default values in here
    (() =>
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            const item = lookup();
            if (!item) return;
            ctx.store.update(k, { isLoading: true });
        }))();

    createEffect(on(key, revalidate));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const v: StoreItem<D, E> = new Proxy<any>(
        {},
        {
            get: (_, prop: keyof StoreItem<D, E>) => lookup()?.[prop],
        }
    );

    return {
        mutate,
        revalidate,
        v,
    };
}
