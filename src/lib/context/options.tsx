import { createContext, JSX } from "solid-js";

import useOptions from "~/hooks/useOptions";
import { Options } from "~/types";

export const OptionsContext = createContext<Options<unknown, unknown>>({});

type SWROptionsProps<Res, Err> = {
    children: JSX.Element;
    value: Options<Res, Err>;
};

export function SWROptionsProvider<Res = unknown, Err = unknown>(
    props: SWROptionsProps<Res, Err>
) {
    // eslint-disable-next-line solid/reactivity
    const value = useOptions(props.value as Options<unknown, unknown>);
    return <OptionsContext.Provider value={value}>{props.children}</OptionsContext.Provider>;
}
