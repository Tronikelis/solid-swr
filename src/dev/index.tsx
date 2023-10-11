import { createEffect, createSignal, Suspense } from "solid-js";
import { render } from "solid-js/web";

import useSWR, { useSWRSuspense } from "~/index";

function useFetch() {
    const swr = useSWRSuspense(() => `https://jsonplaceholder.typicode.com/todos/1`);
    return swr;
}

function InnerB() {
    const { data } = useFetch();

    const { data: data1 } = useSWR<string>(() => "foo", {
        fetcher: () => new Promise(res => setTimeout(() => res("foo"), 2e3)),
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

    const [key, setKey] = createSignal<string | undefined>(undefined);

    createEffect(() => {
        if (data()) {
            setKey("foo");
        }
    });

    const { data: d } = useSWRSuspense(key, {
        fetcher: async () => {
            await new Promise(r => setTimeout(r, 2e3));
            return "foo";
        },
    });

    return (
        <div>
            <div>
                inner A: <pre>{JSON.stringify(data(), null, 4)}</pre>
            </div>

            <InnerB />
            <InnerB />

            <div>
                <h3>DEPENDENT SUS: {d() ? "YES" : "NO"}</h3>
            </div>
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
        () => `https://jsonplaceholder.typicode.com/posts/XD/comments`,
        {
            fetcher: async () => {
                await new Promise(r => setTimeout(r, 4e3));
                throw {
                    status: 404,
                    data: {
                        foo: "bar",
                    },
                };
            },
        }
    );

    createEffect(() => {
        console.log("OnlyError", error());
    });

    return (
        <div>
            <p>Bruh what</p>
            <pre>{JSON.stringify(error(), null, 4)}</pre>
        </div>
    );
}

function App() {
    return (
        <>
            <Suspense fallback={<h1>wait for me idiot</h1>}>
                <Inner />
            </Suspense>

            <OnlyError />
        </>
    );
}

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
