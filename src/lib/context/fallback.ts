import { createContext } from "solid-js";

type Fallback = Record<string, any>;

export const SWRFallback = createContext<Fallback>({});
