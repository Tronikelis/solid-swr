export const publishDataEvent = "solid-swr:publish_data";

export function dispatchCustomEvent<Detail = any>(
    event: typeof publishDataEvent,
    detail: Detail
) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
}
