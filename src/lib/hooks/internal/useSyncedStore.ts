import { Accessor, createEffect } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

type StoreIfy<T> = {
    v: T;
};

export default function useSyncedStore<T>(accessor: Accessor<T>) {
    const [store, setStore] = createStore<StoreIfy<T>>({
        v: accessor(),
    });

    createEffect(() => {
        setStore("v", reconcile(accessor()));
    });

    return store;
}
