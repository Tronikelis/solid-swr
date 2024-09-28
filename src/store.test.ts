/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { beforeEach, describe, expect, it } from "vitest";

import { Store, StoreCache } from "./store";
import { noop } from "./utils";

describe("store", () => {
    const key = "foobar";
    let store: Store;
    let cache: StoreCache;

    beforeEach(() => {
        cache = {
            lookup: noop,
            insert: noop,
        };
        store = new Store(cache);
    });

    it("inserts items into solid store", () => {
        store.update(key, {
            isLoading: true,
            _isBusy: true,
        });

        expect(store.lookupOrDef(key)).toEqual({
            ...Store.defaultItem,
            _exists: true,
            isLoading: true,
            _isBusy: true,
        });
    });

    it("cache can delete items at will", () => {
        const key2 = "foobar222";

        cache.insert = (_key, onTrim) => {
            // delete key
            if (_key === key2) onTrim(key);
        };

        store.update(key, {});
        store.update(key2, {});

        expect(store.lookupOrDef(key)._exists).toBe(false);
        expect(store.lookupOrDef(key2)._exists).toBe(true);
    });

    it("returns default item when key does not exist", () => {
        expect(store.lookupOrDef(key)).toEqual(Store.defaultItem);
    });

    it("keys() returns correct keys", () => {
        cache.insert = (_key, onTrim) => {
            if (_key === "3") onTrim("1");
        };

        store.update("1", {});
        store.update("2", {});
        store.update("3", {});

        expect(store.keys()).toEqual(["2", "3"]);
    });

    it("can update with produce", () => {
        store.update("1", { data: { foo: { bar: {} } } } as any);

        store.updateDataProduce("1", (prev: any) => {
            prev.foo.bar = { bar: 2 };
        });

        expect(store.lookupOrDef("1").data).toEqual(
            expect.objectContaining({
                foo: { bar: { bar: 2 } },
            })
        );
    });
});
