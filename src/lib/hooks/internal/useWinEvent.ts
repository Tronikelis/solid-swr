import { onCleanup, onMount } from "solid-js";

type AnyFn = (...params: any[]) => void;

export default function useWinEvent(type: string, cb: AnyFn) {
    onMount(() => {
        window.addEventListener(type, cb);

        onCleanup(() => {
            window.removeEventListener(type, cb);
        });
    });
}
