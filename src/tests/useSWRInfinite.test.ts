import { renderHook } from "@solidjs/testing-library";
import { createUniqueId } from "solid-js";
import { expect, it, vi } from "vitest";

import { useSWRInfinite } from "../lib";

import waitForMs from "./utils/waitForMs";

it("returns an array of responses and responds to index changes", async () => {
    let count = -1;

    const fetcher = vi.fn(async () => {
        count++;
        await waitForMs();
        return count.toString();
    });

    const uniq = createUniqueId();

    const { result } = renderHook(useSWRInfinite, [index => `${index}${uniq}`, { fetcher }]);

    expect(result.isLoading()).toBe(true);
    expect(result.data.v.length).toBe(0);

    await waitForMs();

    expect(fetcher).toBeCalledTimes(1);
    expect(result.isLoading()).toBe(false);

    expect(result.data.v.length).toBe(1);
    expect(result.data.v[0]).toBe("0");

    result.setIndex(1);

    await waitForMs();

    expect(result.data.v.length).toBe(2);
    expect(result.data.v[0]).toBe("0");
    expect(result.data.v[1]).toBe("1");
});

it("when loading isn't finished, does not gives up on older index effect", async () => {
    let count = 0;

    const fetcher = vi.fn(async () => {
        await waitForMs();
        return (count++).toString();
    });

    const uniq = createUniqueId();

    const { result } = renderHook(useSWRInfinite, [index => `${index}${uniq}`, { fetcher }]);

    result.setIndex(1);
    result.setIndex(2);

    await waitForMs();

    expect(result.data.v.length).toBe(3);
    expect(result.data.v[0]).toBe("0");
    expect(result.data.v[1]).toBe("1");
    expect(result.data.v[2]).toBe("2");

    expect(fetcher).toBeCalledTimes(3);
});
