
<h1 align="center">solid-swr</h1>

<h3 align="center">Swr ideaology brought to solid</h3>

<div align="center">
    <img src="https://img.shields.io/github/stars/Tronikelis/solid-swr?style=flat-square" />
    <img src="https://img.shields.io/bundlephobia/minzip/solid-swr?style=flat-square" />
    <img src="https://img.shields.io/npm/v/solid-swr?style=flat-square" />
</div>

<br />

<!--toc:start-->
- [Introduction](#introduction)
- [Features](#features)
- [Install](#install)
- [Quick start](#quick-start)
  - [Explanation](#explanation)
- [Ideaology](#ideaology)
  - [The "key"](#the-key)
  - [Solid store as a source of truth](#solid-store-as-a-source-of-truth)
  - [Behavior can be customized through public core APIs](#behavior-can-be-customized-through-public-core-apis)
- [Core](#core)
  - [Store](#store)
    - [Cache](#cache)
    - [Mutating](#mutating)
  - [createRevalidator](#createrevalidator)
  - [createMutator](#createmutator)
  - [useSwr](#useswr)
<!--toc:end-->

# Introduction

Quote from [vercel's SWR](https://swr.vercel.app/) for react:

> The name “SWR” is derived from stale-while-revalidate, a HTTP cache invalidation strategy popularized by HTTP RFC 5861. SWR is a strategy to first return the data from cache (stale), then send the fetch request (revalidate), and finally come with the up-to-date data.
>
> With SWR, components will get a stream of data updates constantly and automatically. And the UI will be always fast and reactive.

# Features

- 💙 Built for **solid**
- ⚡ Blazingly **fast** with **reconciled** solid stores and zero* extra hook allocation
- ♻️ **Reusable** and **lightweight** data fetching
- 📦 Optional built-in **cache** and request **deduplication**
- 🔄 **Local mutation** (optimistic UI)
- 🔥 **0** dependencies
- 😉 And much more!


For v4 docs [readme](https://github.com/Tronikelis/solid-swr/blob/424e295a8c8fde642be95370cf96fed04517ee49/README.md)

# Install

```
pnpm i solid-swr
```

# Quick start

```tsx
import { useSwr, SwrProvider, Store } from "solid-swr"
import { LRU } from "solid-swr/cache"

function App() {
    const { v, mutate, revalidate } = useSwr(() => "/api/user/2")

    const onClick = () => {
        mutate({ name: "user2" })
        // if you need to revalidate
        revalidate()
    }

    return (
        <div onClick={onClick}>
            {v().isLoading}
            {v().data}
        </div>
    )
}

function Root(props) {
    return (
        <SwrProvider value={{ store: new Store(new LRU()) }}>
            {props.children}
        </SwrProvider>
    )
}
```

## Explanation

Hook returns 3 values which you can destructure:

- `v`: function that indexes into solid store
- `mutate`: basically `setStore` but scoped to the key
- `revalidate`: call fetcher again (not guaranteed to be called due to deduplication)

# Ideaology

Here I want to share some context about the ideaology of this library and swr in general

## The "key"

The key is a `string` which is used as an ID into some server side state

```ts
const key = "api/user/id"
useSwr(() => key)
```

The key is almost always used as a url to a backend resource

## Solid store as a source of truth

Everything is stored in a solid store, i.e. isLoading, data, err, etc...
All hooks / utilities, talk to a single object through a `Store` interface

This way, solid handles the syncing of changes to listeners,
thus:

1. we avoid implementing syncing *cough* *cough* `solid-swr@v4`
2. we avoid duplicating large amounts of js objects, again *cough* *cough* `solid-swr@v4`
3. And most importantly, this gives us `O(1)` time complexity to call `useSwr`

<details>
    <summary>Simple graph explaining what I've said</summary>
    <img src="https://github.com/user-attachments/assets/73bfc7ce-c466-4efd-a037-753d5c1816f0">
</details>

## Behavior can be customized through public core APIs

In v5, `useSwr` is a **core** hook, meaning that it is simple and *meant* to be extended

In fact, `useSwr` is just a simple function that uses other public apis:

- `createRevalidator`
- `createMutator`

An excerpt from `useSwr` as of the time I'm writing this

```ts
const runWithKey = <T extends (k: string) => any>(fn: T): ReturnType<T> | undefined => {
    const k = key();
    if (!k) return;
    return fn(k);
};

const revalidator = createRevalidator(() => ctx.store);
const mutator = createMutator(() => ctx.store);

// as you can see, revalidate is just a convenience method to call revalidtor
const revalidate = () => runWithKey(k => revalidator<D, E>(k));
// mutate is exactly the same
const mutate = (payload: Mutator<D>) => runWithKey(k => mutator<D, E>(k, payload));
```

If you at any time need a revalidator, or a mutator, just use `createRevalidator` or `createMutator`,
or create new abstractions with these 2, just like pretty much all hooks in this lib

# Core

This is the most important part of the library which contains all core utilities
for you to manage server side state with swr

## Store

This is by far **THE** most important part of the library

The store is a solid.js hashmap with the key `string` as the key

```ts
export type SolidStore = {
    [key: string]: StoreItem | undefined;
};
```

Each item in the store contains these properties:

- `data`: a generic value
- `err`: a generic value
- `isLoading`: a boolean

For more info I suggest you looking at the `src/store.ts` everything is there

### Cache

A separate user-provided cache is used to remove items from the store

Connect your cache with the store like so:

```ts
export type StoreCache = {
    /** item has been inserted into store */
    insert: (key: string, onTrim: OnTrimFn) => void;
    /** item has been looked up */
    lookup: (key: string, onTrim: OnTrimFn) => void;
};

```

```ts
const store = new Store({
    lookup: (key, onTrim) => lru.get(key),
    insert: (key, onTrim) => lru.set(key, true, onTrim)
})
```

`solid-swr` provides this behavior ootb


```ts
import { LRU, createCache } from "solid-swr/cache"

new Store(createCache(new LRU()))
```

The `onTrim` is how the store connects to the cache,
call `onTrim(key)` to remove a key from the solid store

In the case above when `lru` tries to set a key it will trim the cache,
thus removing (if needed) a key


### Mutating

TODO docs

## createRevalidator

```ts
import { createRevalidator } from "solid-swr"
```

Create a function that revalidates (calls fetcher) a key

This function also deduplicates requests, so when you call it, the actual fetcher call
is not guaranteed

## createMutator

```ts
import { createMutator } from "solid-swr"
```

Create a function that can change any key in the store

## useSwr

```ts
import { useSwr } from "solid-swr"
```

Hook that uses `createRevalidator` and `createMutator` to create the swr behavior
that we all love

Returns:

- `mutate`: `createMutator` scoped to a key
- `revalidate`: `createRevalidator` scoped to a key
- `v`: a function that indexes into a solid store
