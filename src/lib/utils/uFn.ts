import { untrack } from "solid-js";

type AnyFn = (...params: any[]) => any;

/** returns the same function, wrapped in untrack */
export default function uFn<T extends AnyFn>(fn: T): T {
    return ((...params: Parameters<T>) => untrack(() => fn(...params))) as T;
}
