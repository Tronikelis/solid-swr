import { expect, it, jest } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("sets new value instantly and respects revalidation option", async () => {
    let value = `${Math.random()}`;

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key] = createKey();

    const { result } = renderHook(useSWR, [key, { fetcher }]);

    await waitForMs();
    expect(result.data()).not.toBe(value);
    expect(fetcher).toBeCalledTimes(1);

    void result.mutate(value, { revalidate: true });
    expect(result.data()).toBe(value);
    expect(fetcher).toBeCalledTimes(2);

    value = `${Math.random()}`;
    expect(result.data()).not.toBe(value);

    void result.mutate(value, { revalidate: false });
    expect(result.data()).toBe(value);
    expect(fetcher).toBeCalledTimes(2);
});

it("returned.mutate() is bound to the hook", async () => {
    const value = `${Math.random()}`;

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const [key] = createKey();

    const { result } = renderHook(useSWR, [key, { fetcher }]);
    const { result: resultOther } = renderHook(useSWR, [key, { fetcher }]);

    await waitForMs();
    expect(result.data()).not.toBe(value);
    expect(resultOther.data()).not.toBe(value);

    void result.mutate(value, { revalidate: false });
    expect(result.data()).toBe(value);
    expect(resultOther.data()).not.toBe(value);

    // this await here is probably not needed
    // but checking here also that if I accidentally sync up state using events
    // let them finish before checking
    await waitForMs();
    expect(result.data()).toBe(value);
    expect(resultOther.data()).not.toBe(value);
});
