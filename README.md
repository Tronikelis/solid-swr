<h1 align="center">solid-swr</h1>

<h3 align="center">The beloved swr package ported to solid</h3>

<br />

<div align="center">

<img src="https://img.shields.io/github/stars/Tronikelis/solid-swr?style=flat-square" />
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
- [Options with context](#options-with-context)
  - [API](#api-1)
- [Mutation](#mutation)
  - [Bound mutation](#bound-mutation)
  - [Global mutation](#global-mutation)
  - [Options](#options-1)
  - [API](#api-2)
- [SSR](#ssr)
- [useSWRInfinite](#useswrinfinite)
  - [⚠️ Important note](#️-important-note)
- [useSWRMutation](#useswrmutation)
  - [API](#api-3)
- [Aborting requests](#aborting-requests)
  - [Note](#note)
- [useSWRSuspense](#useswrsuspense)
  - [Note](#note-1)

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
-   Exponential error retries
-   Suspense support with [useSWRSuspense](#useswrsuspense)

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

```ts
function useSWR<Res = unknown, Err = unknown>(key: Accessor<Key>, _options?: Options<Res, Err>): {
    data: Accessor<Res | undefined>;
    error: Accessor<Err | undefined>;
    isLoading: Accessor<boolean>;
    hasFetched: Accessor<...>;
    mutate: (payload: Res | ... 1 more ... | undefined, _mutationOptions?: MutationOptions) => Promise<...>;
    _effect: () => Promise<...>;
}
```

# Returned values

The hook returns an object containing 3 signals and 1 function:

-   `data`: a signal that contains your response generic or undefined
-   `error`: a signal that contains your error generic or undefined
-   `isLoading`: a signal that returns a boolean
-   `mutate`: a function bound to the hook that is used for manual changes and can be used for optimistic updates
-   `hasFetched` a signal that's true when the hook received some info, helps with showing dependent hook loading states

# Options

The `useSWR` hook accepts options as a second parameter, the default options are shown here:

```ts
useSWR(() => "_", {
    fetcher: defaultFetcher,
    keepPreviousData: false,
    isEnabled: true,
    isImmutable: false,
    refreshInterval: 0,
    cache: new LRU<string, CacheItem>(5e3),
    onSuccess: noop,
    onError: noop,
});
```

If you want to change the passed options at runtime, please use a store

The options are merged with context, [read more](#context)

## API

| Key                |                                     Explain                                     |                                                                                 Default |
| :----------------- | :-----------------------------------------------------------------------------: | --------------------------------------------------------------------------------------: |
| `fetcher`          |         The function responsible for throwing errors and returning data         | The native fetch which parses only json and throws the response json on >=400 responses |
| `keepPreviousData` |       If cache is empty and the key changes, should we keep the old data        |                                                                                 `false` |
| `isEnabled`        |                               Is the hook enabled                               |                                                                                  `true` |
| `cache`            |                    A data source for storing fetcher results                    |                                                                  A simple in-memory LRU |
| `onSuccess`        |   A callback that gets the data when the signal gets updated with truthy data   |                                                                                  `noop` |
| `onError`          | A callback that gets the error when the signal gets updated with a truthy error |                                                                                  `noop` |
| `isImmutable`      |            If enabled, the hook will "freeze" after the data is set             |                                                                                 `false` |

# Options with context

Provide your own default [settings](#options) for hooks

```tsx
import { SWROptionsProvider } from "solid-swr";

const yourOwnFetcher = async (x: string, { signal }: { signal?: AbortSignal }) => {};

function Root() {
    return (
        <SWROptionsProvider
            value={{
                fetcher: yourOwnFetcher,
            }}
        >
            <App />
        </SWROptionsProvider>
    );
}
```

Note: providers merge their options with the parent provider, so you can have 1 options provider at the root of your app, for example with only the fetcher, and another provider deeper in the app tree with some specific options and it will preserve the fetcher from the parent provider

## API

Refer to the [options api](#api)

# Mutation

## Bound mutation

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
                    await mutate(
                        { ...data, name: newName },
                        {
                            // this is false by default
                            revalidate: false,
                        }
                    );

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

## Global mutation

There is an exported hook `useMatchMutate` using which you can filter all keys and mutate them at once

```ts
import { useMatchMutate } from "solid-swr";

function onClickOrWhatever() {
    const mutate = useMatchMutate();
    mutate(
        // all keys
        key => true,
        // payload
        undefined,
        // settings
        { revalidate: true }
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

And as a third parameter when using `useMatchMutate`:

```ts
mutate(x => true, payload, {
    // here
});
```

Currently only 1 option is available:

-   `revalidate`: Should the hook refetch the data after the mutation? If the payload is undefined it will **always** refetch

The `mutate` util is an _async_ function, but it only actually acts as an async function if **revalidation** is enabled or the `payload` is `undefined`

## API

| Key          |                                                   Explain                                                   | Default |
| :----------- | :---------------------------------------------------------------------------------------------------------: | ------: |
| `revalidate` | Should the hook refetch the data after the mutation? If the payload is undefined it will **always** refetch | `false` |

# SSR

For SSR there is another context `SWRFallback` which as you can guess by the name let's you add fallback data for specific keys

Example usage:

```tsx
import useSWR, { SWRFallback } from "solid-js";

const key = "foo";

function Root(props: { fallback: any }) {
    return (
        <SWRFallback.Provider
            value={{
                [key]: fallback,
            }}
        >
            <App />
        </SWRFallback.Provider>
    );
}

function App() {
    const { data } = useSWR(() => key);
    console.log(data()); // "foo"
    return <></>;
}
```

# useSWRInfinite

A hook for infinite loading behavior

This is a wrapper around the normal `useSWR`, so it automatically gets all of its features

The differences between it and `useSWR` are:

-   bound mutation is removed (mutate with global mutation)
-   data is now a store, not a signal, with an array of responses

Basic usage goes like this

```tsx
import { useSWRInfinite } from "solid-swr";

function App() {
    const { data, error, index, setIndex, isLoading } = useSWRInfinite((index, prevData) => {
        if (prevData && prevData.next === false) return undefined;
        return `https://example.com?page=${index + 1}`;
    });

    return (
        <div>
            <For each={data}>{(_, item) => <div>{item}</div>}</For>
        </div>
    );
}
```

## ⚠️ Important note

This behavior will most likely be removed in a future update when I figure out a simple way to do so

If you set another index while `useSWRInfinite` is still fetching an older index it will cleanup all effects of the older swr instance (onSuccess and all that) and start the new index fetching, so basically, loses data

Example

```tsx
function App() {
    const { setIndex, data } = useSWRInfinite(/** omitted */);

    onMount(() => {
        setIndex(x => x + 1);
    });

    createEffect(() => {
        console.log([...data]);

        // []

        // [
        //     undefined (data that came from the 0 index was aborted),
        //     {... (data that came from the first index)}
        // ]
    });
}
```

To mitigate this don't set a new index when `isLoading() === true`

# useSWRMutation

A helper hook for remote mutations that wraps the global mutation hook `useMatchMutate`

Basic usage

```tsx
import useSWR, { useSWRMutation } from "solid-swr";

function App() {
    const key = () => "foo";
    const swr = useSWR(key);

    const mutation = useSWRMutation(
        k => k === key(),
        async (arg: any) => {
            return await updateUser(arg);
        }
    );

    async function onClick(arg: any) {
        try {
            const response = await mutation.trigger(arg);

            // do you want to just revalidate?
            mutation.populateCache();

            // or do optimistic updates ?
            // current is useSWR data
            mutation.populateCache((key, current) => {
                if (current === undefined) {
                    // ...
                    return;
                }

                const clone = { ...current };
                clone.foo = response.foo;
                return clone;
            });
        } catch (err) {
            // handle error
            // or don't, the mutation.error() is there
        }
    }

    return (
        <div>
            {swr.data()}
            {mutation.isTriggering()}
            {mutation.error()}
        </div>
    );
}
```

The `populateCache` returned method is just a wrapper for the global `useMatchMutate` hook, read up on it [here](#global-mutation)

## API

```ts
function useSWRMutation<Pld, Res = unknown, Err = unknown, Arg = unknown>(
    filter: FilterKeyFn,
    fetcher: Fetcher<Res, Arg>
): {
    isTriggering: Accessor<boolean>;
    trigger: (arg: Arg) => Promise<Res>;
    populateCache: (payload: Payload<Pld>, mutationOptions?: MutationOptions) => void;
    error: Accessor<Err | undefined>;
};
```

# Aborting requests

The core `useSWR` fetcher always gets an `AbortSignal` which will abort the older request if a new one comes in

The default fetcher utilizes this mechanic

The signal is passed to the fetcher as the second parameter in an object:

```ts
const fetcher = async (key: string, { signal }: { signal?: AbortSignal }) => {
    return await fetch("...", { signal });
};
```

## Note

The signal is only passed in the core effect of `swr`, not in mutations

So bound mutate and `useSWRMutation` don't get a signal, thus don't get aborted

# useSWRSuspense

This hook is a wrapper around the usual `useSWR`, but it monkey-patches the `createResource` api
from solid that triggers suspense

## Note

It only triggers suspense if the key is truthy, if it is dependent on something else and returns undefined,
suspense won't be triggered and it will act the same way as `useSWR`
