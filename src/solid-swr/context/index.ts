import { createContext } from "solid-js";
import { Options } from "..";
import LRU from "../classes/lru";

const defaultFetcher = async <T>(key: string): Promise<T> => {
    const response = await fetch(key);
    const json = await response.json();

    if (response.ok) {
        return json;
    }

    throw new Error(JSON.stringify(json));
};

type CacheItem<T = unknown> = {
    data?: T;
    busy: boolean;
};

export const SWRContext = createContext<Options>({
    fetcher: defaultFetcher,
    keepPreviousData: false,
    isEnabled: true,
    refreshInterval: 0,
    cache: new LRU<string, CacheItem>(5e3),
});
