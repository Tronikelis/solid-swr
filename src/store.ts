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
    /** touch this only if you know what you're doing, this controls deduplication */
    _isBusy: boolean;
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

    private boundDestroy: (key: string) => void;

    static defaultItem: StoreItem = {
        _isBusy: false,
        isLoading: false,
        err: undefined,
        data: undefined,
    };

    constructor(cache?: StoreCache) {
        this.boundDestroy = this.destroy.bind(this);

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
        this.cache.lookup(key, this.boundDestroy);
        return this.store[key] as StoreItem<D, E>;
    }

    private destroy(key: string) {
        this.setStore(key, undefined);
    }

    insert<D, E>(key: string, item: StoreItem<D, E>): void {
        this.cache.insert(key, this.boundDestroy);
        this.setStore(key, item);
    }

    updateDataProduce<D>(key: string, producer: (data: D) => void): void {
        untrack(() => this.lookupUpsert(key));
        this.setStore(key, "data", produce(producer));
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
