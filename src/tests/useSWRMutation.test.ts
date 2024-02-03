import { renderHook } from "@solidjs/testing-library";
import { expect, it, vi } from "vitest";

import useSWR, { useSWRMutation } from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("behaves like expected when using it simply", async () => {
    const swrFetcher = vi.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const mutationFetcher = vi.fn(async (arg: string) => {
        await waitForMs();
        return arg;
    });

    const [key] = createKey();

    const { result } = renderHook(useSWR, [key, { fetcher: swrFetcher }]);

    const { result: mut } = renderHook(useSWRMutation, [
        k => k === key(),
        mutationFetcher as any,
    ]);

    await waitForMs();

    expect(mut.isTriggering()).toBe(false);
    expect(mut.error()).toBe(undefined);

    expect(result.data()).toBe(key());

    const mutationResult = await mut.trigger("foo");
    mut.populateCache(mutationResult);

    expect(result.data()).toBe(mutationResult);
    expect(mutationResult).toBe("foo");
});

it("propagates and sets the error signal", async () => {
    const mutationFetcher = vi.fn(async (arg: string) => {
        await waitForMs();
        throw arg;
    });

    const { result: mut } = renderHook(useSWRMutation, [() => false, mutationFetcher as any]);

    const shouldReject = vi.fn(async () => {
        await mut.trigger("foo");
    });

    await expect(shouldReject()).rejects.toBe("foo");

    expect(mut.isTriggering()).toBe(false);
    expect(mut.error()).toBe("foo");
});

it("revalidates when populateCache is called without args", async () => {
    const swrFetcher = vi.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const mutationFetcher = vi.fn(async (arg: string) => {
        await waitForMs();
        return arg;
    });

    const [key] = createKey();

    renderHook(useSWR, [key, { fetcher: swrFetcher }]);

    const { result: mut } = renderHook(useSWRMutation, [
        k => k === key(),
        mutationFetcher as any,
    ]);

    await waitForMs();
    expect(swrFetcher).toBeCalledTimes(1);

    mut.populateCache();
    expect(swrFetcher).toBeCalledTimes(2);
});
