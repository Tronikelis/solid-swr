import { createSignal } from "solid-js";

import useMatchMutate, { FilterKeyFn, Payload } from "~/hooks/useMatchMutate";
import { MutationOptions } from "~/types";
import tryCatch from "~/utils/tryCatch";
import uFn from "~/utils/uFn";

type Fetcher<Res, Arg> = (arg: Arg) => Promise<Res>;

export default function useSWRMutation<Pld, Res = unknown, Err = unknown, Arg = unknown>(
    filter: FilterKeyFn,
    fetcher: Fetcher<Res, Arg>
) {
    const [isTriggering, setIsTriggering] = createSignal(false);
    const [error, setError] = createSignal<Err | undefined>(undefined);

    const mutate = useMatchMutate<Pld>();

    /**
     * This function propagates the thrown error from the fetcher function and sets the error signal
     */
    const trigger = uFn(async (arg: Arg): Promise<Res> => {
        setError(undefined);

        setIsTriggering(true);
        const [err, res] = await tryCatch<Err, Res>(() => fetcher(arg));
        setIsTriggering(false);

        if (err) {
            setError(() => err);
            throw err;
        }

        return res as Res;
    });

    const populateCache = uFn(
        (payload?: Payload<Pld>, mutationOptions: MutationOptions = {}) => {
            return mutate(filter, payload, mutationOptions);
        }
    );

    return {
        isTriggering,
        trigger,
        populateCache,
        error,
    };
}
