import { expect, it } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

import waitForTruthy from "./utils/waitForTruthy";

it("at least boots up", async () => {
    const { result } = renderHook(useSWR, [
        () => "https://jsonplaceholder.typicode.com/todos/1",
    ]);

    expect(result.data()).toBe(undefined);
    expect(result.error()).toBe(undefined);
    expect(result.isLoading()).toBe(true);

    await waitForTruthy(result.data);

    expect(result.data()).not.toBe(undefined);
    expect(result.error()).toBe(undefined);
    expect(result.isLoading()).toBe(false);
});
