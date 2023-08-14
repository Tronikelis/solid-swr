import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

import waitForMs from "./utils/waitForMs";

it("polls the fetcher based on an interval", async () => {
    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });
    const refreshInterval = 1e3;

    renderHook(useSWR, [() => "_", () => ({ fetcher, refreshInterval })]);
    expect(fetcher).toBeCalledTimes(1);

    await waitForMs(refreshInterval);
    expect(fetcher).toBeCalledTimes(2);

    await waitForMs(refreshInterval);
    expect(fetcher).toBeCalledTimes(3);
});

it("revalidates on focus", async () => {
    const fetcherTime = 50;

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs(fetcherTime);
        return x;
    });

    renderHook(useSWR, [() => "_", () => ({ fetcher })]);

    // would deduplicate the request otherwise (desired behavior)
    await waitForMs(fetcherTime * 2);

    window.dispatchEvent(new Event("focus", { bubbles: true }));

    await waitForMs(fetcherTime * 2);
    expect(fetcher).toBeCalledTimes(2);
});
