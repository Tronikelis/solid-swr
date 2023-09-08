import { createSignal, For } from "solid-js";
import { render } from "solid-js/web";

import useSWR, { useSWRInfinite } from "~/index";

function App() {
    const [index, setIndex] = createSignal(0);

    const { data } = useSWR(
        () => `https://jsonplaceholder.typicode.com/todos/${index() + 1}`,
        { keepPreviousData: true }
    );

    return (
        <div>
            <pre>{JSON.stringify(data(), null, 4)}</pre>
            <button onClick={() => setIndex(x => x + 1)}>+1</button>
        </div>
    );
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
