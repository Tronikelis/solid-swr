import { renderHook } from "@solidjs/testing-library";
import { runWithOwner } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import { createMutator, createRevalidator, SwrOpts, SwrProvider } from "./core";
import { Store } from "./store";

describe("core", () => {
    let fetcher: MockedFunction<SwrOpts["fetcher"]>;
    let store: SwrOpts["store"];
    let key: string;

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
        key = "foo";

        store = new Store();
        store.mount(key);

        fetcher = vi.fn((key, _opts) => Promise.resolve(key));
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    describe("createRevalidator", () => {
        it("calls fetcher and updates store", async () => {
            const { result } = renderHelper();

            void result.revalidator(key);

            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(fetcher).toHaveBeenCalledWith(
                key,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                expect.objectContaining({ signal: expect.anything() })
            );

            expect(store.lookupOrDef(key)._isBusy).toBe(true);
            expect(store.lookupOrDef(key).isLoading).toBe(true);
            expect(store.lookupOrDef(key)._onSuccess).toBe(0);
            expect(store.lookupOrDef(key).err).toBeUndefined();

            await vi.runAllTimersAsync();

            expect(store.lookupOrDef(key)._isBusy).toBe(false);
            expect(store.lookupOrDef(key).isLoading).toBe(false);
            expect(store.lookupOrDef(key).data).toBe(key);
            expect(store.lookupOrDef(key)._onSuccess).toBe(1);
            expect(store.lookupOrDef(key).err).toBeUndefined();
        });

        it("deduplicates calls to fetcher", () => {
            const { result } = renderHelper();

            void result.revalidator(key);
            void result.revalidator(key);
            void result.revalidator(key);

            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it("aborts the previous call to fetcher", () => {
            const { owner, result, cleanup } = renderHelper();

            runWithOwner(owner, () => {
                void result.revalidator(key);
            });

            expect(store.lookupOrDef(key)._isBusy).toBe(true);
            cleanup();
            expect(store.lookupOrDef(key)._isBusy).toBe(false);
        });

        it("catches fetcher errors", async () => {
            fetcher.mockRejectedValue(new Error("error"));

            const { result } = renderHelper();

            void result.revalidator(key);

            expect(store.lookupOrDef(key)._onError).toBe(0);
            expect(store.lookupOrDef(key).err).toBeUndefined();

            await vi.runAllTimersAsync();

            expect(store.lookupOrDef(key).err).toBeInstanceOf(Error);
            expect(store.lookupOrDef(key)._onError).toBe(1);
        });
    });

    describe("createMutator", () => {
        it("mutates, xd", () => {
            const { result } = renderHelper();

            expect(store.lookupOrDef(key).data).toBeUndefined();
            result.mutator(key, key);
            expect(store.lookupOrDef(key).data).toBe(key);
        });
    });
});
