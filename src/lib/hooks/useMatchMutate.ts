import { dispatchCustomEvent, publishDataEvent, triggerEffectEvent } from "../events";
import { MutationOptions } from "../types";

import useMutationOptions from "./useMutationOptions";
import useOptions from "./useOptions";

type FilterKeyFn = (key: string) => boolean;

export default function useMatchMutate<Res = unknown>() {
    const options = useOptions({});

    function mutate(
        filter: FilterKeyFn,
        payload: Res | ((key: string) => Res),
        _mutationOptions: MutationOptions = {}
    ) {
        const mutationOptions = useMutationOptions(_mutationOptions);

        const keys = options.cache.keys().filter(filter);

        for (const key of keys) {
            const fresh = payload instanceof Function ? payload(key) : payload;

            options.cache.set(key, { busy: false, data: fresh });

            // sets the data to all hooks with this key
            dispatchCustomEvent<Res>(publishDataEvent, {
                key,
                data: fresh,
            });

            // eslint-disable-next-line solid/reactivity
            if (!mutationOptions.revalidate) return;

            // optionally revalidates the key
            dispatchCustomEvent<undefined>(triggerEffectEvent, {
                key,
                data: undefined,
            });
        }
    }

    return mutate;
}
