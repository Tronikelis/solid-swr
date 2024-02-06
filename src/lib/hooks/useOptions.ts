import { createEffect, mergeProps, useContext } from "solid-js";
import { createStore } from "solid-js/store";

import LRU from "~/classes/lru";
import { OptionsContext } from "~/context/options";
import { CacheImplements, CacheItem, Fetcher, Options } from "~/types";
import noop from "~/utils/noop";
import uFn from "~/utils/uFn";

const defaultFetcher: Fetcher<unknown> = async (key, { signal }) => {
    const response = await fetch(key, { signal });
    const json = (await response.json()) as unknown;

    if (!response.ok) {
        throw json;
    }

    return json;
};

const cache = new LRU<string, CacheItem<unknown>>(5e3);

export default function useOptions<Res, Err>(
    options?: Options<Res, Err>
): Required<Options<Res, Err>> {
    const context = useContext(OptionsContext) as Options<Res, Err>;

    const merged: Required<Options<Res, Err>> = mergeProps(
        {
            fetcher: defaultFetcher as Fetcher<Res>,
            cache: cache as CacheImplements<Res>,

            keepPreviousData: false,
            isEnabled: true,
            isImmutable: false,
            refreshInterval: 0,
            onSuccess: noop,
            onError: noop,

            revalidateOnFocus: true,
            revalidateOnOnline: true,
        } satisfies Required<Options<Res, Err>>,
        context,
        options
    );

    type Untracked = Pick<typeof merged, "cache" | "fetcher" | "onSuccess" | "onError">;

    const untrackedCache = () => {
        const oldCache = merged.cache;

        return {
            cache: {
                get: uFn(oldCache.get.bind(oldCache)),
                set: uFn(oldCache.set.bind(oldCache)),
                keys: uFn(oldCache.keys.bind(oldCache)),
            },
        };
    };

    const untrackedOnSuccess = () => ({
        onSuccess: uFn(merged.onSuccess.bind(merged.onSuccess)),
    });
    const untrackedOnError = () => ({
        onError: uFn(merged.onError.bind(merged.onError)),
    });
    const untrackedFetcher = () => ({
        fetcher: uFn(merged.fetcher.bind(merged.fetcher)),
    });

    const [untracked, setUntracked] = createStore<Untracked>({
        // eslint-disable-next-line solid/reactivity
        ...untrackedCache(),
        // eslint-disable-next-line solid/reactivity
        ...untrackedOnSuccess(),
        // eslint-disable-next-line solid/reactivity
        ...untrackedOnError(),
        // eslint-disable-next-line solid/reactivity
        ...untrackedFetcher(),
    });

    [untrackedCache, untrackedOnSuccess, untrackedOnError, untrackedFetcher].forEach(
        accessor => {
            createEffect(() => {
                setUntracked(accessor());
            });
        }
    );

    const mergedUntracked = mergeProps(merged, untracked);

    return mergedUntracked;
}
