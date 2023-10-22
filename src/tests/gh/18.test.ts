import { expect, it } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../../lib";
import createKey from "../utils/createKey";
import waitForMs from "../utils/waitForMs";

it(">1 immutable hooks with the same key has consistent isLoading state", async () => {
    const fetcher = async (k: string) => {
        await waitForMs();
        return k;
    };

    const [key] = createKey();

    renderHook(useSWR, [key, { fetcher }]);
    await waitForMs(5);

    const { result: result1 } = renderHook(useSWR, [key, { isImmutable: true, fetcher }]);
    const { result: result2 } = renderHook(useSWR, [key, { isImmutable: true, fetcher }]);

    expect(result1.isLoading()).toBe(true);
    expect(result2.isLoading()).toBe(true);

    await waitForMs();

    expect(result1.isLoading()).toBe(false);
    expect(result2.isLoading()).toBe(false);
});
