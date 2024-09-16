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
import { noop, tryCatch, uFn } from "./utils";

export type FetcherOpts = {
    signal: AbortSignal;
};

export type SwrOpts<D = unknown, E = unknown> = {
    store: Store;
    fetcher: (key: string, { signal }: FetcherOpts) => Promise<unknown>;
    /** gets direct store references */
    onSuccess: (key: string, res: D) => void;
    /** gets direct store references */
    onError: (key: string, err: E) => void;

    /** gets direct references to response (don't mutate) */
    onSuccessDeduped: (key: string, res: D) => void;
    /** gets direct reference to response (don't mutate) */
    onErrorDeduped: (key: string, err: E) => void;
};

/**
 * data will be reconcile'd or produce'd,
 * if `undefined` is passed, data is deleted
 * */
export type Mutator<D> = D | ((draft: D) => void) | undefined;

export const useSwrContext = () => {
    return useContext(Context);
};

const Context = createContext<SwrOpts>({
    store: new Store(),
    fetcher: k => Promise.resolve(k),
    onSuccess: noop,
    onError: noop,
    onSuccessDeduped: noop,
    onErrorDeduped: noop,
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
    return () => ctx.store.lookupOrDef<D, E>(key());
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
                const item = ctx.store.lookupOrDef<D, E>(k);
                if (item._isBusy) return;

                const controller = new AbortController();
                if (getOwner()) {
                    onCleanup(() => {
                        ctx.store.update(k, { _isBusy: false });
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

                    const item = ctx.store.lookupOrDef(k);

                    if (err) {
                        ctx.store.update(k, { err, _onError: item._onError + 1 });
                        ctx.onErrorDeduped(k, err);
                    } else {
                        ctx.store.update(k, {
                            data: res,
                            isLoading: false,
                            _isBusy: false,
                            _onSuccess: item._onSuccess + 1,
                        });
                        ctx.onSuccessDeduped(k, res as D);
                    }
                });

                return res as D;
            })
    );

    const mutate = uFn((mutator: Mutator<D>): void =>
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            if (mutator instanceof Function) {
                ctx.store.updateDataProduce(k, mutator);
            } else {
                ctx.store.update<D, E>(k, { data: mutator });
            }
        })
    );

    uFn(() => {
        // eslint-disable-next-line solid/reactivity
        runWithKey(k => {
            const item = ctx.store.lookupOrDef<D, E>(k);
            if (!item) return;
            // set defaults here
            ctx.store.update(k, { isLoading: true });
        });
    })();

    createEffect(on(key, revalidate));

    createEffect(
        on(
            () => ctx.store.lookupOrDef(key())._onSuccess,
            count => {
                if (count === 0) return;
                // eslint-disable-next-line solid/reactivity
                runWithKey(k => {
                    ctx.onSuccess(k, ctx.store.lookupOrDef(k).data as D);
                });
            }
        )
    );
    createEffect(
        on(
            () => ctx.store.lookupOrDef(key())._onError,
            count => {
                if (count === 0) return;
                // eslint-disable-next-line solid/reactivity
                runWithKey(k => {
                    ctx.onError(k, ctx.store.lookupOrDef(k).err as E);
                });
            }
        )
    );

    return {
        mutate,
        revalidate,
        v: () => ctx.store.lookupOrDef(key()),
    };
}
