import { createEffect, createSignal, For } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";

import useSWR, { Options, SWROptionsProvider, useOptions, useSWRInfinite } from "~/index";

function PrintOptions() {
    const options = useOptions();
    return <pre>{JSON.stringify({ ...options }, null, 4)}</pre>;
}

function App() {
    const [store, setStore] = createStore<Options<unknown, unknown>>({
        isEnabled: false,
        refreshInterval: 1,
    });

    return (
        <SWROptionsProvider value={store}>
            <button
                onClick={() => {
                    setStore("refreshInterval", Math.floor(Math.random() * 100));
                }}
            >
                btn
            </button>

            <PrintOptions />
            <SWROptionsProvider value={{ isEnabled: true }}>
                <PrintOptions />
            </SWROptionsProvider>
        </SWROptionsProvider>
    );
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
