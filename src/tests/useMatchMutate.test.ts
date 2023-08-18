import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR, { useMatchMutate } from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("simply mutates the correct hook without revalidation", () => {
    const mutatedValue = `${Math.random()}`;

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key1] = createKey();
    const [key2] = createKey();

    const { result: result1 } = renderHook(useSWR, [key1, { fetcher }]);
    const { result: result2 } = renderHook(useSWR, [key2, { fetcher }]);

    const mutate = useMatchMutate();

    mutate(key => key === key1(), mutatedValue, {
        // false is default anyways
        revalidate: false,
    });

    expect(result1.data()).toBe(mutatedValue);
    expect(result2.data()).not.toBe(mutatedValue);
    expect(fetcher).toBeCalledTimes(2);
});

it("it mutates the hooks and deduplicates revalidation and syncs responses", async () => {
    const mutatedValue = `${Math.random()}`;

    const fetcher = jest.fn(async (x: string) => {
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

    const mutate = useMatchMutate();

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
