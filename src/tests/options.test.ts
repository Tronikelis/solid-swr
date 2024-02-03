import { renderHook } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { expect, it, vi } from "vitest";

import useSWR from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

// NOTE:
// I wanted to test the window revalidation event, the focus event and all that
// but couldn't get jsdom to properly send the events to my hook 🤔

const msWait = 50;

it("polls the fetcher based on an interval", async () => {
    const fetcher = vi.fn(async (x: string) => {
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
    const fetcher = vi.fn(async (x: string) => {
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
    const fetcher = vi.fn(async (x: string) => {
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

it.each(["onError", "onSuccess"] as const)("%s does not fire on duplicate sets", async arg => {
    const callback = vi.fn();

    const fetcher = async () => {
        await waitForMs();
        if (arg === "onError") {
            throw { foo: "bar" };
        }

        return { foo: "bar" };
    };

    const [key] = createKey();

    const { result } = renderHook(useSWR, [
        key,
        { fetcher, onError: callback, onSuccess: callback },
    ]);

    await waitForMs();

    for (let i = 0; i < 4; i++) {
        await result._effect();
    }

    expect(callback).toBeCalledTimes(1);
    expect(callback).toBeCalledWith({ foo: "bar" });
});

it.each(["onError", "onSuccess"] as const)(
    "%s does not track the signals inside",
    async arg => {
        const [get, set] = createSignal("foo");

        // eslint-disable-next-line solid/reactivity
        const getMocked = vi.fn(() => get());

        const [key] = createKey();

        const fetcher = async () => {
            await waitForMs();
            if (arg === "onError") {
                throw { foo: "bar" };
            }

            return { foo: "bar" };
        };

        renderHook(useSWR, [key, { fetcher, onError: getMocked, onSuccess: getMocked }]);

        await waitForMs();

        expect(getMocked).toBeCalledTimes(1);
        set("foobar");
        expect(getMocked).toBeCalledTimes(1);

        expect(getMocked).toBeCalledWith({ foo: "bar" });
    }
);
