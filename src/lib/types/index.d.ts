export type CustomEventPayload<T> = {
    key: ExistentKey;
    data: T;
};

export type ExistentKey = Exclude<Key, undefined>;

export type CacheItem<T> = {
    data?: T;
    busy: boolean;
};

export type CacheImplements<Res = any> = {
    set: (key: ExistentKey, value: CacheItem<Res>) => void;
    get: (key: ExistentKey) => CacheItem<Res> | undefined;
    keys: () => ExistentKey[];
};

export type Key = string | undefined;

export type FetcherArg = {
    signal: AbortSignal;
};

export type Fetcher<T> = (key: ExistentKey, arg: FetcherArg) => Promise<T>;

export type Options<Res, Err> = {
    /**
     * The function responsible for throwing errors and returning data
     */
    fetcher?: Fetcher<Res>;

    /**
     * If cache is empty and the key changes, should we keep the old data
     * @default false
     */
    keepPreviousData?: boolean;

    /**
     * If enabled, the hook will "freeze" after the data is set
     * @default false
     */
    isImmutable?: boolean;

    /**
     * Toggle whether the hook should be enabled (you can do the same by passing in () => undefined as key),
     * useful for scenarios where you create key based on derived async data
     * @default true
     */
    isEnabled?: boolean;

    /**
     * In milliseconds, 0 is disabled
     * @default 0
     */
    refreshInterval?: number;

    /**
     * Provide your own cache implementation,
     * by default a simple in-memory LRU cache is used with 5K max items
     */
    cache?: CacheImplements<Res>;

    /**
     * Automatically revalidate when window has gotten focus
     * @default true
     */
    revalidateOnFocus?: boolean;

    /**
     * Automatically revalidate when connection came back
     * @default true
     */
    revalidateOnOnline?: boolean;

    onSuccess?: (data: Res) => void;

    onError?: (err: Err) => void;
};

export type MutationOptions = {
    /**
     * Should the hook refetch the data after the mutation?
     * If the payload is undefined it will **always** refetch
     * @default false
     */
    revalidate?: boolean;
};

export type StoreIfy<T> = {
    v: T;
};
