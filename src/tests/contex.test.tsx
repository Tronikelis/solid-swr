import { expect, it, jest } from "@jest/globals";
import { render } from "@solidjs/testing-library";

import useSWR, { CacheImplements, SWRConfig, SWRFallback } from "../lib";

import createKey from "./utils/createKey";
import waitForMs from "./utils/waitForMs";

it("gets the settings from the SWRConfig", async () => {
    const [key] = createKey();

    const fetcher = jest.fn(async (x: string) => {
        await waitForMs();
        return x;
    });

    function WithConfig(props: { children: any }) {
        return <SWRConfig.Provider value={{ fetcher }}>{props.children}</SWRConfig.Provider>;
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
        return <SWRConfig.Provider value={{ fetcher }}>{props.children}</SWRConfig.Provider>;
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
            <SWRConfig.Provider value={{ fetcher: badFetcher }}>
                {props.children}
            </SWRConfig.Provider>
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
