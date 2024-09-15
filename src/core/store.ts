import { batch, untrack } from "solid-js";
import { createStore, reconcile, SetStoreFunction } from "solid-js/store";

type StoreHooks = {
    /* references are passed */
    onLookup: ((key: string, item: StoreItem) => StoreItem | undefined)[];

    /* references are passed */
    onUpdate: ((
        key: string,
        item: StoreItem,
        wit: Partial<StoreItem>
    ) => Partial<StoreItem> | undefined)[];

    onInsert: ((key: string, item: StoreItem) => StoreItem | undefined)[];
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

const defaultHooks: StoreHooks = {
    onUpdate: [],
    onLookup: [],
    onInsert: [],
};

export default class Store {
    private hooks: StoreHooks;

    private store: SolidStore;
    private setStore: SetStoreFunction<SolidStore>;

    constructor(hooks: Partial<StoreHooks> = {}) {
        this.hooks = { ...defaultHooks, ...hooks };

        const [store, setStore] = createStore({});
        // eslint-disable-next-line solid/reactivity
        this.store = store;
        this.setStore = setStore;
    }

    private remove(key: string): void {
        this.setStore(key, undefined);
    }

    keys(): string[] {
        return untrack(() => Object.keys(this.store));
    }

    lookup<D, E>(key: string): StoreItem<D, E> | undefined {
        let item = this.store[key] as StoreItem<D, E> | undefined;

        for (let i = 0; i < this.hooks.onLookup.length; i++) {
            if (!item) {
                this.remove(key);
                return;
            }

            item = this.hooks.onLookup[i]!(key, item) as StoreItem<D, E> | undefined;
        }

        return item;
    }

    insert<D, E>(key: string, item: StoreItem<D, E>): void {
        let maybeItem = item as StoreItem<D, E> | undefined;

        for (let i = 0; i < this.hooks.onInsert.length; i++) {
            if (!maybeItem) {
                this.remove(key);
                return;
            }

            maybeItem = this.hooks.onInsert[i]!(key, maybeItem) as StoreItem<D, E> | undefined;
        }

        this.setStore(key, maybeItem);
    }

    update<D, E>(key: string, partial: Partial<StoreItem<D, E>>): void {
        const item = this.lookup(key);
        if (!item) return;

        let wit: Partial<StoreItem> | undefined = partial;

        for (let i = 0; i < this.hooks.onUpdate.length; i++) {
            if (!item || !wit) return;
            wit = this.hooks.onUpdate[i]!(key, item, wit);
        }

        const data = wit!.data;
        delete wit!.data;

        batch(() => {
            this.setStore(key, wit);
            if (data) {
                this.setStore(key, "data", reconcile(data));
            }
        });
    }
}
