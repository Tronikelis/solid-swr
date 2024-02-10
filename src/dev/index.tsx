import { render } from "solid-js/web";

import useSWR from "~/index";

function useFetch() {
    const swr = useSWR(() => `https://jsonplaceholder.typicode.com/todos/1`);
    return swr;
}

function App() {
    const { data } = useFetch();

    return <>{JSON.stringify(data.v)}</>;
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
