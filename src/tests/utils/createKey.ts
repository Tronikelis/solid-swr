import { createSignal, createUniqueId } from "solid-js";

export default function createKey() {
    const [key, setKey] = createSignal(createUniqueId());
    return [key, setKey] as const;
}
