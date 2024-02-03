import { render } from "@solidjs/testing-library";
import { ErrorBoundary, Suspense } from "solid-js";
import { expect, it } from "vitest";

import { useSWRSuspense } from "~/index";

import "@testing-library/jest-dom/vitest";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("suspends on first fetch", async () => {
    const [key] = createKey();

    const fetcher = async (key: string) => {
        await waitForMs();
        return key;
    };

    const fallbackId = "fallback";

    const { queryByTestId } = render(() => {
        const { data } = useSWRSuspense<string | undefined>(key, { fetcher });

        return (
            <Suspense fallback={<p data-testid={fallbackId} />}>
                <p data-testid={data()}>{data()}</p>
            </Suspense>
        );
    });

    expect(queryByTestId(fallbackId)).toBeInTheDocument();
    expect(queryByTestId(key())).not.toBeInTheDocument();

    await waitForMs();
    expect(queryByTestId(fallbackId)).not.toBeInTheDocument();
    expect(queryByTestId(key())).toBeInTheDocument();
});

it("does not suspend on dependent (undefined) keys", () => {
    const fallbackId = "fallback";
    const childrenId = "children";

    const { queryByTestId } = render(() => {
        const { data } = useSWRSuspense<undefined>(() => undefined);

        return (
            <Suspense fallback={<p data-testid={fallbackId} />}>
                <p data-testid={childrenId}>{data()}</p>
            </Suspense>
        );
    });

    expect(queryByTestId(childrenId)).toBeInTheDocument();
    expect(queryByTestId(fallbackId)).not.toBeInTheDocument();
});

it("json stringifies error messages for ErrorBoundary", async () => {
    const err = { foo: "bar" };

    const fetcher = async () => {
        await waitForMs();
        throw err;
    };

    const fallbackId = "fallback";
    const errorId = "error";

    const { queryByTestId } = render(() => {
        const { data } = useSWRSuspense(() => "foo", { fetcher });

        return (
            <ErrorBoundary
                fallback={(err: Error) => <p data-testid={errorId}>{err.message}</p>}
            >
                <Suspense fallback={<p data-testid={fallbackId} />}>{data()}</Suspense>
            </ErrorBoundary>
        );
    });

    expect(queryByTestId(fallbackId)).toBeInTheDocument();

    await waitForMs();
    expect(queryByTestId(errorId)).toHaveTextContent(JSON.stringify(err));
    expect(queryByTestId(fallbackId)).not.toBeInTheDocument();
});
