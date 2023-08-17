import { mergeProps } from "solid-js";

import { MutationOptions } from "../types";

export default function useMutationOptions(_mutationOptions: MutationOptions) {
    const mutationOptions: MutationOptions = mergeProps(
        { revalidate: false },
        _mutationOptions
    );

    return mutationOptions;
}
