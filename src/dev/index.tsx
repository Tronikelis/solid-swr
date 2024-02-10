import { render } from "solid-js/web";

import App from "./App";

const solidRoot = document.getElementById("solid-root") as HTMLDivElement;
render(() => <App />, solidRoot);
