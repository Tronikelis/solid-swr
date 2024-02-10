import { renderHook } from "@solidjs/testing-library";
import { expect, it, vi } from "vitest";

import useSWR from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("sets new value instantly and respects revalidation option", async () => {
    const fetcher = vi.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key] = createKey();

    const { result } = renderHook(useSWR, [key, { fetcher }]);

    await waitForMs();
    expect(result.data.v).toBe(key());
    expect(fetcher).toBeCalledTimes(1);

    result.mutate("foo", { revalidate: true });
    expect(result.data.v).toBe("foo");
    expect(fetcher).toBeCalledTimes(2);

    // wait for revalidation to complete
    await waitForMs();

    result.mutate("bar", { revalidate: false });
    expect(result.data.v).toBe("bar");
    expect(fetcher).toBeCalledTimes(2);
});
