import { Accessor, For, createEffect } from "solid-js";
import { render } from "solid-js/web";

import useSWR, { SwrProvider } from "../../core/swr";

function SmolFetcher(props: { key: Accessor<string | undefined> }) {
    const { v, mutate, revalidate } = useSWR(() => props.key());

    return (
        <pre>
            isLoading: {v?.isLoading ? "true" : "false"}
            {v?.data && JSON.stringify(v.data, null, 2)}
            <div
                onClick={() => {
                    mutate(prev => {
                        prev = structuredClone(prev);
                        if (!prev) return prev;
                        prev.id = 2;
                        return prev;
                    });

                    void revalidate();
                }}
            >
                click
            </div>
        </pre>
    );
}

function App() {
    const key = () => "https://jsonplaceholder.typicode.com/todos/1";

    return (
        <SwrProvider
            value={{
                fetcher: async key => {
                    await new Promise(res => {
                        setTimeout(res, 1e3);
                    });

                    return await fetch(key).then(r => r.json());
                },
            }}
        >
            <For each={new Array(100).fill(0)}>{() => <SmolFetcher key={key} />}</For>
        </SwrProvider>
    );
}

render(() => <App />, document.getElementById("solid-root")!);
