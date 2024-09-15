import {
    Accessor,
    batch,
    createContext,
    createEffect,
    getOwner,
    JSX,
    mergeProps,
    on,
    onCleanup,
    useContext,
} from "solid-js";

import Store from "./store";
import { tryCatch, uFn } from "./utils";

export type FetcherOpts = {
    signal: AbortSignal;
};

export type SwrOpts<D = unknown, E = unknown> = {
    store: Store;
    fetcher: (key: string, { signal }: FetcherOpts) => Promise<unknown>;
    onSuccess: (res: D) => void;
    onError: (err: E) => void;
};

export const useSwrContext = () => {
    return useContext(Context);
};

const Context = createContext<SwrOpts>({
    store: new Store(),
    fetcher: k => Promise.resolve(k),
    onSuccess: () => {},
    onError: () => {},
});

export const SwrProvider = (props: { value: Partial<SwrOpts>; children: JSX.Element }) => {
    return (
        // eslint-disable-next-line solid/reactivity
        <Context.Provider value={mergeProps(useSwrContext(), props.value)}>
            {props.children}
        </Context.Provider>
    );
};

export function useSwrLookup<D, E>(key: Accessor<string | undefined>) {
    const ctx = useSwrContext();
    return () => ctx.store.lookupUpsert<D, E>(key());
}

export default function useSwr<D, E>(
    key: Accessor<string | undefined>,
    local?: Partial<SwrOpts<D, E>>
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
                const item = ctx.store.lookupUpsert<D, E>(k);
                if (item._isBusy) return;

                const controller = new AbortController();
                if (getOwner()) {
                    onCleanup(() => {
                        controller.abort();
                    });
                }

                ctx.store.update(k, {
                    err: undefined,
                    _isBusy: true,
                    isLoading: true,
                });

                const [err, res] = await tryCatch<D, E>(
                    // eslint-disable-next-line solid/reactivity
                    () => ctx.fetcher(k, { signal: controller.signal }) as Promise<D>
                );

                if (
                    controller.signal.aborted &&
                    err instanceof DOMException &&
                    err.name === "AbortError"
                ) {
                    return;
                }

                batch(() => {
                    ctx.store.update(k, { _isBusy: false, isLoading: false });

                    if (err) {
                        ctx.store.update(k, { err });
                    } else {
                        ctx.store.update(k, {
                            data: res,
                            _isBusy: false,
                            isLoading: false,
                        });
                    }
                });

                return res as D;
            })
    );

    const mutate = uFn((producer: (data: D) => void): void =>
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            ctx.store.updateDataProduce<D>(k, producer);
        })
    );

    uFn(() => {
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            const item = ctx.store.lookupUpsert<D, E>(k);
            if (!item) return;
            // set defaults here
            ctx.store.update(k, { isLoading: true });
        });
    })();

    createEffect(on(key, revalidate));

    return {
        /** update data with immer-like producer fn */
        mutate,
        /** calls fetcher, updates store */
        revalidate,
        /** index into store */
        v: () => ctx.store.lookupUpsert(key()),
    };
}
