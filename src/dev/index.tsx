import { createSignal, For } from "solid-js";
import { render } from "solid-js/web";

import useSWR, { useSWRInfinite } from "~/index";

function App() {
    const { data, setIndex, isLoading } = useSWRInfinite((index, prev) => {
        return `https://jsonplaceholder.typicode.com/todos/${index + 1}`;
    });

    return (
        <div>
            <For each={data}>{item => <pre>{JSON.stringify(item, null, 4)}</pre>}</For>
            <button onClick={() => setIndex(x => x + 1)}>load more</button>
            <p>isLoading: {isLoading() ? "yes" : "no"}</p>
        </div>
    );
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
