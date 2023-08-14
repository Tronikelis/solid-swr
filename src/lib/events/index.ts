const prefix = "solid-swr:";

export const publishDataEvent = prefix + "publish_data";
export const publishErrorEvent = prefix + "publish_error";

export function dispatchCustomEvent<Detail = any>(
    event: typeof publishDataEvent,
    detail: Detail
) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
}
