import { describe, expect, it, jest } from "@jest/globals";
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

it("throws the default fetch response when error", async () => {
    const { result } = renderHook(useSWR, [
        () => "https://jsonplaceholder.typicode.com/todos/999999999999999999",
    ]);

    await waitForTruthy(result.error);

    expect(result.error()).toEqual({});
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

it("retries exponentially", async () => {
    const fetcher = jest.fn(async (key: string) => {
        await waitForMs();
        throw new Error(key);
    });

    const [key] = createKey();

    const { result } = renderHook(useSWR, [key, { fetcher }]);

    await waitForMs();
    expect(result.error()).toBeTruthy();
    expect(fetcher).toBeCalledTimes(1);

    await waitForMs(2e3);
    expect(result.error()).toBeTruthy();
    expect(fetcher).toBeCalledTimes(2);
});

describe("return", () => {
    describe("hasFetched", () => {
        it("simple example", async () => {
            const fetcher = jest.fn(async (key: string) => {
                await waitForMs();
                return key;
            });

            const { result } = renderHook(useSWR, [createKey()[0], { fetcher }]);
            expect(result.hasFetched()).toBe(false);

            await waitForMs();
            expect(result.hasFetched()).toBe(true);
        });

        it("single level dependency", async () => {
            const fetcher = jest.fn(async (key: string) => {
                await waitForMs();
                return key;
            });

            const { result: rA } = renderHook(useSWR, [createKey()[0], { fetcher }]);
            const { result: rB } = renderHook(() =>
                useSWR(() => (rA.data() ? rA.data() + "foo" : undefined), {
                    fetcher,
                })
            );

            expect(rA.hasFetched()).toBe(false);
            expect(rB.hasFetched()).toBe(false);

            await waitForMs();
            expect(rA.hasFetched()).toBe(true);
            expect(rB.hasFetched()).toBe(false);

            await waitForMs();
            expect(rA.hasFetched()).toBe(true);
            expect(rB.hasFetched()).toBe(true);
        });

        it("double level dependency", async () => {
            const fetcher = jest.fn(async (key: string) => {
                await waitForMs();
                return key;
            });

            const { result: rA } = renderHook(useSWR, [createKey()[0], { fetcher }]);
            const { result: rB } = renderHook(() =>
                useSWR(() => (rA.data() ? rA.data() + "foo" : undefined), {
                    fetcher,
                })
            );
            const { result: rC } = renderHook(() =>
                useSWR(() => (rB.data() ? rB.data() + "bar" : undefined), {
                    fetcher,
                })
            );

            expect(rA.hasFetched()).toBe(false);
            expect(rB.hasFetched()).toBe(false);
            expect(rC.hasFetched()).toBe(false);

            await waitForMs();
            expect(rA.hasFetched()).toBe(true);
            expect(rB.hasFetched()).toBe(false);
            expect(rC.hasFetched()).toBe(false);

            await waitForMs();
            expect(rA.hasFetched()).toBe(true);
            expect(rB.hasFetched()).toBe(true);
            expect(rC.hasFetched()).toBe(false);

            await waitForMs();
            expect(rA.hasFetched()).toBe(true);
            expect(rB.hasFetched()).toBe(true);
            expect(rC.hasFetched()).toBe(true);
        });

        it("sets true when synced from other hook instant", async () => {
            const fetcher = jest.fn(async (key: string) => {
                await waitForMs();
                return key;
            });

            const [key] = createKey();

            renderHook(useSWR, [key, { fetcher }]);
            await waitForMs();

            const { result } = renderHook(useSWR, [key, { fetcher }]);
            expect(result.hasFetched()).toBe(true);
        });

        it("sets true when synced from other hook with event", async () => {
            const fetcherFast = jest.fn(async (key: string) => {
                await waitForMs(100);
                return key;
            });
            const fetcherSlow = jest.fn(async (key: string) => {
                await waitForMs(200);
                return key;
            });

            const [key] = createKey();

            renderHook(useSWR, [key, { fetcher: fetcherFast }]);
            const { result } = renderHook(useSWR, [key, { fetcher: fetcherSlow }]);
            await waitForMs(100);

            expect(result.hasFetched()).toBe(true);
        });

        it("sets true on error", async () => {
            const fetcher = jest.fn(async () => {
                await waitForMs();
                throw new Error();
            });

            const { result } = renderHook(useSWR, [createKey()[0], { fetcher }]);
            await waitForMs();

            expect(result.hasFetched()).toBe(true);
        });
    });
});
