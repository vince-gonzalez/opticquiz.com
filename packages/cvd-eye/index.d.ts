/**
 * Inject the OpticQuiz colorblind-correction eye widget into the page.
 * Idempotent (safe to call once), and a no-op during server-side rendering.
 * Call it in the browser — e.g. in a React effect, or on script load.
 */
export function mount(): void;
