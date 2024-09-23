import { renderHook } from "@solidjs/testing-library";
import { Accessor, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import { SwrOpts, SwrProvider } from "./core";
import { SwrFullOpts, useSwrFull } from "./extra";
import { Store } from "./store";

describe("extra", () => {
    let key: Accessor<string | undefined>;
    let opts: Partial<SwrFullOpts>;
    let fetcher: MockedFunction<SwrOpts["fetcher"]>;
    let store: SwrOpts["store"];

    beforeEach(() => {
        opts = {};
        key = () => "foo";
        store = new Store();
        fetcher = vi.fn((key, _opts) => Promise.resolve(key));
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    describe("useSwrFull", () => {
        const renderHelper = () =>
            renderHook(() => useSwrFull(key, opts), {
                wrapper: props => (
                    <SwrProvider value={{ fetcher, store }}>{props.children}</SwrProvider>
                ),
            });

        it("calls fetcher and updates store", async () => {
            const { result } = renderHelper();

            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(fetcher).toHaveBeenCalledWith(
                "foo",
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                expect.objectContaining({ signal: expect.anything() })
            );

            expect(result.v()._isBusy).toBe(true);
            expect(result.v().isLoading).toBe(true);
            expect(result.v()._onSuccess).toBe(0);
            expect(result.v().err).toBeUndefined();

            await vi.runAllTimersAsync();

            expect(result.v()._isBusy).toBe(false);
            expect(result.v().isLoading).toBe(false);
            expect(result.v().data).toBe("foo");
            expect(result.v()._onSuccess).toBe(1);
            expect(result.v().err).toBeUndefined();
        });

        it("keeps previous data", async () => {
            opts.keepPreviousData = true;

            const [signal, setSignal] = createSignal("foo");
            key = signal;

            const { result } = renderHelper();
            await vi.runAllTimersAsync();

            expect(result.v().data).toBe("foo");
            expect(result.v().isLoading).toBe(false);

            setSignal("foobar");
            expect(result.v().data).toBe("foo");
            expect(result.v().isLoading).toBe(true);

            await vi.runAllTimersAsync();
            expect(result.v().data).toBe("foobar");
            expect(result.v().isLoading).toBe(false);
        });

        it("sets hasFetched on success", async () => {
            const { result } = renderHelper();

            expect(result.hasFetched()).toBe(false);
            await vi.runAllTimersAsync();
            expect(result.hasFetched()).toBe(true);
        });

        it("sets hasFetched on error", async () => {
            // @ts-expect-error I'm not typing this
            fetcher = () => Promise.reject(new Error("foo")) as any;

            const { result } = renderHelper();

            expect(result.hasFetched()).toBe(false);
            await vi.runAllTimersAsync();
            expect(result.hasFetched()).toBe(true);
        });
    });
});
