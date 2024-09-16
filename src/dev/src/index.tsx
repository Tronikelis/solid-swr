import { Accessor, createEffect, createSignal, For } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { render } from "solid-js/web";
import { createCache } from "src/cache";
import LRU from "src/lru";
import Store from "src/store";
import useSwr, { SwrProvider } from "src/swr";
import useSwrFull, { SwrFullProvider, useMatchMutate, useSwrInfinite } from "src/swr-full";

function Infinite() {
    const mutate = useMatchMutate();

    const { setIndex, state } = useSwrInfinite<{ id: number }, unknown>(
        index => `https://jsonplaceholder.typicode.com/todos/${index + 1}`
    );

    return (
        <div>
            {/* <For each={data()}>{item => <p>{item?.id}</p>}</For> */}
            <For each={state.data}>{item => <p>{item?.id}</p>}</For>

            <p
                onClick={() => {
                    mutate(_ => true, undefined);
                }}
            >
                test
            </p>
            <p>isLoading: {state.isLoading ? "y" : "n"}</p>
            <button onClick={() => setIndex(x => x + 1)}>more</button>
        </div>
    );
}

function SmolFetcher(props: { key: Accessor<string | undefined> }) {
    const { v, mutate, revalidate } = useSwrFull(() => props.key());

    return (
        <pre>
            isLoading: {v()?.isLoading ? "true" : "false"}
            {"\n"}
            {v().data ? JSON.stringify(v().data) : "{}"}
            <div
                onClick={() => {
                    mutate(prev => {
                        prev.id = 222;
                    });
                }}
            >
                click
            </div>
        </pre>
    );
}

function App() {
    const [counter, setCounter] = createSignal(1);

    const key = () => `https://jsonplaceholder.typicode.com/todos/${counter()}`;

    // setInterval(() => {
    //     setCounter(x => (x + 1) % 10);
    // }, 1e3);

    return (
        <SwrProvider
            value={{
                store: new Store(createCache(new LRU(3))),
                fetcher: async key => {
                    return await fetch(key).then(r => r.json());
                },
            }}
        >
            <SwrFullProvider
                value={{
                    keepPreviousData: false,
                }}
            >
                <Infinite />
                <For each={new Array(10).fill(0)}>{() => <SmolFetcher key={key} />}</For>
            </SwrFullProvider>
        </SwrProvider>
    );
}

render(() => <App />, document.getElementById("solid-root")!);
