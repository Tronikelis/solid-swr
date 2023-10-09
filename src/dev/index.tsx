import { createEffect, createSignal, For, Suspense } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";

import useSWR, { useOptions, useSWRSuspense } from "~/index";

function useFetch() {
    const swr = useSWRSuspense(() => `https://jsonplaceholder.typicode.com/todos/1`);
    return swr;
}

function InnerB() {
    const { data } = useFetch();

    const { data: data1, error } = useSWR<string>(() => "foo", {
        fetcher: () => new Promise(r => setTimeout(() => r("foo"), 2e3)),
    });

    return (
        <Suspense fallback={<h2>Inner B is loading</h2>}>
            <div>
                inner B delay: {data1()}
                <pre>{JSON.stringify(data(), null, 4)}</pre>
            </div>
        </Suspense>
    );
}

function InnerA() {
    const { data } = useFetch();

    return (
        <div>
            <div>
                inner A: <pre>{JSON.stringify(data(), null, 4)}</pre>
            </div>

            <InnerB />
            <InnerB />
        </div>
    );
}

function Inner() {
    const { data } = useFetch();

    return (
        <>
            <div>
                inner: <pre>{JSON.stringify(data(), null, 4)}</pre>
            </div>

            <InnerA />
            <InnerA />
        </>
    );
}

function OnlyError() {
    const { error } = useSWRSuspense<undefined, Record<string, never>>(
        () => `https://jsonplaceholder.typicode.com/todos/XD`
    );

    createEffect(() => {
        console.log("OnlyError", error());
    });

    return (
        <div>
            <pre>{JSON.stringify(error(), null, 4)}</pre>
        </div>
    );
}

function App() {
    return (
        <Suspense fallback={<h1>wait for me idiot</h1>}>
            <Inner />

            <Suspense fallback={<h1>OnlyError</h1>}>
                <OnlyError />
            </Suspense>
        </Suspense>
    );
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
