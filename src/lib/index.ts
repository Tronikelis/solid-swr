import { dequal } from "dequal";
import {
    Accessor,
    batch,
    createEffect,
    createSignal,
    on,
    onCleanup,
    useContext,
} from "solid-js";
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
    setIsLoadingEvent,
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

    const peekCacheCloned: typeof peekCache = k => structuredClone(peekCache(k));

    const [data, setDataRaw] = createStore<StoreIfy<Res | undefined>>({
        v: peekCacheCloned(key())?.data,
    });

    const [error, setErrorRaw] = createStore<StoreIfy<Err | undefined>>({
        v: undefined,
    });

    const setData = (latest: Res | undefined) => {
        if (dequal(data.v, latest)) return;
        setDataRaw(reconcile({ v: latest }));
    };
    const setError = (latest: Err | undefined) => {
        if (dequal(error.v, latest)) return;
        setErrorRaw(reconcile({ v: latest }));
    };

    // eslint-disable-next-line solid/reactivity
    const [isLoading, setIsLoading] = createSignal(!data.v);
    // eslint-disable-next-line solid/reactivity
    const [hasFetched, setHasFetched] = createSignal(!!data.v);

    // eslint-disable-next-line solid/reactivity
    const effect = uFn(async () => {
        const k = key();

        if (!options.isEnabled || k === undefined) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        if (peekCache(k)?.busy) {
            return;
        }

        const markBusy = () => {
            options.cache.set(k, { busy: true, data: peekCache(k)?.data });
        };
        const markFree = () => {
            options.cache.set(k, { busy: false, data: peekCache(k)?.data });
        };

        const cache = peekCacheCloned(k);
        if (cache !== undefined && cache.data) {
            markBusy();

            setData(cache.data as Res);
        } else {
            options.cache.set(k, { busy: true });

            if (!options.keepPreviousData) {
                setData(undefined);
            }
        }

        const controller = new AbortController();

        onCleanup(() => {
            controller.abort();
            markFree();
        });

        const [err, response] = await tryCatch<Err, Res>(() =>
            options.fetcher(k, { signal: controller.signal })
        );

        if (
            controller.signal.aborted &&
            err instanceof DOMException &&
            err.name === "AbortError"
        ) {
            markFree();
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

        dispatchCustomEvent<boolean>(setIsLoadingEvent, {
            data: false,
            key: k,
        });
    });

    useWinEvent(publishDataEvent, (ev: CustomEvent<CustomEventPayload<Res>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;

        batch(() => {
            setData(ev.detail.data);
            setIsLoading(false);
            setError(undefined);
            setHasFetched(true);
        });

        options.onSuccess(ev.detail.data);
    });
    useWinEvent(publishErrorEvent, (ev: CustomEvent<CustomEventPayload<Err>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;

        batch(() => {
            setError(ev.detail.data);
            setIsLoading(false);
            setHasFetched(true);
        });

        options.onError(ev.detail.data);
    });

    useWinEvent(triggerEffectEvent, async (ev: CustomEvent<CustomEventPayload<undefined>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;
        await effect();
    });
    useWinEvent(setIsLoadingEvent, (ev: CustomEvent<CustomEventPayload<boolean>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;
        setIsLoading(ev.detail.data);
    });

    const mutate = uFn(
        (
            payload?: Res | ((curr: Res | undefined) => Res | undefined),
            _mutationOptions: MutationOptions = {}
            // eslint-disable-next-line solid/reactivity
        ) => {
            const k = key();
            if (k === undefined) return;

            const mutationOptions = useMutationOptions(_mutationOptions);
            const matchMutate = useMatchMutate<Res>();

            const fresh = payload instanceof Function ? payload(data.v) : payload;

            matchMutate(key => key === k, fresh, mutationOptions);
        }
    );

    const fetcher = uFn((abortController: AbortController = new AbortController()) => {
        const k = key();
        if (k === undefined) return;
        return options.fetcher(k, { signal: abortController.signal });
    });

    // automatic revalidation
    createEffect(() => {
        if (!options.isEnabled) return;

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
    createEffect(on([key, () => options.isEnabled], effect));

    useExponential(() => !!error.v, effect, 5);

    return {
        data,
        error,

        isLoading,
        hasFetched,

        mutate,
        /**
         * a detached fetcher -> call the finalized fetcher yourself, it gets the key passed into the hook
         */
        fetcher,
    };
}
