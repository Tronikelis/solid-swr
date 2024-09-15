import type LRU from "./lru";
import { StoreHooks } from "./store";

export const createHooks = (lru: LRU<string, boolean>): StoreHooks => ({
    onLookup: (key, item) => {
        const exists = lru.get(key);
        if (exists) return item;
    },
    onInsert: (key, item) => {
        lru.set(key, true);
        return item;
    },
    onUpdate: (key, wit) => {
        lru.set(key, true);
        return wit;
    },
});
