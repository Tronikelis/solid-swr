import { klona } from "klona";
import { Accessor, createEffect } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import { StoreIfy } from "~/types";

export default function useSyncedStore<T>(accessor: Accessor<T>) {
    const [store, setStore] = createStore<StoreIfy<T>>({
        // cloning here, so that store is not a reference to the signal
        v: klona(accessor()),
    });

    createEffect(() => {
        setStore("v", reconcile(accessor()));
    });

    return store;
}
