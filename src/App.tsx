import { Accessor, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import useSWR, { Options } from "./solid-swr";

function usePosts(count: Accessor<number>, options: () => Options) {
    const swr = useSWR(() => `https://jsonplaceholder.typicode.com/todos/${count()}`, options);
    return swr;
}

function App() {
    const [show, setShow] = createSignal(true);

    return (
        <div>
            <WithSWR />
            {show() && <WithSWR />}

            <button onClick={() => setShow(x => !x)} style={{ "margin-top": "64px" }}>
                toggle
            </button>
        </div>
    );
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

export default App;
