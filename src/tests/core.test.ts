import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";
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
    const [key] = createKey();

    const { result } = renderHook(useSWR, [
        key,
        {
            // eslint-disable-next-line @typescript-eslint/require-await
            fetcher: async () => {
                throw new Error("foo");
            },
        },
    ]);

    await waitForTruthy(result.error);
    expect(result.error() instanceof Error).toBe(true);
});

it("returns stale result from cache instantly and refetches", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key] = createKey();
    const settings = { fetcher };

    {
        const { result } = renderHook(useSWR, [key, settings]);

        await waitForTruthy(result.data);

        expect(result.data()).toBe(key());
        expect(fetcher).toBeCalledTimes(1);
    }

    const { result } = renderHook(useSWR, [key, settings]);

    expect(result.data()).toBe(key());
    expect(fetcher).toBeCalledTimes(2);
});

it("deduplicates requests and syncs responses", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key] = createKey();

    // without cache filled
    {
        let promises = [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const _ of new Array(100).fill(false)) {
            promises.push(
                new Promise(r => {
                    const { result } = renderHook(useSWR, [key, { fetcher }]);
                    void waitForTruthy(result.data).then(() => r(result.data()));
                })
            );
        }

        promises = await Promise.all(promises);
        expect(new Set(promises).size).toBe(1);
    }

    // with cache filled
    {
        let promises = [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const _ of new Array(100).fill(false)) {
            promises.push(
                new Promise(r => {
                    const { result } = renderHook(useSWR, [key, { fetcher }]);
                    void waitForTruthy(result.data).then(() => r(result.data()));
                })
            );
        }

        promises = await Promise.all(promises);
        expect(new Set(promises).size).toBe(1);
    }

    expect(fetcher).toBeCalledTimes(2);
});
