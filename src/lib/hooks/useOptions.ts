import { mergeProps, useContext } from "solid-js";

import { SWRContext } from "../context";
import { Options } from "..";

export default function useOptions<T>(options: Options<T>) {
    const context = useContext(SWRContext);
    const merged = mergeProps(context, options);
    return merged as Required<Options<T>>;
}
