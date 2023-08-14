export default async function waitForTruthy(getter: () => any) {
    while (getter() === undefined) {
        await new Promise(r => setTimeout(r, 100));
    }
}
