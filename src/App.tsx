import { Accessor, createSignal } from "solid-js";
import useSWR from "./solid-swr";

function usePosts(count: Accessor<number>) {
    const { data } = useSWR(
        () => `https://jsonplaceholder.typicode.com/todos/${count()}`
    );

    return data;
}

function App() {
    const [count, setCount] = createSignal(1);

    const data1 = usePosts(count);
    const data2 = usePosts(count);

    return (
        <div>
            <p>data1:</p>
            <pre>{JSON.stringify(data1(), null, 4)}</pre>

            <br />

            <p>data2:</p>
            <pre>{JSON.stringify(data2(), null, 4)}</pre>

            <button onClick={() => setCount(x => x + 1)}>+1 post</button>
        </div>
    );
}

export default App;
