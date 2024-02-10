import { klona } from "klona";
import { Accessor, createEffect, createSignal, untrack, useContext } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import { SWRFallback } from "./context/fallback";
import useExponential from "./hooks/internal/useExponential";
import useInterval from "./hooks/internal/useInterval";
import useMutationOptions from "./hooks/internal/useMutationOptions";
import useWinEvent from "./hooks/internal/useWinEvent";
import useMatchMutate from "./hooks/useMatchMutate";
import useOptions from "./hooks/useOptions";
import tryCatch from "./utils/tryCatch";
import uFn from "./utils/uFn";
import {
    dispatchCustomEvent,
    publishDataEvent,
    publishErrorEvent,
    triggerEffectEvent,
} from "./events";
import {
    CacheImplements,
    CacheItem,
    CustomEventPayload,
    Fetcher,
    Key,
    MutationOptions,
    Options,
    StoreIfy,
} from "./types";

export type { CacheImplements, CacheItem, Fetcher, Key, MutationOptions, Options };

// contexts
export { SWROptionsProvider } from "./context/options";
export { SWRFallback };

// hooks
export { useMatchMutate };

export { default as useOptions } from "./hooks/useOptions";
export { default as useSWRInfinite } from "./hooks/useSWRInfinite";
export { default as useSWRMutation } from "./hooks/useSWRMutation";

export default function useSWR<Res = unknown, Err = unknown>(
    key: Accessor<Key>,
    /**
     * If you want this value to change at runtime, please pass a store (createStore)
     */
    _options: Options<Res, Err> = {}
) {
    let globalController = new AbortController();

    const options = useOptions<Res, Err>(_options);
    const fallback = useContext(SWRFallback);

    const peekCache = (k: string | undefined): CacheItem<Res> | undefined => {
        if (k === undefined) return undefined;

        const fromCache = options.cache.get(k);
        if (fromCache) return fromCache;

        const fromFallback = fallback[k] as Res | undefined;
        if (fromFallback) return { busy: false, data: fromFallback };

        return undefined;
    };

    const [data, setDataRaw] = createStore<StoreIfy<Res | undefined>>({
        v: klona(peekCache(key())?.data),
    });

    const [error, setErrorRaw] = createStore<StoreIfy<Err | undefined>>({
        v: undefined,
    });

    const setData = (data: Res | undefined) => setDataRaw("v", reconcile(data));
    const setError = (error: Err | undefined) => setErrorRaw("v", reconcile(error));

    // eslint-disable-next-line solid/reactivity
    const [isLoading, setIsLoading] = createSignal(!data.v);
    // eslint-disable-next-line solid/reactivity
    const [hasFetched, setHasFetched] = createSignal(!!data.v);

    useWinEvent(publishDataEvent, (ev: CustomEvent<CustomEventPayload<Res>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;
        setIsLoading(false);

        if (options.isImmutable && data.v !== undefined) return;

        setError(undefined);
        setData(ev.detail.data);
    });
    useWinEvent(publishErrorEvent, (ev: CustomEvent<CustomEventPayload<Err>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;
        setIsLoading(false);

        if (options.isImmutable && error.v !== undefined) return;

        setError(ev.detail.data);
    });

    useWinEvent(triggerEffectEvent, async (ev: CustomEvent<CustomEventPayload<undefined>>) => {
        if (ev.detail.key !== key() || !options.isEnabled || options.isImmutable) return;
        await effect();
    });

    const effect = async () => {
        const k = key();

        if (!options.isEnabled || k === undefined) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        if (peekCache(k)?.busy) {
            return;
        }

        const cache = peekCache(k);
        if (cache !== undefined && cache.data) {
            // mark as busy
            options.cache.set(k, { busy: true, data: cache.data as Res });

            setData(cache.data as Res);
        } else {
            // mark as busy
            options.cache.set(k, { busy: true });

            if (!options.keepPreviousData) {
                setData(undefined);
            }
        }

        const controller = new AbortController();

        globalController.abort();
        globalController = controller;

        const [err, response] = await tryCatch<Err, Res>(() =>
            options.fetcher(k, { signal: controller.signal })
        );

        if (
            controller.signal.aborted &&
            err instanceof DOMException &&
            err.name === "AbortError"
        ) {
            // this request was aborted, so return early and release the cache without changing it
            options.cache.set(k, { busy: false, data: peekCache(k)?.data });
            return;
        }

        // But note that subsequent use of reactive state (such as signals) will not trigger the effect to rerun,
        // as tracking is not possible after an async function uses await.
        // Thus you should use all dependencies before the promise.

        if (!err) {
            // not busy anymore
            options.cache.set(k, { busy: false, data: response });

            setData(response);
            setError(undefined);
            dispatchCustomEvent<NonNullable<Res>>(publishDataEvent, {
                data: response!,
                key: k,
            });
        } else {
            // not busy anymore
            options.cache.set(k, { busy: false });

            setError(err);
            dispatchCustomEvent<NonNullable<Err>>(publishErrorEvent, {
                data: err,
                key: k,
            });
        }

        setIsLoading(false);
        setHasFetched(true);
    };

    const mutate = uFn(
        (
            payload?: Res | ((curr: Res | undefined) => Res),
            _mutationOptions: MutationOptions = {}
            // eslint-disable-next-line solid/reactivity
        ) => {
            const k = key();
            if (k === undefined) return;

            const mutationOptions = useMutationOptions(_mutationOptions);
            const matchMutate = useMatchMutate<Res>();

            // cloning here, because data.v returns a reference, so it's not safe to assume it won't be mutated
            // when passing into payload()
            const fresh = payload instanceof Function ? payload(klona(data.v)) : payload;

            matchMutate(key => key === k, fresh, mutationOptions);
        }
    );

    // automatic revalidation
    createEffect(() => {
        if (options.isImmutable) return;

        if (options.revalidateOnOnline) {
            // revalidate on offline/online
            useWinEvent("online" as keyof WindowEventMap, effect);
        }

        if (options.revalidateOnFocus) {
            // revalidate on window focus
            useWinEvent("focus" as keyof WindowEventMap, effect);
        }
    });

    // refresh interval
    createEffect(() => {
        if (options.refreshInterval <= 0) return;
        useInterval(effect, () => options.refreshInterval);
    });

    // core functionality
    createEffect(effect);

    createEffect(() => {
        const d = klona(data.v);
        if (d === undefined) return;

        setHasFetched(true);
        untrack(() => options.onSuccess(d));
    });
    createEffect(() => {
        const e = klona(error.v);
        if (e === undefined) return;

        setHasFetched(true);
        untrack(() => options.onError(e));
    });

    useExponential(() => !!error.v, effect, 5);

    return {
        data,
        error,

        isLoading,
        hasFetched,
        mutate,
    };
}
