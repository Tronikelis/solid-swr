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
import {
    dispatchCustomEvent,
    publishDataEvent,
    publishErrorEvent,
} from "./events";

export type Key = string;

export type Fetcher<T> = (key: string) => Promise<T>;

export type Options<Res = any> = {
    fetcher?: Fetcher<Res>;
};

type CacheItem<T = any> = {
    data?: T;
    busy: boolean;
};

const lru = new LRU<string, CacheItem>(10e3);

export default function useSWR<Res = any, Error = any>(
    key: () => Key,
    _options: () => Options<Res> = () => ({})
) {
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

    function resetStates() {
        setData(undefined);
        setError(undefined);
        setIsLoading(false);
    }

    onMount(() => {
        function publishData(ev: CustomEvent<Res>) {
            resetStates();
            setData(() => ev.detail);
        }

        function publishError(ev: CustomEvent<Error>) {
            resetStates();
            setError(() => ev.detail);
        }

        window.addEventListener(publishDataEvent, publishData as EventListener);
        window.addEventListener(
            publishErrorEvent,
            publishError as EventListener
        );

        onCleanup(() => {
            window.removeEventListener(
                publishDataEvent,
                publishData as EventListener
            );
            window.removeEventListener(
                publishErrorEvent,
                publishError as EventListener
            );
        });
    });

    createEffect(async () => {
        resetStates();
        setIsLoading(true);

        if (peekCache()?.busy) {
            return;
        }
        lru.set(key(), { busy: true });

        const cache = peekCache();
        if (cache !== undefined && cache.data) {
            setData(() => cache.data);
        }

        try {
            const response = await options.fetcher(key());

            setData(() => response);
            lru.set(key(), { busy: false, data: response });
            dispatchCustomEvent(publishDataEvent, response);
        } catch (err: any) {
            setError(err);
            dispatchCustomEvent(publishErrorEvent, err);
        }

        setIsLoading(false);
    });

    return {
        data,
        error,
        isLoading,
    };
}
