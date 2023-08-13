import { Accessor, mergeProps, useContext } from "solid-js";
import { SWRContext } from "../context";
import { Options } from "..";

export default function useOptions<T>(options: Accessor<Options<T>>) {
    const context = useContext(SWRContext);
    const merged = mergeProps(context, options());
    return merged as Required<Options<T>>;
}
