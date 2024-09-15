import { batch, untrack } from "solid-js";
import { createStore, reconcile, SetStoreFunction } from "solid-js/store";

export type StoreHooks = {
    /** references are passed to concrete solid store property */
    onLookup: (key: string, item: StoreItem) => StoreItem | undefined;
    /** references are passed to concrete solid store property */
    onUpdate: (key: string, wit: Partial<StoreItem>) => Partial<StoreItem> | undefined;
    onInsert: (key: string, item: StoreItem) => StoreItem | undefined;
};

export type StoreItem<D = unknown, E = unknown> = {
    data: D | undefined;
    err: E | undefined;

    isLoading: boolean;
    isBusy: boolean;
    mounted: number;
};

type SolidStore = {
    [key: string]: StoreItem | undefined;
};

const defaultHooks: StoreHooks = {
    onUpdate: (_, item) => item,
    onLookup: (_, item) => item,
    onInsert: (_, item) => item,
};

export default class Store {
    private hooks: StoreHooks;

    private store: SolidStore;
    private setStore: SetStoreFunction<SolidStore>;

    static defaultItem: StoreItem = {
        mounted: 0,
        isLoading: false,
        isBusy: false,
        err: undefined,
        data: undefined,
    };

    constructor(hooks: Partial<StoreHooks> = {}) {
        this.hooks = { ...defaultHooks, ...hooks };

        const [store, setStore] = createStore({});
        // eslint-disable-next-line solid/reactivity
        this.store = store;
        this.setStore = setStore;
    }

    // private remove(key: string): void {
    //     this.setStore(key, undefined);
    // }

    private removeData(key: string): void {
        if (untrack(() => !this.store[key])) return;

        batch(() => {
            this.setStore(key, "data", undefined);
            this.setStore(key, "err", undefined);
        });
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
        return def;
    }

    lookup<D, E>(key: string): StoreItem<D, E> | undefined {
        let item = this.store[key] as StoreItem<D, E>;
        item = this.hooks.onLookup(key, item) as StoreItem<D, E>;

        if (!item) {
            this.removeData(key);
            return;
        }

        return item;
    }

    insert<D, E>(key: string, item: StoreItem<D, E>): void {
        item = this.hooks.onInsert(key, item) as StoreItem<D, E>;
        if (!item) {
            this.removeData(key);
            return;
        }

        this.setStore(key, item);
    }

    update<D, E>(key: string, partial: Partial<StoreItem<D, E>>): void {
        const wit = this.hooks.onUpdate(key, partial);
        if (wit) {
            const data = wit.data;
            delete wit.data;

            batch(() => {
                this.lookupUpsert(key);

                this.setStore(key, wit);
                if (data) {
                    this.setStore(key, "data", reconcile(data));
                }
            });
        }
    }
}
