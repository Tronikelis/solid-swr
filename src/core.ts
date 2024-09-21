import {
    Accessor,
    batch,
    createComponent,
    createContext,
    createEffect,
    getOwner,
    JSX,
    mergeProps,
    on,
    onCleanup,
    untrack,
    useContext,
} from "solid-js";

import { Store } from "./store";
import { noop, runIfTruthy, tryCatch } from "./utils";

export type FetcherOpts = {
    signal: AbortSignal;
};

export type SwrOpts<D = unknown, E = unknown> = {
    store: Store;

    fetcher: (key: string, { signal }: FetcherOpts) => Promise<unknown>;
    /** gets direct store references (don't mutate) */
    onSuccess: (key: string, res: D) => void;
    /** gets direct store references (don't mutate) */
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

const Context = createContext<SwrOpts>({
    store: new Store(),
    fetcher: () => Promise.reject(new Error("pass your own fetcher")),
    onSuccess: noop,
    onError: noop,
    onSuccessDeduped: noop,
    onErrorDeduped: noop,
});

export const useSwrContext = () => useContext(Context);

export const SwrProvider = (props: { value: Partial<SwrOpts>; children: JSX.Element }) => {
    // eslint-disable-next-line solid/reactivity
    const value = mergeProps(useSwrContext(), props.value);

    return createComponent(Context.Provider, {
        value,
        get children() {
            return props.children;
        },
    });
};

export function createRevalidator(opts?: SwrOpts) {
    const ctx = opts || useSwrContext();

    return <D, E>(key: string) =>
        // eslint-disable-next-line solid/reactivity
        untrack(async () => {
            const item = ctx.store.lookupOrDef<D, E>(key);
            if (item._isBusy) return;

            const controller = new AbortController();
            if (getOwner()) {
                onCleanup(() => {
                    ctx.store.update(key, { _isBusy: false });
                    controller.abort();
                });
            }

            ctx.store.update(key, {
                err: undefined,
                _isBusy: true,
                isLoading: true,
            });

            const [err, res] = await tryCatch<D, E>(
                // eslint-disable-next-line solid/reactivity
                () => ctx.fetcher(key, { signal: controller.signal }) as Promise<D>
            );

            if (
                controller.signal.aborted &&
                err instanceof DOMException &&
                err.name === "AbortError"
            ) {
                return;
            }

            batch(() => {
                ctx.store.update(key, { _isBusy: false, isLoading: false });

                const item = ctx.store.lookupOrDef(key);

                if (err) {
                    ctx.store.update(key, { err, _onError: item._onError + 1 });
                    ctx.onErrorDeduped(key, err);
                } else {
                    ctx.store.update(key, {
                        data: res,
                        _onSuccess: item._onSuccess + 1,
                    });
                    ctx.onSuccessDeduped(key, res as D);
                }
            });

            return res as D;
        });
}

export function createMutator(opts?: SwrOpts) {
    const ctx = opts || useSwrContext();

    return <D, E>(key: string, mutator: Mutator<D>) =>
        untrack(() => {
            if (mutator instanceof Function) {
                ctx.store.updateDataProduce(key, mutator);
            } else {
                ctx.store.update<D, E>(key, { data: mutator });
            }
        });
}

export function useSwr<D, E>(
    key: Accessor<string | undefined>,
    local?: Partial<SwrOpts<D, E>>
) {
    const ctx = mergeProps(useSwrContext(), local);

    const runWithKey = <T extends (k: string) => any>(fn: T): ReturnType<T> | undefined =>
        runIfTruthy(key, fn);

    const revalidator = createRevalidator(ctx as SwrOpts);
    const mutator = createMutator(ctx as SwrOpts);

    const revalidate = () => runWithKey(k => revalidator<D, E>(k));
    const mutate = (payload: Mutator<D>) => runWithKey(k => mutator<D, E>(k, payload));

    createEffect(on(key, k => k && revalidator(k)));

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
        v: () => ctx.store.lookupOrDef<D, E>(key()),
    };
}
