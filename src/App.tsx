import { Accessor, createSignal } from "solid-js";
import useSWR from "./solid-swr";

function usePosts(count: Accessor<number>) {
    const swr = useSWR(
        () => `https://jsonplaceholder.typicode.com/todos/${count()}`
    );

    return swr;
}

function App() {
    const [count, setCount] = createSignal(1);

    const data1 = usePosts(count);
    const data2 = usePosts(count);

    return (
        <div>
            <p>data1:</p>
            <pre>{JSON.stringify(data1.data(), null, 4)}</pre>
            <p>isLoading: {data1.isLoading() ? "YES" : "NO"}</p>

            <br />

            <p>data2:</p>
            <pre>{JSON.stringify(data2.data(), null, 4)}</pre>
            <p>isLoading: {data2.isLoading() ? "YES" : "NO"}</p>

            <button onClick={() => setCount(x => x + 1)}>+1 post</button>
        </div>
    );
}

export default App;
