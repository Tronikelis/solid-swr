import { renderHook } from "@solidjs/testing-library";
import { createSignal, createUniqueId } from "solid-js";
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
        expect(result.data.v).not.toBe(undefined);

        setKey(`${Math.random()}`);
        expect(result.data.v).toBe(undefined);
    }
    {
        const [key, setKey] = createKey();
        const { result } = renderHook(useSWR, [key, { fetcher, keepPreviousData: true }]);

        await waitForMs(msWait);
        expect(result.data.v).not.toBe(undefined);

        setKey(`${Math.random()}`);
        expect(result.data.v).not.toBe(undefined);
    }

    expect(fetcher).toBeCalledTimes(4);
});

it.each(["onError", "onSuccess"] as const)("%s fires on key change", async arg => {
    const callback = vi.fn();

    const fetcher = async () => {
        await waitForMs();
        if (arg === "onError") {
            throw { foo: "bar" };
        }

        return { foo: "bar" };
    };

    const [key, setKey] = createKey();

    renderHook(useSWR, [
        key,
        { fetcher, onError: callback, onSuccess: callback, keepPreviousData: true },
    ]);

    await waitForMs();

    expect(callback).toBeCalledTimes(1);
    expect(callback).toBeCalledWith({ foo: "bar" });

    setKey(createUniqueId());

    await waitForMs();
    expect(callback).toBeCalledTimes(2);
    expect(callback).toBeCalledWith({ foo: "bar" });
});

it.each(["onError", "onSuccess"] as const)(
    "%s does not track the signals inside",
    async arg => {
        const [get, set] = createSignal("foo");

        // eslint-disable-next-line solid/reactivity
        const callback = vi.fn(() => get());

        const [key] = createKey();

        const fetcher = async () => {
            await waitForMs();
            if (arg === "onError") {
                throw { foo: "bar" };
            }

            return { foo: "bar" };
        };

        renderHook(useSWR, [key, { fetcher, onError: callback, onSuccess: callback }]);

        await waitForMs();

        expect(callback).toBeCalledTimes(1);
        set(createUniqueId());
        expect(callback).toBeCalledTimes(1);

        expect(callback).toBeCalledWith({ foo: "bar" });
    }
);

it.each(["onError", "onSuccess"] as const)(
    "%s fires when nested data inside changed",
    async arg => {
        const callback = vi.fn();

        const [key, setKey] = createKey();

        let i = 0;

        const fetcher = async () => {
            await waitForMs();

            const x = {
                a: {
                    b: "c",
                },
            };

            if (i > 0) {
                x.a.b = "foo";
            }

            i++;

            if (arg === "onError") throw x;
            return x;
        };

        renderHook(useSWR, [
            key,
            { fetcher, onError: callback, onSuccess: callback, keepPreviousData: true },
        ]);
        await waitForMs();

        expect(callback).toBeCalledTimes(1);
        expect(callback).toBeCalledWith({ a: { b: "c" } });

        setKey(createUniqueId());
        await waitForMs();

        expect(callback).toBeCalledTimes(2);
        expect(callback).toBeCalledWith({ a: { b: "foo" } });
    }
);

it("fallback passed locally works", () => {
    const fetcher = vi.fn(async (k: string) => {
        await waitForMs();
        return k;
    });

    const { result } = renderHook(useSWR, [
        () => "foo",
        { fetcher, fallback: { foo: "foo" } },
    ]);

    expect(result.data.v).toBe("foo");
});
