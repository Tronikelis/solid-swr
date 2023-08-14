import { expect, test } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

test("works", async () => {
    const { result } = renderHook(useSWR, [
        () => "https://jsonplaceholder.typicode.com/todos/1",
    ]);

    await new Promise(r => setTimeout(r, 3e3));

    expect(result.data()).not.toBe(undefined);
});
