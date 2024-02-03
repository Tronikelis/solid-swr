import { expect, it } from "vitest";

import LRU from "~/classes/lru";

// thanks to:
// https://github.com/ThePrimeagen/kata-machine/blob/master/src/__tests__/LRU.ts
it("LRU", () => {
    const lru = new LRU<string, number>(3);

    expect(lru.get("foo")).toEqual(undefined);
    lru.set("foo", 69);
    expect(lru.get("foo")).toEqual(69);

    lru.set("bar", 420);
    expect(lru.get("bar")).toEqual(420);

    lru.set("baz", 1337);
    expect(lru.get("baz")).toEqual(1337);

    lru.set("ball", 69420);
    expect(lru.get("ball")).toEqual(69420);
    expect(lru.get("foo")).toEqual(undefined);
    expect(lru.get("bar")).toEqual(420);
    lru.set("foo", 69);
    expect(lru.get("bar")).toEqual(420);
    expect(lru.get("foo")).toEqual(69);

    // shouldn't of been deleted, but since bar was get'd, bar was added to the
    // front of the list, so baz became the end
    expect(lru.get("baz")).toEqual(undefined);
});
