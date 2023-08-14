import { Accessor, createSignal, For } from "solid-js";
import { createStore } from "solid-js/store";

import useSWR, { Options } from "./solid-swr";

function usePosts(count: Accessor<number>, options: () => Options) {
    const swr = useSWR(() => `https://jsonplaceholder.typicode.com/todos/${count()}`, options);
    return swr;
}

function WithSWR() {
    const [count, setCount] = createSignal(1);

    const [options, setOptions] = createStore<Options>({
        isEnabled: true,
        refreshInterval: 0,
    });

    const posts = usePosts(count, () => options);

    function toggleIsEnabled() {
        setOptions(x => ({ ...x, isEnabled: !x.isEnabled }));
    }
    function toggleRefreshInterval() {
        setOptions(x => ({
            ...x,
            refreshInterval: x.refreshInterval === 0 ? 1e3 : 0,
        }));
    }

    return (
        <div>
            <pre>{JSON.stringify(posts.data(), null, 4)}</pre>
            <p>isLoading: {posts.isLoading() ? "yes" : "no"}</p>
            <button onClick={() => setCount(x => x + 1)}>+1</button>
            <p>count: {count()}</p>

            <button onClick={toggleIsEnabled}>
                toggleIsEnabled: {options.isEnabled ? "yes" : "no"}
            </button>
            <button onClick={toggleRefreshInterval}>
                toggleRefreshInterval {options.refreshInterval}
            </button>
        </div>
    );
}

function Nested(props: { count: number }) {
    return (
        <>
            {props.count < 100 && (
                <div>
                    <WithSWR />
                    <div>
                        <WithSWR />
                        <div>
                            <WithSWR />
                            <div>
                                <WithSWR />
                                <div>
                                    <WithSWR />
                                    <div>
                                        <WithSWR />
                                        <Nested count={props.count + 1} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function App() {
    const arr = new Array(10).fill(false);

    return (
        <div>
            <For each={arr}>{() => <Nested count={0} />}</For>
        </div>
    );
}
