import { dispatchCustomEvent, publishDataEvent } from "../events";
import { CustomEventPayload } from "../types";

import useOptions from "./useOptions";

type FilterKeyFn = (key: string) => boolean;

export default function useMatchMutate<Res = unknown>() {
    const options = useOptions({});

    function mutate(filter: FilterKeyFn, payload: Res | ((key: string) => Res)) {
        const keys = options.cache.keys().filter(filter);

        for (const key of keys) {
            const fresh = payload instanceof Function ? payload(key) : payload;

            options.cache.set(key, { busy: false, data: fresh });
            dispatchCustomEvent(publishDataEvent, {
                key,
                data: fresh,
            } satisfies CustomEventPayload<Res>);
        }
    }

    return mutate;
}
