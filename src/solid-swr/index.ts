import { createEffect, createSignal, mergeProps, useContext } from "solid-js";
import LRU from "./classes/lru";
import { SWRContext } from "./context";
import {
    dispatchCustomEvent,
    publishDataEvent,
    publishErrorEvent,
} from "./events";
import useWinEvent from "./hooks/useWinEvent";
import tryCatch from "./utils/tryCatch";

export type Key = string | undefined;
export type Fetcher<T> = (key: Exclude<Key, undefined>) => Promise<T>;

export type Options<Res = unknown> = {
    fetcher?: Fetcher<Res>;
    keepPreviousData?: boolean;

    /**
     * Toggle whether the hook should be enabled,
     * useful for scenarios where you create key based on derived async data
     */
    isEnabled?: boolean;
};

type CacheItem<T = unknown> = {
    data?: T;
    busy: boolean;
};

type CustomEventPayload<T = unknown> = {
    key: string;
    data: T;
};

const lru = new LRU<string, CacheItem>(10e3);

export default function useSWR<Res = unknown, Error = unknown>(
    key: () => Key,
    _options: () => Options<Res> = () => ({})
) {
    function peekCache() {
        const k = key();
        if (k === undefined) return undefined;
        return (lru.get(k) as CacheItem | undefined) || undefined;
    }

    const contextOptions = useContext(SWRContext);
    const options = mergeProps(contextOptions, _options()) as Required<
        Options<Res>
    >;

    const [data, setData] = createSignal<Res | undefined>(
        peekCache()?.data as Res | undefined
    );
    const [error, setError] = createSignal<Error | undefined>();
    const [isLoading, setIsLoading] = createSignal(true);

    useWinEvent(
        publishDataEvent,
        (ev: CustomEvent<CustomEventPayload<Res>>) => {
            if (ev.detail.key !== key() || !options.isEnabled) return;

            setIsLoading(false);
            setError(undefined);
            setData(() => ev.detail.data);
        }
    );
    useWinEvent(
        publishErrorEvent,
        (ev: CustomEvent<CustomEventPayload<Error>>) => {
            if (ev.detail.key !== key() || !options.isEnabled) return;

            setIsLoading(false);
            setError(() => ev.detail.data);
        }
    );

    createEffect(async () => {
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
            lru.set(k, { busy: true });
            if (!options.keepPreviousData) {
                setData(undefined);
            }
        }

        const [err, response] = await tryCatch<Error, Res>(() =>
            options.fetcher(k)
        );

        if (!err) {
            setData(() => response);
            lru.set(k, { busy: false, data: response });
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
    });

    return {
        data,
        error,
        isLoading,
    };
}
