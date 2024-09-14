import { batch, untrack } from "solid-js";
import { createStore, reconcile, SetStoreFunction } from "solid-js/store";

type StoreHooks = {
    /* references are passed */
    onLookup: (key: string, item: StoreItem) => StoreItem | undefined;
    /* references are passed */
    onUpdate: (
        key: string,
        item: StoreItem,
        wit: Partial<StoreItem>
    ) => Partial<StoreItem> | undefined;
    onInsert: (key: string, item: StoreItem) => StoreItem | undefined;
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
    onUpdate: (_, __, wit) => wit,
    onLookup: (_, item) => item,
    onInsert: (_, item) => item,
};

export default class Store {
    private hooks: StoreHooks;
    private solidStore: [SolidStore, SetStoreFunction<SolidStore>];

    constructor(hooks: Partial<StoreHooks> = {}) {
        this.hooks = { ...defaultHooks, ...hooks };
        this.solidStore = createStore();
    }

    private remove(key: string): void {
        this.solidStore[1](key, undefined);
    }

    keys(): string[] {
        return untrack(() => Object.keys(this.solidStore[0]));
    }

    lookup<D, E>(key: string): StoreItem<D, E> | undefined {
        let item = this.solidStore[0][key] as StoreItem<D, E>;
        item = this.hooks.onLookup(key, item) as StoreItem<D, E>;

        if (!item) {
            this.remove(key);
            return;
        }

        return item;
    }

    insert<D, E>(key: string, item: StoreItem<D, E>): void {
        item = this.hooks.onInsert(key, item) as StoreItem<D, E>;
        if (!item) {
            this.remove(key);
            return;
        }

        this.solidStore[1](key, item);
    }

    update<D, E>(key: string, partial: Partial<StoreItem<D, E>>): void {
        const item = this.lookup(key);
        if (!item) return;

        const wit = this.hooks.onUpdate(key, item, partial);
        if (wit) {
            const data = wit.data;
            delete wit.data;

            batch(() => {
                this.solidStore[1](key, wit);
                if (data) {
                    this.solidStore[1](key, "data", reconcile(data));
                }
            });
        }
    }
}
