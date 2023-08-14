import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

// NOTE:
// I wanted to test the window revalidation event, the focus event and all that
// but couldn't get jsdom to properly send the events to my hook 🤔

const fetcherWait = 50;

it("polls the fetcher based on an interval", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });
    const refreshInterval = 1e3;

    const [key] = createKey();

    renderHook(useSWR, [key, () => ({ fetcher, refreshInterval })]);
    expect(fetcher).toBeCalledTimes(1);

    await waitForMs(refreshInterval);
    expect(fetcher).toBeCalledTimes(2);

    await waitForMs(refreshInterval);
    expect(fetcher).toBeCalledTimes(3);
});

it("isEnabled works", () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs(fetcherWait);
        return x;
    });

    const [key] = createKey();

    renderHook(useSWR, [key, () => ({ fetcher, isEnabled: false })]);
    expect(fetcher).toBeCalledTimes(0);
});

it("keepPreviousData works", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs(fetcherWait);
        return x;
    });

    {
        const [key, setKey] = createKey();
        const { result } = renderHook(useSWR, [
            key,
            () => ({ fetcher, keepPreviousData: false }),
        ]);

        await waitForMs(fetcherWait);
        expect(result.data()).not.toBe(undefined);

        setKey(`${Math.random()}`);
        expect(result.data()).toBe(undefined);
    }
    {
        const [key, setKey] = createKey();
        const { result } = renderHook(useSWR, [
            key,
            () => ({ fetcher, keepPreviousData: true }),
        ]);

        await waitForMs(fetcherWait);
        expect(result.data()).not.toBe(undefined);

        setKey(`${Math.random()}`);
        expect(result.data()).not.toBe(undefined);
    }

    expect(fetcher).toBeCalledTimes(4);
});
