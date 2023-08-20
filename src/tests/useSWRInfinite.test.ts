import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import { useSWRInfinite } from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("returns an array of responses and responds to index changes", async () => {
    let count = -1;

    const fetcher = jest.fn(async () => {
        count++;
        await waitForMs();
        return count.toString();
    });

    const { result } = renderHook(useSWRInfinite, [() => createKey()[0](), { fetcher }]);

    expect(result.isLoading()).toBe(true);
    expect(result.data.length).toBe(0);

    await waitForMs();

    expect(fetcher).toBeCalledTimes(1);
    expect(result.isLoading()).toBe(false);

    expect(result.data.length).toBe(1);
    expect(result.data[0]).toBe("0");

    result.setIndex(1);

    await waitForMs();

    expect(result.data.length).toBe(2);
    expect(result.data[0]).toBe("0");
    expect(result.data[1]).toBe("1");
});

it("when loading isn't finished, gives up on older index effect (I will remove this later somehow)", async () => {
    let count = -1;

    const fetcher = jest.fn(async () => {
        count++;
        await waitForMs();
        return count.toString();
    });

    const { result } = renderHook(useSWRInfinite, [() => createKey()[0](), { fetcher }]);

    result.setIndex(1);
    result.setIndex(2);

    await waitForMs();

    expect(result.data.length).toBe(3);
    expect(result.data[0]).toBe(undefined);
    expect(result.data[1]).toBe(undefined);
    expect(result.data[2]).toBe("2");

    expect(fetcher).toBeCalledTimes(3);
});
