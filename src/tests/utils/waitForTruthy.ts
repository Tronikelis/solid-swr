export default async function waitForTruthy(getter: () => any) {
    while (!getter()) {
        await new Promise(r => setTimeout(r, 100));
    }
}
