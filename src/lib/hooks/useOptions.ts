import { mergeProps, useContext } from "solid-js";

import LRU from "~/classes/lru";
import { OptionsContext } from "~/context/options";
import { CacheImplements, CacheItem, Fetcher, Options } from "~/types";
import noop from "~/utils/noop";

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
            refreshInterval: 0,
            onSuccess: noop,
            onError: noop,

            revalidateOnFocus: true,
            revalidateOnOnline: true,

            fallback: {},
        } satisfies Required<Options<Res, Err>>,
        context,
        options
    );

    return merged;
}
