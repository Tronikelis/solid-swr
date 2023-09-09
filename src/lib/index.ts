import { dequal as equals } from "dequal";
import { Accessor, createEffect, createSignal, useContext } from "solid-js";

import { SWRFallback } from "./context/fallback";
import useInterval from "./hooks/internal/useInterval";
import useMutationOptions from "./hooks/internal/useMutationOptions";
import useOptions from "./hooks/internal/useOptions";
import useWinEvent from "./hooks/internal/useWinEvent";
import tryCatch from "./utils/tryCatch";
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
} from "./types";

export type { CacheImplements, CacheItem, Fetcher, Key, MutationOptions, Options };

// contexts
export { SWRConfig } from "./context/config";
export { SWRFallback };

// hooks
export { default as useMatchMutate } from "./hooks/useMatchMutate";
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

    function peekCache(): CacheItem<Res> | undefined {
        const k = key();
        if (k === undefined) return undefined;

        const fromCache = options.cache.get(k);
        if (fromCache) return fromCache;

        const fromFallback = fallback[k] as Res | undefined;
        if (fromFallback) return { busy: false, data: fromFallback };

        return undefined;
    }

    const [data, setData] = createSignal<Res | undefined>(peekCache()?.data, { equals });
    const [error, setError] = createSignal<Err | undefined>();
    // eslint-disable-next-line solid/reactivity
    const [isLoading, setIsLoading] = createSignal(!data());

    useWinEvent(publishDataEvent, (ev: CustomEvent<CustomEventPayload<Res>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;

        setIsLoading(false);
        setError(undefined);
        setData(() => ev.detail.data);
    });
    useWinEvent(publishErrorEvent, (ev: CustomEvent<CustomEventPayload<Err>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;

        setIsLoading(false);
        setError(() => ev.detail.data);
    });

    useWinEvent(triggerEffectEvent, async (ev: CustomEvent<CustomEventPayload<undefined>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;
        await effect();
    });

    async function effect() {
        const k = key();

        if (!options.isEnabled || k === undefined) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(undefined);

        if (peekCache()?.busy) {
            return;
        }

        const cache = peekCache();
        if (cache !== undefined && cache.data) {
            // mark as busy
            options.cache.set(k, { busy: true, data: cache.data as Res });

            setData(() => cache.data as Res);
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

        // it's fine to early return here without releasing the cache,
        // cause the other request is currently at this point and will release the cache
        if (
            controller.signal.aborted &&
            err instanceof DOMException &&
            err.name === "AbortError"
        ) {
            return;
        }

        // But note that subsequent use of reactive state (such as signals) will not trigger the effect to rerun,
        // as tracking is not possible after an async function uses await.
        // Thus you should use all dependencies before the promise.

        if (!err) {
            // not busy anymore
            options.cache.set(k, { busy: false, data: response });

            setData(() => response);
            dispatchCustomEvent<NonNullable<Res>>(publishDataEvent, {
                data: response!,
                key: k,
            });
        } else {
            // not busy anymore
            options.cache.set(k, { busy: false });

            setError(() => err);
            dispatchCustomEvent<NonNullable<Err>>(publishErrorEvent, {
                data: err,
                key: k,
            });
        }

        setIsLoading(false);
    }

    async function revalidateLocal() {
        const k = key();
        if (k === undefined) return;

        setIsLoading(true);
        const [err, response] = await tryCatch<Err, Res>(() => options.fetcher(k, {}));
        setIsLoading(false);

        if (!err) {
            setData(() => response);
            return;
        }

        setError(() => err);
    }

    /**
     * If revalidation is enabled or payload is `undefined` this function resolves
     * when revalidation has finished.
     *
     * This function is bound to the hook, not to the key!
     */
    async function mutate(
        payload: Res | ((curr: Res | undefined) => Res) | undefined,
        _mutationOptions: MutationOptions = {}
    ) {
        const mutationOptions = useMutationOptions(_mutationOptions);

        if (payload === undefined) {
            await revalidateLocal();
            return;
        }

        const k = key();
        if (k === undefined) return;

        const fresh = payload instanceof Function ? payload(data()) : payload;

        setData(() => fresh);

        // eslint-disable-next-line solid/reactivity
        if (mutationOptions.revalidate === true) {
            await revalidateLocal();
        }
    }

    createEffect(() => {
        if (!options.autoRevalidate) return;

        // revalidate on offline/online
        useWinEvent("online" as keyof WindowEventMap, effect);

        // revalidate on window focus
        useWinEvent("focus" as keyof WindowEventMap, effect);
    });

    // refresh interval
    createEffect(() => {
        if (options.refreshInterval <= 0) return;
        useInterval(effect, () => options.refreshInterval);
    });

    // core functionality
    createEffect(effect);

    createEffect(() => {
        const d = data();
        if (d === undefined) return;
        options.onSuccess(d);
    });
    createEffect(() => {
        const e = error();
        if (e === undefined) return;
        options.onError(e);
    });

    return {
        data,
        error,
        isLoading,
        mutate,
    };
}
