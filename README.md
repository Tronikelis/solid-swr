<h1 align="center">solid-swr</h1>

<div align="center">

<img src="https://img.shields.io/bundlephobia/minzip/solid-swr?style=flat-square" />
<img src="https://img.shields.io/npm/v/solid-swr?style=flat-square" />
 
</div>

<br />

# Table of contents

- [Table of contents](#table-of-contents)
- [Introduction](#introduction)
  - [Features](#features)
  - [Quick Start](#quick-start)
- [Returned values](#returned-values)
- [Options](#options)
  - [API](#api)
- [Context](#context)
  - [API](#api-1)
- [Bound mutation](#bound-mutation)
  - [Options](#options-1)
  - [API](#api-2)

# Introduction

Quote from [vercel's SWR](https://swr.vercel.app/) for react:

> The name “SWR” is derived from stale-while-revalidate, a HTTP cache invalidation strategy popularized by HTTP RFC 5861. SWR is a strategy to first return the data from cache (stale), then send the fetch request (revalidate), and finally come with the up-to-date data.
>
> With SWR, components will get a stream of data updates constantly and automatically. And the UI will be always fast and reactive.

## Features

-   Built for **solid**
-   **Fast**, **lightweight** and **reusable** data fetching
-   Built-in **cache** and request **deduplication**
-   **Real-time** experience
-   **TypeScript** ready
-   **Polling** on interval
-   Revalidation on **focus**
-   Revalidation on **network recovery**
-   **Local mutation** (Optimistic UI)

## Quick Start

Install the package

```
npm i solid-swr
```

Bare bones usage

```tsx
import useSWR from "solid-swr";

function Profile() {
    const { data, error, isLoading } = useSWR(() => "/api/user/123");

    return (
        <div>
            {isLoading() && <div class="spinner" />}
            {data()?.name}
            {error() && <p>Oh no: {error()}</p>}
        </div>
    );
}
```

# Returned values

The hook returns an object containing 3 signals and 1 function:

-   `data`: a signal that contains your response generic or undefined
-   `error`: a signal that contains your error generic or undefined
-   `isLoading`: a signal that returns a boolean
-   `mutate`: a function bound to the hook that is used for manual changes and can be used for optimistic updates

```ts
{
    data: Accessor<Res | undefined>;
    error: Accessor<Error | undefined>;
    isLoading: Accessor<boolean>;
    mutate: (payload: Res | ... 1 more ... | undefined, _mutationOptions?: MutationOptions) => Promise<...>;
}
```

# Options

The `useSWR` hook accepts options as a second parameter, the default options are shown here:

```ts
useSWR(() => "_", {
    fetcher: defaultFetcher,
    keepPreviousData: false,
    isEnabled: true,
    refreshInterval: 0,
    cache: new LRU<string, CacheItem>(5e3),
});
```

If you want to change the passed options at runtime, please use a store

The options are merged with context, [read more](#context)

## API

| Key                |                              Explain                               |                                          Default |
| :----------------- | :----------------------------------------------------------------: | -----------------------------------------------: |
| `fetcher`          |  The function responsible for throwing errors and returning data   | The native fetch which throws on >=400 responses |
| `keepPreviousData` | If cache is empty and the key changes, should we keep the old data |                                          `false` |
| `isEnabled`        |                        Is the hook enabled                         |                                           `true` |
| `cache`            |             A data source for storing fetcher results              |                           A simple in-memory LRU |

# Context

Currently the only use for the context is to provide your own default [settings](#options) for hooks

```tsx
import { SWRContext } from "solid-swr"

const yourOwnFetcher = async (x: string) => {};

function Root() {
    return (
        <SWContext.Provider value={{
            fetcher: yourOwnFetcher
        }}>
            <App />
        </SWRContext.Provider>
    )
}

```

Beware that if you nest these contexts, the hook will only get the nearest parent context,
contexts themselves don't get merged like in the original `swr` package:

```tsx
import { SWRContext } from "solid-swr"

const yourOwnFetcher = async (x: string) => {};

function Root() {
    return (
        <SWContext.Provider value={{
            fetcher: yourOwnFetcher
        }}>
            <App1 />
            <SWRContext.Provider value={{}}>
                {/** App2 here does not get the `yourOwnFetcher` */}
                <App2 />
            </SWRContext.Provider>
        </SWRContext.Provider>
    )
}

```

## API

Refer to the [options api](#api)

# Bound mutation

This refers to using the `mutate` function returned by individual hooks

Basic usage goes like this:

```tsx
import useSWR from "solid-swr";

function Profile() {
    const { data, mutate } = useSWR(() => "/api/user");

    return (
        <div>
            <h1>My name is {data().name}.</h1>
            <button
                onClick={async () => {
                    const newName = data.name.toUpperCase();

                    // await waits when revalidation of the mutate is enabled
                    // more on that later
                    await mutate({ ...data, name: newName });

                    // send a request to the API to update the data
                    await requestUpdateUsername(newName);
                }}
            >
                Uppercase my name!
            </button>
        </div>
    );
}
```

## Options

Options are passed as a second parameter to `mutate`:

```ts
mutate(x => x, {
    // here
});
```

Currently only 1 option is available:

-   `revalidate`: Should the hook refetch the data after the mutation? If the payload is undefined it will **always** refetch

## API

| Key          |                                                   Explain                                                   | Default |
| :----------- | :---------------------------------------------------------------------------------------------------------: | ------: |
| `revalidate` | Should the hook refetch the data after the mutation? If the payload is undefined it will **always** refetch | `false` |
