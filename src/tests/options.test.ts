import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import useSWR from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

// NOTE:
// I wanted to test the window revalidation event, the focus event and all that
// but couldn't get jsdom to properly send the events to my hook 🤔

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

it("isEnabled works", async () => {
    const fetcherWait = 50;

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs(fetcherWait);
        return x;
    });

    const [key, setKey] = createKey();
    const [isEnabled, setIsEnabled] = createSignal(true);

    // eslint-disable-next-line solid/reactivity
    const { result } = renderHook(useSWR, [key, () => ({ fetcher, isEnabled: isEnabled() })]);

    await waitForMs(fetcherWait);
    expect(fetcher).toBeCalledTimes(1);

    setIsEnabled(false);
    setKey("foo");

    expect(fetcher).toBeCalledTimes(1);
    expect(result.isLoading()).toBe(false);

    fetcher.mockClear();
    expect(fetcher).toBeCalledTimes(0);
});
