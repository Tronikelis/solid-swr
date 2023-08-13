import { Accessor, createSignal } from "solid-js";
import useSWR from "./solid-swr";

function usePosts(count: Accessor<number>) {
    const swr = useSWR(
        () => `https://jsonplaceholder.typicode.com/todos/${count()}`
    );

    return swr;
}

function App() {
    const [show, setShow] = createSignal(true);

    return (
        <div>
            <WithSWR />
            {show() && <WithSWR />}

            <button
                onClick={() => setShow(x => !x)}
                style={{ "margin-top": "64px" }}
            >
                toggle
            </button>
        </div>
    );
}

function WithSWR() {
    const [count, setCount] = createSignal(1);
    const posts = usePosts(count);

    return (
        <div>
            <pre>{JSON.stringify(posts.data(), null, 4)}</pre>
            <p>isLoading: {posts.isLoading() ? "yes" : "no"}</p>
            <button onClick={() => setCount(x => x + 1)}>+1</button>
            <p>count: {count()}</p>
        </div>
    );
}

export default App;
