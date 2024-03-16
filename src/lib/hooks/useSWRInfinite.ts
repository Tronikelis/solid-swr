import { createEffect, createSignal, getOwner, mergeProps, on, runWithOwner } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import { Options, StoreIfy } from "~/types";

import useSWR from "..";

type GetKey<Res> = (index: number, prev: Res | undefined) => string | undefined;

export default function useSWRInfinite<Res = unknown, Err = unknown>(
    getKey: GetKey<Res>,
    _options: Options<Res, Err> = {}
) {
    const [index, setIndex] = createSignal(0);
    const [isLoading, setIsLoading] = createSignal(true);

    const [data, setData] = createStore<StoreIfy<(Res | undefined)[]>>({ v: [] });
    const [error, setError] = createStore<StoreIfy<Err | undefined>>({ v: undefined });

    const owner = getOwner();

    createEffect(
        on(index, index => {
            // eslint-disable-next-line solid/reactivity
            runWithOwner(owner, () => {
                setIsLoading(true);

                const onSuccess = (data: Res) => {
                    setData("v", index, reconcile(data));
                };

                const options: Options<Res, Err> = mergeProps(_options, {
                    onSuccess,
                });

                // not inlining this into useSWR to remove reactivity of the key
                const key = getKey(index, data.v.at(-1));

                const swr = useSWR<Res, Err>(() => key, options);

                createEffect(() => {
                    setIsLoading(swr.isLoading());
                    setError("v", reconcile(swr.error.v));
                });
            });
        })
    );

    return {
        data,
        error,
        index,
        setIndex,
        isLoading,
    };
}
