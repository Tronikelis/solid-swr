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
        } satisfies Required<Options<Res, Err>>,
        context,
        options
    );

    const untrackMerged = (): typeof merged => {
        const oldCache = merged.cache;

        const cache = {
            get: uFn(oldCache.get.bind(oldCache)),
            set: uFn(oldCache.set.bind(oldCache)),
            keys: uFn(oldCache.keys.bind(oldCache)),
        };

        return {
            ...merged,
            onSuccess: uFn(merged.onSuccess.bind(merged.onSuccess)),
            onError: uFn(merged.onError.bind(merged.onError)),
            cache,
        };
    };

    // eslint-disable-next-line solid/reactivity
    const [untrackedOptions, setUntrackedOptions] = createStore(untrackMerged());

    createEffect(() => {
        setUntrackedOptions(untrackMerged());
    });

    return untrackedOptions;
}
