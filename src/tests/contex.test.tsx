import { expect, it, jest } from "@jest/globals";
import { render } from "@solidjs/testing-library";
import { createEffect, onMount } from "solid-js";
import { createStore } from "solid-js/store";

import useSWR, {
    CacheImplements,
    Options,
    SWRFallback,
    SWROptionsProvider,
    useOptions,
} from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("gets the settings from the SWRConfig", async () => {
    const [key] = createKey();

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    function WithConfig(props: { children: any }) {
        return <SWROptionsProvider value={{ fetcher }}>{props.children}</SWROptionsProvider>;
    }

    function App() {
        useSWR<string>(key);
        return <></>;
    }

    render(() => (
        <WithConfig>
            <App />
        </WithConfig>
    ));

    await waitForMs();
    expect(fetcher).toBeCalledTimes(1);
});

it("merges the settings correctly", async () => {
    const [key] = createKey();

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const cache: CacheImplements = (() => {
        const map = new Map();
        return {
            get: key => map.get(key),
            set: (key, value) => {
                map.set(key, value);
            },
            keys: () => Array.from(map.keys()),
        };
    })();

    function WithConfig(props: { children: any }) {
        return <SWROptionsProvider value={{ fetcher }}>{props.children}</SWROptionsProvider>;
    }

    function App() {
        useSWR(key, { cache });
        return <></>;
    }

    render(() => (
        <WithConfig>
            <App />
        </WithConfig>
    ));

    await waitForMs();

    expect(cache.keys().length).toBe(1);
    expect(fetcher).toBeCalledTimes(1);
});

it("prioritizes the hook settings most", async () => {
    const [key] = createKey();

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    const badFetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    function WithConfig(props: { children: any }) {
        return (
            <SWROptionsProvider value={{ fetcher: badFetcher }}>
                {props.children}
            </SWROptionsProvider>
        );
    }

    function App() {
        useSWR(key, { fetcher });
        return <></>;
    }

    render(() => (
        <WithConfig>
            <App />
        </WithConfig>
    ));

    await waitForMs();

    expect(fetcher).toBeCalledTimes(1);
    expect(badFetcher).toBeCalledTimes(0);
});

it("SSRFallback fallbacks for ssr purposes", () => {
    const [key] = createKey();

    function WithFallback(props: { children: any }) {
        return (
            <SWRFallback.Provider
                value={{
                    [key()]: key(),
                }}
            >
                {props.children}
            </SWRFallback.Provider>
        );
    }

    function App() {
        const { data } = useSWR(key);
        expect(data()).toBe(key());

        return <></>;
    }

    render(() => (
        <WithFallback>
            <App />
        </WithFallback>
    ));
});

it("merges nested options", () => {
    let i = 0;

    function A() {
        const config = useOptions();
        expect(config.keepPreviousData).toBe(true);
        expect(config.refreshInterval).toBe(0);
        expect(config.isEnabled).toBe(false);

        i++;

        return <></>;
    }

    function B() {
        const config = useOptions();
        expect(config.keepPreviousData).toBe(true);
        expect(config.refreshInterval).toBe(1);
        expect(config.isEnabled).toBe(false);

        i++;

        return <></>;
    }

    render(() => (
        <SWROptionsProvider
            value={{
                keepPreviousData: false,
                refreshInterval: 0,
                isEnabled: false,
            }}
        >
            <SWROptionsProvider value={{ keepPreviousData: true }}>
                <A />
                <SWROptionsProvider value={{ refreshInterval: 1 }}>
                    <B />
                </SWROptionsProvider>
            </SWROptionsProvider>
        </SWROptionsProvider>
    ));

    expect(i).toBe(2);
});

it("nested options preserve reactivity", async () => {
    let i = 0;

    function B() {
        const options = useOptions();

        createEffect(() => {
            if (i++ === 0) {
                expect(options.refreshInterval).toBe(0);
                return;
            }

            expect(options.refreshInterval).toBe(1);
        });

        return <></>;
    }

    function A() {
        const [store, setStore] = createStore<Options<unknown, unknown>>({});

        onMount(async () => {
            await waitForMs();
            setStore("refreshInterval", 1);
        });

        return (
            <SWROptionsProvider value={store}>
                <B />
            </SWROptionsProvider>
        );
    }

    render(() => <A />);

    await waitForMs();
    expect(i).toBe(2);
});
