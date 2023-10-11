import { Accessor, createResource } from "solid-js";

import noop from "~/utils/noop";

import useSWR from "..";

/**
 * monkey-patches the `createResource` solid hook to work with `useSWR`
 *
 * ⚠️ Note that the error passed to `ErrorBoundary` will have been `JSON.stringify'ed`, so parse its `.message`,
 * before displaying it
 */
const useSWRSuspense: typeof useSWR = (key, options) => {
    const swr = useSWR(key, options);

    let resource: undefined | Accessor<undefined>;

    if (key()) {
        let resolveResource: undefined | ((val?: never) => void);
        let rejectResource: undefined | ((val: unknown) => void);

        const [r] = createResource(() => {
            return new Promise<undefined>((res, rej) => {
                resolveResource = res;
                rejectResource = rej;
            });
        });

        // eslint-disable-next-line solid/reactivity
        resource = r;

        // not in an createEffect, because suspense disables them
        (async () => {
            await swr._effect(); // this never throws
            if (swr.error()) {
                // resource casts error into new Error(), thus needs a string
                rejectResource?.(JSON.stringify(swr.error()));
                return;
            }

            resolveResource?.();
        })().catch(noop);
    }

    const dataWithResource = () => {
        resource?.();
        return swr.data();
    };

    const errorWithResource = () => {
        resource?.();
        return swr.error();
    };

    return {
        ...swr,
        data: dataWithResource,
        error: errorWithResource,
    };
};

export default useSWRSuspense;
