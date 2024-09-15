import { Accessor, For, createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";

import useSWR, { SwrProvider } from "../../core/swr";

function SmolFetcher(props: { key: Accessor<string | undefined> }) {
    const { v, mutate, revalidate } = useSWR(() => props.key());

    return (
        <pre>
            isLoading: {v()?.isLoading ? "true" : "false"}
            {v()?.data && JSON.stringify(v()!.data)}
            <div>click</div>
        </pre>
    );
}

function App() {
    const [counter, setCounter] = createSignal(1);

    const key = () => `https://jsonplaceholder.typicode.com/todos/${counter()}`;

    setInterval(() => {
        setCounter(x => x + 1);
    }, 1e3);

    return (
        <SwrProvider
            value={{
                fetcher: async key => {
                    return await fetch(key).then(r => r.json());
                },
            }}
        >
            <For each={new Array(1000).fill(0)}>{() => <SmolFetcher key={key} />}</For>
        </SwrProvider>
    );
}

render(() => <App />, document.getElementById("solid-root")!);
