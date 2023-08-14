/* eslint-disable @typescript-eslint/require-await */

import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

import waitForTruthy from "./utils/waitForTruthy";

it("at least boots up", async () => {
    const { result } = renderHook(useSWR, [
        () => "https://jsonplaceholder.typicode.com/todos/1",
    ]);

    expect(result.data()).toBe(undefined);
    expect(result.error()).toBe(undefined);
    expect(result.isLoading()).toBe(true);

    await waitForTruthy(result.data);

    expect(result.data()).not.toBe(undefined);
    expect(result.error()).toBe(undefined);
    expect(result.isLoading()).toBe(false);
});

it("passes thrown error into the error signal", async () => {
    const { result } = renderHook(useSWR, [
        () => "",
        () => ({
            fetcher: async () => {
                throw new Error("foo");
            },
        }),
    ]);

    await waitForTruthy(result.error);
    expect(result.error() instanceof Error).toBe(true);
});

it("returns stale result from cache instantly and refetches", async () => {
    const value = "foo";

    const fetcher = jest.fn(async (x: string) => {
        await new Promise(r => setTimeout(r, 100));
        return x;
    });

    const key = () => value;
    const settings = () => ({ fetcher });

    {
        // eslint-disable-next-line solid/reactivity
        const { result } = renderHook(useSWR, [key, settings]);

        await waitForTruthy(result.data);

        expect(result.data()).toBe(value);
        expect(fetcher).toBeCalledTimes(1);
    }

    // eslint-disable-next-line solid/reactivity
    const { result } = renderHook(useSWR, [key, settings]);

    expect(result.data()).toBe(value);
    expect(fetcher).toBeCalledTimes(2);
});

it("deduplicates requests and syncs responses", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await new Promise(r => setTimeout(r, 100));
        return x;
    });

    let promises = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of new Array(100).fill(false)) {
        promises.push(
            new Promise(r => {
                const { result } = renderHook(useSWR, [() => "_", () => ({ fetcher })]);
                void waitForTruthy(result.data).then(() => r(result.data()));
            })
        );
    }

    promises = await Promise.all(promises);

    expect(fetcher).toBeCalledTimes(1);
    expect(new Set(promises).size).toBe(1);
});
