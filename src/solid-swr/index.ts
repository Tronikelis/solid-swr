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

export type Options<Res = unknown> = {
    fetcher?: Fetcher<Res>;
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
        return (lru.get(key()) as CacheItem | undefined) || undefined;
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

    onMount(() => {
        function publishData(ev: CustomEvent<CustomEventPayload<Res>>) {
            if (ev.detail.key !== key()) return;

            setIsLoading(false);
            setError(undefined);
            setData(() => ev.detail.data);
        }

        function publishError(ev: CustomEvent<CustomEventPayload<Error>>) {
            if (ev.detail.key !== key()) return;

            setIsLoading(false);
            setError(() => ev.detail.data);
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
        setIsLoading(true);
        setError(undefined);

        if (peekCache()?.busy) {
            return;
        }
        lru.set(key(), { busy: true });

        const cache = peekCache();
        if (cache !== undefined && cache.data) {
            setData(() => cache.data as Res);
        }

        try {
            const response = await options.fetcher(key());

            setData(() => response);
            lru.set(key(), { busy: false, data: response });
            dispatchCustomEvent(publishDataEvent, {
                data: response,
                key: key(),
            } satisfies CustomEventPayload<Res>);
        } catch (err: any) {
            setError(err);
            dispatchCustomEvent(publishErrorEvent, {
                data: err,
                key: key(),
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
