import { Accessor, createEffect, onCleanup } from "solid-js";

export default function useExponential(
    when: Accessor<boolean>,
    fire: () => void,
    max: number
) {
    let current = 2;
    let count = 0;

    createEffect(() => {
        if (!when()) return;

        count = 0;
        let timeout: undefined | ReturnType<typeof setTimeout>;

        function callTimeout() {
            if (count > max) return;

            timeout = setTimeout(() => {
                count++;
                fire();
                callTimeout();
            }, current * 1e3);

            current *= 2;
        }

        callTimeout();

        onCleanup(() => {
            clearTimeout(timeout);
        });
    });
}
