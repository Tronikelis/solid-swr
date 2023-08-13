import { createContext } from "solid-js";
import { Options } from "..";

const defaultFetcher = async <T>(key: string): Promise<T> => {
    const response = await fetch(key);
    const json = await response.json();

    if (response.ok) {
        return json;
    }

    throw new Error(JSON.stringify(json));
};

export const SWRContext = createContext<Options>({ fetcher: defaultFetcher });
