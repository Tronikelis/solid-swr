import { renderHook } from "@solidjs/testing-library";
import { runWithOwner } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import { createMutator, createRevalidator, SwrOpts, SwrProvider } from "./core";
import { Store } from "./store";

describe("core", () => {
    let fetcher: MockedFunction<SwrOpts["fetcher"]>;
    let store: SwrOpts["store"];

    const renderHelper = () =>
        renderHook(
            () => ({
                revalidator: createRevalidator(),
                mutator: createMutator(),
            }),
            {
                wrapper: props => (
                    <SwrProvider value={{ fetcher, store }}>{props.children}</SwrProvider>
                ),
            }
        );

    beforeEach(() => {
        store = new Store();
        fetcher = vi.fn((key, _opts) => Promise.resolve(key));
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    describe("createRevalidator", () => {
        it("calls fetcher and updates store", async () => {
            const { result } = renderHelper();

            void result.revalidator("foo");

            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(fetcher).toHaveBeenCalledWith(
                "foo",
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                expect.objectContaining({ signal: expect.anything() })
            );

            expect(store.lookupOrDef("foo")._isBusy).toBe(true);
            expect(store.lookupOrDef("foo").isLoading).toBe(true);
            expect(store.lookupOrDef("foo")._onSuccess).toBe(0);
            expect(store.lookupOrDef("foo").err).toBeUndefined();

            await vi.runAllTimersAsync();

            expect(store.lookupOrDef("foo")._isBusy).toBe(false);
            expect(store.lookupOrDef("foo").isLoading).toBe(false);
            expect(store.lookupOrDef("foo").data).toBe("foo");
            expect(store.lookupOrDef("foo")._onSuccess).toBe(1);
            expect(store.lookupOrDef("foo").err).toBeUndefined();
        });

        it("deduplicates calls to fetcher", () => {
            const { result } = renderHelper();

            void result.revalidator("foo");
            void result.revalidator("foo");
            void result.revalidator("foo");

            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it("aborts the previous call to fetcher", () => {
            const { owner, result, cleanup } = renderHelper();

            runWithOwner(owner, () => {
                void result.revalidator("foo");
            });

            expect(store.lookupOrDef("foo")._isBusy).toBe(true);
            cleanup();
            expect(store.lookupOrDef("foo")._isBusy).toBe(false);
        });

        it("catches fetcher errors", async () => {
            fetcher.mockRejectedValue(new Error("error"));

            const { result } = renderHelper();

            void result.revalidator("foo");

            expect(store.lookupOrDef("foo")._onError).toBe(0);
            expect(store.lookupOrDef("foo").err).toBeUndefined();

            await vi.runAllTimersAsync();

            expect(store.lookupOrDef("foo").err).toBeInstanceOf(Error);
            expect(store.lookupOrDef("foo")._onError).toBe(1);
        });
    });

    describe("createMutator", () => {
        it("mutates, xd", () => {
            const { result } = renderHelper();

            expect(store.lookupOrDef("foo").data).toBeUndefined();
            result.mutator("foo", "foo");
            expect(store.lookupOrDef("foo").data).toBe("foo");
        });
    });
});
