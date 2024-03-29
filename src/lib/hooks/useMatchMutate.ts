import { dispatchCustomEvent, publishDataEvent, triggerEffectEvent } from "~/events";
import { MutationOptions } from "~/types";
import uFn from "~/utils/uFn";

import useMutationOptions from "./internal/useMutationOptions";
import useOptions from "./useOptions";

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
    const options = useOptions();

    const revalidate = (key: string, data: Res | undefined) => {
        dispatchCustomEvent<Res | undefined>(triggerEffectEvent, {
            key,
            data,
        });
    };

    const mutate = uFn(
        (
            filter: FilterKeyFn,
            payload: Payload<Res> = undefined,
            _mutationOptions: MutationOptions = {}
        ) => {
            const mutationOptions = useMutationOptions(_mutationOptions);

            const keys = options.cache.keys().filter(filter);

            for (const key of keys) {
                const res = options.cache.get(key)?.data as Res | undefined;
                const fresh = payload instanceof Function ? payload(key, res) : payload;

                if (fresh === undefined) {
                    revalidate(key, undefined);
                    continue;
                }

                options.cache.set(key, { busy: false, data: fresh });

                // sets the data to all hooks with this key
                dispatchCustomEvent<Res>(publishDataEvent, {
                    key,
                    data: fresh,
                });

                // eslint-disable-next-line solid/reactivity
                if (!mutationOptions.revalidate) continue;

                // optionally revalidates the key
                revalidate(key, fresh);
            }
        }
    );

    return mutate;
}
