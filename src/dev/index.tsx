import { createSignal } from "solid-js";
import { render } from "solid-js/web";

import useSWR, { useSWRInfinite } from "~/index";

function App() {
    const { data, setIndex } = useSWRInfinite(index => {
        return `https://jsonplaceholder.typicode.com/todos/${index + 1}`;
    });

    return (
        <div>
            <pre>{JSON.stringify(data(), null, 4)}</pre>
            <button onClick={() => setIndex(x => x + 1)}>load more</button>
        </div>
    );
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
