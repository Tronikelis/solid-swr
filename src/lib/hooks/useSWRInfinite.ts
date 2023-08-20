import { createEffect, createSignal, mergeProps, on } from "solid-js";
import { createStore } from "solid-js/store";

import { Options } from "~/types";

import useSWR from "..";

type GetKey<Res> = (index: number, prev: Res | undefined) => string | undefined;

export default function useSWRInfinite<Res = unknown, Err = unknown>(
    getKey: GetKey<Res>,
    _options: Options<Res, Err> = {}
) {
    const [index, setIndex] = createSignal(0);

    const [data, setData] = createStore<(Res | undefined)[]>([]);
    const [isLoading, setIsLoading] = createSignal(true);
    const [error, setError] = createSignal<Err | undefined>(undefined);

    createEffect(
        // now this works pretty well
        // but it loses data
        // if you set another index while swr is still fetching an older index
        // it will cleanup all effects of the older swr instance (onSuccess and all that)
        // and start the new index fetching, so basically, loses data
        on(index, index => {
            if (isLoading() && index !== 0) {
                console.warn(
                    "You have set another index while one was still loading, " +
                        "so the older index got cleaned up and the data won't be updated. " +
                        "More info at the docs (this behavior will probably be eliminated when I figure out how to do it simply :P"
                );
            }

            setIsLoading(true);

            const onSuccess = (data: Res) => {
                setData(prev => {
                    const clone = [...prev];
                    clone[index] = data;
                    return clone;
                });
            };

            const options: Options<Res, Err> = mergeProps(_options, {
                onSuccess,
            });

            // not inlining this into useSWR to remove reactivity of the key
            const key = getKey(index, data.at(-1));
            const swr = useSWR<Res, Err>(() => key, options);

            createEffect(() => {
                setIsLoading(swr.isLoading());
                setError(() => swr.error());
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
