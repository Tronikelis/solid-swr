import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";
import { createStore } from "solid-js/store";

import useSWR from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

// NOTE:
// I wanted to test the window revalidation event, the focus event and all that
// but couldn't get jsdom to properly send the events to my hook 🤔

const msWait = 50;

it("polls the fetcher based on an interval", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });
    const refreshInterval = 1e3;

    const [key] = createKey();

    renderHook(useSWR, [key, { fetcher, refreshInterval }]);
    expect(fetcher).toBeCalledTimes(1);

    await waitForMs(refreshInterval);
    expect(fetcher).toBeCalledTimes(2);

    await waitForMs(refreshInterval);
    expect(fetcher).toBeCalledTimes(3);
});

it("isEnabled works", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs(msWait);
        return x;
    });

    const [key, setKey] = createKey();
    const [options, setOptions] = createStore({
        fetcher,
        isEnabled: true,
    });

    renderHook(useSWR, [key, { fetcher, isEnabled: false }]);
    expect(fetcher).toBeCalledTimes(0);

    renderHook(useSWR, [key, options]);

    await waitForMs(msWait);
    expect(fetcher).toBeCalledTimes(1);

    setOptions({ isEnabled: false });
    setKey(`${Math.random()}`);

    await waitForMs(msWait);
    expect(fetcher).toBeCalledTimes(1);
});

it("keepPreviousData works", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs(msWait);
        return x;
    });

    {
        const [key, setKey] = createKey();
        const { result } = renderHook(useSWR, [key, { fetcher, keepPreviousData: false }]);

        await waitForMs(msWait);
        expect(result.data()).not.toBe(undefined);

        setKey(`${Math.random()}`);
        expect(result.data()).toBe(undefined);
    }
    {
        const [key, setKey] = createKey();
        const { result } = renderHook(useSWR, [key, { fetcher, keepPreviousData: true }]);

        await waitForMs(msWait);
        expect(result.data()).not.toBe(undefined);

        setKey(`${Math.random()}`);
        expect(result.data()).not.toBe(undefined);
    }

    expect(fetcher).toBeCalledTimes(4);
});
