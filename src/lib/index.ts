import { dequal as equals } from "dequal";
import { Accessor, createEffect, createSignal, mergeProps } from "solid-js";

import useInterval from "./hooks/useInterval";
import useOptions from "./hooks/useOptions";
import useWinEvent from "./hooks/useWinEvent";
import tryCatch from "./utils/tryCatch";
import { dispatchCustomEvent, publishDataEvent, publishErrorEvent } from "./events";

export { SWRConfig } from "./context/config";

export type CacheItem<T = unknown> = {
    data?: T;
    busy: boolean;
};

export type CacheImplements<K, V> = {
    set: (key: K, value: V) => void;
    get: (key: K) => V | undefined;
};

export type Key = string | undefined;
type ExistentKey = Exclude<Key, undefined>;

export type Fetcher<T> = (key: ExistentKey) => Promise<T>;

export type Options<Res = unknown> = {
    /**
     * The function responsible for throwing errors and returning data
     */
    fetcher?: Fetcher<Res>;

    /**
     * If cache is empty and the key changes, should we keep the old data
     * @default false
     */
    keepPreviousData?: boolean;

    /**
     * Toggle whether the hook should be enabled (you can do the same by passing in () => undefined as key),
     * useful for scenarios where you create key based on derived async data
     * @default true
     */
    isEnabled?: boolean;

    /**
     * In milliseconds, 0 is disabled
     * @default 0
     */
    refreshInterval?: number;

    /**
     * Provide your own cache implementation,
     * by default a simple in-memory LRU cache is used with 5K max items
     */
    cache?: CacheImplements<ExistentKey, CacheItem<Res>>;
};

export type MutationOptions = {
    /**
     * Should the hook refetch the data after the mutation?
     * If the payload is undefined it will **always** refetch
     * @default false
     */
    revalidate?: boolean;
};

type CustomEventPayload<T = unknown> = {
    key: ExistentKey;
    data: T;
};

export default function useSWR<Res = unknown, Error = unknown>(
    key: Accessor<Key>,
    /**
     * If you want this value to change at runtime, please pass a store (createStore)
     */
    _options: Options<Res> = {}
) {
    const options = useOptions(_options);

    function peekCache() {
        const k = key();
        if (k === undefined) return undefined;
        return options.cache.get(k) || undefined;
    }

    const [data, setData] = createSignal<Res | undefined>(peekCache()?.data, { equals });
    const [error, setError] = createSignal<Error | undefined>();
    const [isLoading, setIsLoading] = createSignal(true);

    useWinEvent(publishDataEvent, (ev: CustomEvent<CustomEventPayload<Res>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;

        setIsLoading(false);
        setError(undefined);
        setData(() => ev.detail.data);
    });
    useWinEvent(publishErrorEvent, (ev: CustomEvent<CustomEventPayload<Error>>) => {
        if (ev.detail.key !== key() || !options.isEnabled) return;

        setIsLoading(false);
        setError(() => ev.detail.data);
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

        const [err, response] = await tryCatch<Error, Res>(() => options.fetcher(k));

        // But note that subsequent use of reactive state (such as signals) will not trigger the effect to rerun,
        // as tracking is not possible after an async function uses await.
        // Thus you should use all dependencies before the promise.

        if (!err) {
            // not busy anymore
            options.cache.set(k, { busy: false, data: response });

            setData(() => response);
            dispatchCustomEvent(publishDataEvent, {
                data: response!,
                key: k,
            } satisfies CustomEventPayload<Res>);
        } else {
            // not busy anymore
            options.cache.set(k, { busy: false });

            setError(() => err);
            dispatchCustomEvent(publishErrorEvent, {
                data: err,
                key: k,
            } satisfies CustomEventPayload<Error>);
        }

        setIsLoading(false);
    }

    async function revalidate() {
        const k = key();
        if (k === undefined) return;

        const [err, response] = await tryCatch<Error, Res>(() => options.fetcher(k));

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
        const mutationOptions = mergeProps({ revalidate: false }, _mutationOptions);

        if (payload === undefined) {
            await revalidate();
            return;
        }

        const k = key();
        if (k === undefined) return;

        const fresh = payload instanceof Function ? payload(data()) : payload;

        setData(() => fresh);

        // eslint-disable-next-line solid/reactivity
        if (mutationOptions.revalidate === true) {
            await revalidate();
        }
    }

    // revalidate on offline/online
    useWinEvent("online" as keyof WindowEventMap, effect);

    // revalidate on window focus
    useWinEvent("focus" as keyof WindowEventMap, effect);

    // refresh interval
    createEffect(() => {
        if (options.refreshInterval <= 0) return;
        useInterval(effect, () => options.refreshInterval);
    });

    // core functionality
    createEffect(effect);

    return {
        data,
        error,
        isLoading,
        mutate,
    };
}
