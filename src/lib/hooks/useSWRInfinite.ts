import { createEffect, createSignal, mergeProps, on } from "solid-js";

import { Options } from "~/types";

import useSWR from "..";

type GetKey<Res> = (index: number, prev: Res | undefined) => string;

export default function useSWRInfinite<Res = unknown, Err = unknown>(
    getKey: GetKey<Res>,
    _options: Options<Res, Err> = {}
) {
    const [index, setIndex] = createSignal(0);

    const [data, setData] = createSignal<(Res | undefined)[]>([]);
    const [isLoading, setIsLoading] = createSignal(true);
    const [error, setError] = createSignal<Err | undefined>(undefined);

    createEffect(
        // this might be (pretty sure actually is) a gc nightmare lmao
        on(index, index => {
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
            const key = getKey(index, data().at(-1));

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
