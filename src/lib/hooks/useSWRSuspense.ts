import { createResource } from "solid-js";

import noop from "~/utils/noop";

import useSWR from "..";

/**
 * monkey-patches the `createResource` solid hook to work with `useSWR`
 */
const useSWRSuspense: typeof useSWR = (key, options) => {
    const swr = useSWR(key, options);

    let resolveResource: undefined | ((val?: never) => void);

    const [resource] = createResource(() => {
        return new Promise<undefined>(r => {
            resolveResource = r;
        });
    });

    // not in an createEffect, because suspense disables them
    (async () => {
        await swr._effect(); // this never throws
        resolveResource?.();
    })().catch(noop);

    const dataWithResource = () => {
        resource();
        return swr.data();
    };

    const errorWithResource = () => {
        resource();
        return swr.error();
    };

    return {
        ...swr,
        data: dataWithResource,
        error: errorWithResource,
    };
};

export default useSWRSuspense;
