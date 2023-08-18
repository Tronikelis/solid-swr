import { mergeProps, useContext } from "solid-js";

import LRU from "~/classes/lru";
import { SWRConfig } from "~/context/config";
import { CacheItem, Options } from "~/types";

async function defaultFetcher<T>(key: string): Promise<T> {
    const response = await fetch(key);
    const json = (await response.json()) as T;

    if (response.ok) {
        return json;
    }

    throw new Error(JSON.stringify(json));
}

const cache = new LRU<string, CacheItem>(5e3);

export default function useOptions<T>(options: Options<T>): Required<Options<T>> {
    const context = useContext(SWRConfig);

    const merged = mergeProps(
        {
            fetcher: defaultFetcher,
            keepPreviousData: false,
            isEnabled: true,
            refreshInterval: 0,
            cache,
        },
        context,
        options
    );

    return merged as Required<Options<T>>;
}
