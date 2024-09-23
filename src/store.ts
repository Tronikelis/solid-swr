import { batch, untrack } from "solid-js";
import { createStore, produce, reconcile, SetStoreFunction } from "solid-js/store";

import { noop } from "./utils";

export type OnTrimFn = (key: string) => void;

export type StoreCache = {
    /** item has been inserted into store */
    insert: (key: string, onTrim: OnTrimFn) => void;
    /** item has been looked up */
    lookup: (key: string, onTrim: OnTrimFn) => void;
};

export type StoreItem<D = unknown, E = unknown> = {
    data: D | undefined;
    err: E | undefined;
    isLoading: boolean;

    /** touch this only if you know what you're doing, this controls deduplication */
    _isBusy: boolean;

    /** whether this item exists in store */
    _exists: boolean;

    _onSuccess: number;
    _onError: number;
    _mountedCount: number;
};

export type SolidStore = {
    [key: string]: StoreItem | undefined;
};

const defaultCache: StoreCache = {
    insert: noop,
    lookup: noop,
};

export class Store {
    private cache: StoreCache;

    private store: SolidStore;
    private setStore: SetStoreFunction<SolidStore>;

    private boundDestroy: (key: string) => void;

    static defaultItem: StoreItem = {
        _mountedCount: 0,
        _exists: false,
        _isBusy: false,
        _onSuccess: 0,
        _onError: 0,
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

    updateDataProduce<D>(key: string, producer: (data: D) => void): void {
        batch(() => {
            untrack(() => this.makeExist(key));
            this.setStore(key, "data", produce(producer));
        });
    }

    update<D, E>(key: string, partial: Partial<StoreItem<D, E>>): void {
        const setData = "data" in partial;

        const data = partial.data;
        // let's give our thanks to the GC that will let us hold on to data above
        delete partial.data;

        batch(() => {
            untrack(() => this.makeExist(key));

            this.setStore(key, partial);
            if (setData) {
                this.setStore(key, "data", reconcile(data));
            }
        });
    }

    mount(key: string) {
        const n = untrack(() => this.lookupOrDef(key)._mountedCount + 1);
        this.update(key, { _mountedCount: n });
    }
    unmount(key: string) {
        const n = untrack(() => this.lookupOrDef(key)._mountedCount - 1);
        this.update(key, { _mountedCount: Math.max(n, 0) });
    }

    lookupOrDef<D, E>(key?: string): StoreItem<D, E> {
        const def = Store.defaultItem as StoreItem<D, E>;
        if (!key) return def;

        const already = this.lookup<D, E>(key);
        return already || def;
    }

    private lookup<D, E>(key: string): StoreItem<D, E> | undefined {
        this.cache.lookup(key, this.boundDestroy);
        return this.store[key] as StoreItem<D, E>;
    }

    private destroy(key: string) {
        this.setStore(key, undefined);
    }

    private makeExist(key: string): void {
        if (this.lookup(key)) return;
        this.cache.insert(key, this.boundDestroy);
        // have to copy here
        this.setStore(key, { ...Store.defaultItem, _exists: true });
    }
}
