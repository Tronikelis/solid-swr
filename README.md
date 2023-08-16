<h1 align="center">solidjs-swr</h1>

<div align="center">

<img src="https://img.shields.io/bundlephobia/minzip/solid-swr?style=flat-square" />
<img src="https://img.shields.io/npm/v/solid-swr?style=flat-square" />
 
</div>

<br />

## Note

npm package currently is WIP and is not ready for production use

## Introduction

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

```tsx
import useSWR from "solidjs-swr";

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
