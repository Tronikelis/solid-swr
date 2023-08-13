import { Accessor, createEffect, createSignal } from "solid-js";

import useInterval from "./hooks/useInterval";
import useOptions from "./hooks/useOptions";
import useWinEvent from "./hooks/useWinEvent";
import tryCatch from "./utils/tryCatch";
import { dispatchCustomEvent, publishDataEvent, publishErrorEvent } from "./events";

export { SWRContext } from "./context";

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
    fetcher?: Fetcher<Res>;

    /**
     * @default false
     */
    keepPreviousData?: boolean;

    /**
     * Toggle whether the hook should be enabled,
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

type CustomEventPayload<T = unknown> = {
    key: string;
    data: T;
};

export default function useSWR<Res = unknown, Error = unknown>(
    key: Accessor<Key>,
    _options: Accessor<Options<Res>> = () => ({})
) {
    const options = useOptions(_options);

    function peekCache() {
        const k = key();
        if (k === undefined) return undefined;
        return (options.cache.get(k) as CacheItem | undefined) || undefined;
    }

    const [data, setData] = createSignal<Res | undefined>(
        peekCache()?.data as Res | undefined
    );
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
            setData(() => cache.data as Res);
        } else {
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
            setData(() => response);
            options.cache.set(k, { busy: false, data: response });
            dispatchCustomEvent(publishDataEvent, {
                data: response!,
                key: k,
            } satisfies CustomEventPayload<Res>);
        } else {
            setError(err as any);
            dispatchCustomEvent(publishErrorEvent, {
                data: err,
                key: k,
            } satisfies CustomEventPayload<Error>);
        }

        setIsLoading(false);
    }

    // first iteration
    async function mutate(payload: Res | ((curr: Res | undefined) => Res) | undefined) {
        if (payload === undefined) {
            await effect();
            return;
        }

        const k = key();
        if (k === undefined) return;

        const fresh = payload instanceof Function ? payload(data()) : payload;

        dispatchCustomEvent(publishDataEvent, {
            data: fresh,
            key: k,
        } satisfies CustomEventPayload<Res>);

        setData(() => fresh);
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
