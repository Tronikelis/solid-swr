import { test } from "@jest/globals";
import { renderHook } from "@solidjs/testing-library";

import useSWR from "../lib";

test("works", () => {
    const { result } = renderHook(useSWR, [
        () => "https://jsonplaceholder.typicode.com/todos/1",
    ]);

    console.log(result.data());
});
