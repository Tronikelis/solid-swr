import { createEffect, createSignal, For } from "solid-js";
import { render } from "solid-js/web";

import useSWR, { useSWRInfinite } from "~/index";

function App() {
    const [index, setIndex] = createSignal(1);

    const { data, error } = useSWR(
        () => `https://jsonplaceholder.typicode.com/todos/${index()}`,
        { keepPreviousData: true }
    );

    createEffect(() => {
        console.log(error());
    });

    return (
        <div>
            <pre>{JSON.stringify(data(), null, 4)}</pre>
            <button onClick={() => setIndex(x => x + 1)}>+1</button>
        </div>
    );
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
