import { mergeProps, useContext } from "solid-js";

import { SWRConfig } from "../context/config";
import { Options } from "..";

export default function useOptions<T>(options: Options<T>) {
    const context = useContext(SWRConfig);
    const merged = mergeProps(context, options);
    return merged as Required<Options<T>>;
}
