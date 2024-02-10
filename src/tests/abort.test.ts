import { renderHook } from "@solidjs/testing-library";
import { expect, it, vi } from "vitest";

import useSWR, { Fetcher } from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("aborts the previous request when changing keys", async () => {
    const [key, setKey] = createKey();

    let abortSignal: AbortSignal | undefined;

    const fetcher = vi.fn(async (x: string, { signal }: { signal: AbortSignal }) => {
        if (x === "foo") {
            abortSignal = signal;
        }

        await waitForMs(200);
        return x;
    });

    const { result } = renderHook(useSWR, [key, { fetcher: fetcher as Fetcher<string> }]);
    await waitForMs(200);

    expect(result.data.v).toBe(key());

    setKey("foo");
    await waitForMs(100);

    setKey("bar");

    expect(abortSignal?.aborted).toBe(true);
    expect(result.error.v).toBe(undefined);

    await waitForMs(200);

    expect(result.data.v).toBe("bar");
    expect(result.isLoading()).toBe(false);
    expect(result.error.v).toBe(undefined);
});
