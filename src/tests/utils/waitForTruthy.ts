import waitForMs from "./waitForMs";

export default async function waitForTruthy(getter: () => any) {
    while (!getter()) {
        await waitForMs(10);
    }
}
