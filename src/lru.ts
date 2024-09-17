type Node<V> = {
    value: V;
    next?: Node<V>;
    prev?: Node<V>;
};

type OnTrim<K> = (key: K) => void;

export class LRU<K, V> {
    private lookup: Map<K, Node<V>>;
    private reverseLookup: Map<Node<V>, K>;
    private capacity: number;
    private length: number;
    private head?: Node<V>;
    private tail?: Node<V>;

    constructor(capacity = 500) {
        this.capacity = capacity;

        this.lookup = new Map();
        this.reverseLookup = new Map();

        this.length = 0;
        this.head = undefined;
        this.tail = undefined;
    }

    /** if the value is an object this returns a direct reference */
    get(key: K): V | undefined {
        const node = this.lookup.get(key);
        if (!node) return undefined;

        this.detach(node);
        this.prepend(node);

        return node.value;
    }

    set(key: K, value: V, onTrim?: OnTrim<K>): void {
        let node = this.lookup.get(key);
        if (!node) {
            node = { value };
            this.length++;

            this.prepend(node);
            this.trimCache(onTrim);

            this.lookup.set(key, node);
            this.reverseLookup.set(node, key);
        } else {
            this.detach(node);
            this.prepend(node);
            node.value = value;
        }
    }

    keys(): K[] {
        return Array.from(this.lookup.keys());
    }

    private trimCache(onTrim?: OnTrim<K>): void {
        if (this.length <= this.capacity) return;

        const tail = this.tail as Node<V>;
        this.detach(tail);

        const key = this.reverseLookup.get(tail) as K;
        this.lookup.delete(key);
        this.reverseLookup.delete(tail);

        onTrim?.(key);
    }

    private detach(node: Node<V>): void {
        if (node.prev) {
            node.prev.next = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }

        if (this.head === node) {
            this.head = this.head.next;
        }

        if (this.tail === node) {
            this.tail = this.tail.prev;
        }

        node.next = undefined;
        node.prev = undefined;
    }

    private prepend(node: Node<V>): void {
        if (!this.head) {
            this.head = node;
            this.tail = node;
            return;
        }

        node.next = this.head;
        this.head.prev = node;
        this.head = node;
    }
}
