import { Accessor, createEffect, onCleanup } from "solid-js";

export default function useInterval(cb: () => void, ms: Accessor<number>) {
    createEffect(() => {
        const interval = setInterval(cb, ms());
        onCleanup(() => {
            clearInterval(interval);
        });
    });
}
