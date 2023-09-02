import { dispatchCustomEvent, publishDataEvent, triggerEffectEvent } from "~/events";
import { MutationOptions } from "~/types";

import useMutationOptions from "./internal/useMutationOptions";
import useOptions from "./internal/useOptions";

export type FilterKeyFn = (key: string) => boolean;
export type Payload<Res> =
    | Res
    | ((key: string, res: Res | undefined) => Res | undefined)
    | undefined;

/**
 * The hook's behavior is the same as the bound mutation,
 * just this hook can mutate many keys at once
 */
export default function useMatchMutate<Res = unknown>() {
    const options = useOptions({});

    function revalidate(key: string, data: Res | undefined) {
        dispatchCustomEvent<Res | undefined>(triggerEffectEvent, {
            key,
            data,
        });
    }

    function mutate(
        filter: FilterKeyFn,
        payload: Payload<Res>,
        _mutationOptions: MutationOptions = {}
    ) {
        const mutationOptions = useMutationOptions(_mutationOptions);

        const keys = options.cache.keys().filter(filter);

        for (const key of keys) {
            const res = options.cache.get(key)?.data as Res | undefined;
            const fresh = payload instanceof Function ? payload(key, res) : payload;

            if (fresh === undefined) {
                revalidate(key, undefined);
                return;
            }

            options.cache.set(key, { busy: false, data: fresh });

            // sets the data to all hooks with this key
            dispatchCustomEvent<Res>(publishDataEvent, {
                key,
                data: fresh,
            });

            // eslint-disable-next-line solid/reactivity
            if (!mutationOptions.revalidate) return;

            // optionally revalidates the key
            revalidate(key, fresh);
        }
    }

    return mutate;
}
