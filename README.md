
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
  - [Quick explanation](#quick-explanation)
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
- 😉 And much more!
- 🔥 **0** dependencies


For v4 docs [readme](https://github.com/Tronikelis/solid-swr/blob/424e295a8c8fde642be95370cf96fed04517ee49/README.md)

# Install

```
pnpm i solid-swr
```

# Quick start

```tsx
import { useSwr } from "solid-swr"

function App() {
    const { v, mutate, revalidate } = useSwr(() => "/api/user/2")

    const onClick = () => {
        mutate({name: "user2"})
        // revalidate()
    }

    return (
        <div onClick={onClick}>
            {v().isLoading}
            {v().data}
        </div>
    )
}
```

## Quick explanation

Hook returns 3 values which you can destructure:

- `v`: function that indexes into solid store
- `mutate`: basically `setStore` but scoped to the key
- `revalidate`: call fetcher again (not guaranteed to be called due to deduplication)

