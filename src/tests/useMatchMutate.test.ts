import { renderHook } from "@solidjs/testing-library";
import { expect, it, vi } from "vitest";

import useSWR, { useMatchMutate } from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("simply mutates the correct hook without revalidation", () => {
    const mutatedValue = `${Math.random()}`;

    const fetcher = vi.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key1] = createKey();
    const [key2] = createKey();

    const { result: result1 } = renderHook(useSWR, [key1, { fetcher }]);
    const { result: result2 } = renderHook(useSWR, [key2, { fetcher }]);

    const { result: mutate } = renderHook(useMatchMutate);

    mutate(key => key === key1(), mutatedValue, {
        // false is default anyways
        revalidate: false,
    });

    expect(result1.data()).toBe(mutatedValue);
    expect(result2.data()).not.toBe(mutatedValue);
    expect(fetcher).toBeCalledTimes(2);
});

it("mutates the hooks and deduplicates revalidation and syncs responses", async () => {
    const mutatedValue = `${Math.random()}`;

    const fetcher = vi.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key] = createKey();

    const { result: result1 } = renderHook(useSWR, [key, { fetcher }]);
    const { result: result2 } = renderHook(useSWR, [key, { fetcher }]);

    await waitForMs();
    expect(fetcher).toBeCalledTimes(1);

    expect(result1.data()).toBe(key());
    expect(result2.data()).toBe(key());

    const { result: mutate } = renderHook(useMatchMutate);

    mutate(x => x === key(), mutatedValue, {
        revalidate: true,
    });

    expect(result1.data()).toBe(mutatedValue);
    expect(result2.data()).toBe(mutatedValue);

    await waitForMs();
    expect(fetcher).toBeCalledTimes(2);

    expect(result1.data()).toBe(key());
    expect(result2.data()).toBe(key());
});

it("revalidates when payload is undefined", async () => {
    let switchReturn = false;

    const fetcher = vi.fn(async (x: string) => {
        await waitForMs();
        return switchReturn ? x.repeat(2) : x;
    });

    const [key] = createKey();

    const { result: result1 } = renderHook(useSWR, [key, { fetcher }]);
    const { result: result2 } = renderHook(useSWR, [key, { fetcher }]);

    await waitForMs();
    expect(fetcher).toBeCalledTimes(1);
    expect(result1.data()).toBe(key());
    expect(result2.data()).toBe(key());

    switchReturn = true;

    const { result: mutate } = renderHook(useMatchMutate);
    mutate(x => x === key(), undefined);

    await waitForMs();
    expect(fetcher).toBeCalledTimes(2);
    expect(result1.data()).toBe(key().repeat(2));
    expect(result2.data()).toBe(key().repeat(2));
});

it("revalidates hooks with different keys", async () => {
    const [key1] = createKey();
    const key2 = () => key1() + "foo";

    const fetcher = vi.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const { result: result1 } = renderHook(useSWR, [key1, { fetcher }]);
    const { result: result2 } = renderHook(useSWR, [key2, { fetcher }]);

    await waitForMs();
    expect(fetcher).toBeCalledTimes(2);

    const { result: mutate } = renderHook(useMatchMutate);
    mutate(k => k.startsWith(key1()), undefined);

    expect(result1.isLoading()).toBe(true);
    expect(result2.isLoading()).toBe(true);

    expect(fetcher).toBeCalledTimes(4);
});
