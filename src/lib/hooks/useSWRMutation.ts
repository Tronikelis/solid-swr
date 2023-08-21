import { createSignal } from "solid-js";

import useMatchMutate, { FilterKeyFn, Payload } from "~/hooks/useMatchMutate";
import { MutationOptions } from "~/types";
import tryCatch from "~/utils/tryCatch";

type Fetcher<Res, Arg> = (arg: Arg) => Promise<Res>;

export default function useSWRMutation<Pld, Res = unknown, Err = unknown, Arg = unknown>(
    filter: FilterKeyFn,
    fetcher: Fetcher<Res, Arg>
) {
    const [isTriggering, setIsTriggering] = createSignal(false);
    const [error, setError] = createSignal<Err | undefined>(undefined);

    /**
     * This function propagates the thrown error from the fetcher function and sets the error signal
     */
    async function trigger(arg: Arg): Promise<Res> {
        setIsTriggering(true);
        const [err, res] = await tryCatch<Err, Res>(() => fetcher(arg));
        setIsTriggering(false);

        if (err) {
            setError(() => err);
            throw err;
        }

        return res as Res;
    }

    function populateCache(payload: Payload<Pld>, mutationOptions: MutationOptions = {}) {
        const mutate = useMatchMutate<Pld>();
        return mutate(filter, payload, mutationOptions);
    }

    return {
        isTriggering,
        trigger,
        populateCache,
        error,
    };
}
