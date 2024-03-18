import { CustomEventPayload } from "~/types";

const prefix = "solid-swr:";

export const publishDataEvent = prefix + "publish_data";
export const publishErrorEvent = prefix + "publish_error";
export const triggerEffectEvent = prefix + "trigger_effect";
export const setIsLoadingEvent = prefix + "set_is_loading";

export function dispatchCustomEvent<Data = unknown>(
    event: string,
    detail: CustomEventPayload<Data>
) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
}
