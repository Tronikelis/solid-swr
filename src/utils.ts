import { Accessor, onCleanup, onMount, untrack } from "solid-js";

type Fn<T> = (...params: any[]) => T;

export function uFn<T extends Fn<any>>(fn: T) {
    return ((...params: Parameters<T>) => untrack(() => fn(...params))) as T;
}

export function runIfTruthy<R, T, G extends (arg: NonNullable<T>) => R>(
    acc: Accessor<T>,
    run: G
) {
    const x = acc();
    if (!x) return;
    return run(x);
}

export function noop() {}

export async function tryCatch<D = unknown, E = unknown>(
    fn: Fn<Promise<D>>
): Promise<[E] | [undefined, D]> {
    try {
        return [undefined, await fn()];
    } catch (err: unknown) {
        return [err as E];
    }
}

export function useWinEvent(type: string, cb: Fn<any>) {
    onMount(() => {
        window.addEventListener(type, cb);
        onCleanup(() => window.removeEventListener(type, cb));
    });
}
