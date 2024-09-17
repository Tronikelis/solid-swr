import { LRU } from "./lru";
import { StoreCache } from "./store";

export { LRU };

export const createCache = (lru: LRU<string, boolean>): StoreCache => ({
    lookup: key => !!lru.get(key),
    insert: (key, onTrim) => lru.set(key, true, onTrim),
});
