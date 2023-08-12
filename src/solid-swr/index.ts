import {
    createEffect,
    createSignal,
    mergeProps,
    onCleanup,
    onMount,
    useContext,
} from "solid-js";
import LRU from "./classes/lru";
import { SWRContext } from "./context";
import { dispatchCustomEvent, publishDataEvent } from "./events";

export type Key = string;

export type Fetcher<T> = (key: string) => Promise<T>;

export type Options<Res = any> = {
    fetcher?: Fetcher<Res>;
};

type CacheItem<T = any> = {
    data: T | undefined;
    busy: boolean;
};

let lru: LRU<string, CacheItem>;

export default function useSWR<Res = any, Error = any>(
    key: () => Key,
    _options: () => Options<Res> = () => ({})
) {
    if (!lru) {
        lru = new LRU<string, CacheItem>(10e3);
    }

    function peekCache() {
        return (lru.get(key()) as CacheItem | undefined) || undefined;
    }

    const contextOptions = useContext(SWRContext);
    const options = mergeProps(contextOptions, _options()) as Required<
        Options<Res>
    >;

    const [data, setData] = createSignal<Res | undefined>(peekCache()?.data);
    const [error, setError] = createSignal<Error | undefined>();

    const [isLoading, setIsLoading] = createSignal(true);

    onMount(() => {
        function cb(ev: CustomEvent<Res>) {
            setIsLoading(false);
            setData(() => ev.detail);
        }

        window.addEventListener(publishDataEvent, cb as EventListener);

        onCleanup(() => {
            console.log("CLEANUP RAN");
            window.removeEventListener(publishDataEvent, cb as EventListener);
        });
    });

    createEffect(async () => {
        setData(undefined);
        setError(undefined);
        setIsLoading(true);

        if (peekCache()?.busy) {
            return;
        }
        lru.set(key(), { busy: true, data: undefined });

        const cache = peekCache();
        if (cache !== undefined) {
            setData(() => cache.data);
        }

        try {
            const response = await options.fetcher(key());

            setData(() => response);
            lru.set(key(), { busy: false, data: response });
            dispatchCustomEvent(publishDataEvent, response);
        } catch (err: any) {
            setError(err);
        }

        setIsLoading(false);
    });

    return {
        data,
        error,
        isLoading,
    };
}
