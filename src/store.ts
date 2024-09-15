import { batch, untrack } from "solid-js";
import { createStore, produce, reconcile, SetStoreFunction } from "solid-js/store";

import { noop } from "./utils";

export type OnTrimFn = (key: string) => void;

export type StoreCache = {
    insert: (key: string, onTrim: OnTrimFn) => void;
    lookup: (key: string, onTrim: OnTrimFn) => boolean;
};

export type StoreItem<D = unknown, E = unknown> = {
    data: D | undefined;
    err: E | undefined;

    isLoading: boolean;
    isBusy: boolean;
};

type SolidStore = {
    [key: string]: StoreItem | undefined;
};

const defaultCache: StoreCache = {
    insert: noop,
    lookup: () => true,
};

export default class Store {
    private cache: StoreCache;

    private store: SolidStore;
    private setStore: SetStoreFunction<SolidStore>;

    static defaultItem: StoreItem = {
        isLoading: false,
        isBusy: false,
        err: undefined,
        data: undefined,
    };

    constructor(cache?: StoreCache) {
        this.cache = defaultCache;
        if (cache) this.cache = cache;

        const [store, setStore] = createStore({});
        // eslint-disable-next-line solid/reactivity
        this.store = store;
        this.setStore = setStore;
    }

    keys(): string[] {
        return untrack(() => Object.keys(this.store));
    }

    lookupUpsert<D, E>(key?: string): StoreItem<D, E> {
        const def = Store.defaultItem as StoreItem<D, E>;
        if (!key) return def;

        const already = this.lookup<D, E>(key);
        if (already) return already;

        this.insert(key, { ...def });

        return this.lookup<D, E>(key) || def;
    }

    private lookup<D, E>(key: string): StoreItem<D, E> | undefined {
        this.cache.lookup(key, this.destroy.bind(this));
        return this.store[key] as StoreItem<D, E>;
    }

    private destroy(key: string) {
        this.setStore(key, undefined);
    }

    insert<D, E>(key: string, item: StoreItem<D, E>): void {
        this.cache.insert(key, this.destroy.bind(this));
        this.setStore(key, item);
    }

    update<D, E>(key: string, partial: Partial<StoreItem<D, E>>): void {
        const data = partial.data;
        delete partial.data;

        batch(() => {
            // make sure to create the item before updating it
            untrack(() => this.lookupUpsert(key));

            this.setStore(key, partial);
            if (data) {
                this.setStore(key, "data", reconcile(data));
            }
        });
    }
}
