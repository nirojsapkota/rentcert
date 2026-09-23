// The worker runs server modules outside Next.js. "server-only" throws unless it is loaded under
// the react-server condition, so resolve it to an empty module here.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: new URL("./empty-module.mjs", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
