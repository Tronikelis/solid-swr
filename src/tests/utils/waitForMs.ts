export default async function waitForMs(ms = 100) {
    await new Promise(r => setTimeout(r, ms));
}
