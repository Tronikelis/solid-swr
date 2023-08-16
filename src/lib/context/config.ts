import { createContext } from "solid-js";

import LRU from "../classes/lru";
import { Options } from "..";

const defaultFetcher = async <T>(key: string): Promise<T> => {
    const response = await fetch(key);
    const json = (await response.json()) as T;

    if (response.ok) {
        return json;
    }

    throw new Error(JSON.stringify(json));
};

type CacheItem<T = unknown> = {
    data?: T;
    busy: boolean;
};

export const SWRConfig = createContext<Options>({
    fetcher: defaultFetcher,
    keepPreviousData: false,
    isEnabled: true,
    refreshInterval: 0,
    cache: new LRU<string, CacheItem>(5e3),
});
