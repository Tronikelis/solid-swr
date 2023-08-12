import { createContext } from "solid-js";
import { Options } from "..";

const defaultFetcher = async <T>(key: string): Promise<T> => {
    const response = await fetch(key);
    const json = await response.json();
    return json;
};

export const SWRContext = createContext<Options>({ fetcher: defaultFetcher });
