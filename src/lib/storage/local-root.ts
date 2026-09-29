import "server-only";
import path from "node:path";

// Resolves the directory used by the local storage driver.
// - Absolute STORAGE_LOCAL_DIR values (e.g. a mounted volume) are used as-is.
// - Relative values are resolved inside the project's ./storage folder. Keeping the
//   `process.cwd()` join statically scoped to "storage" lets Next.js' file tracer avoid
//   pulling the whole project into the server bundle.
export function resolveLocalStorageRoot(configured: string) {
  if (path.isAbsolute(configured)) return configured;
  const relative = configured.replace(/^\.\//, "").replace(/^storage\/?/, "");
  return path.join(process.cwd(), "storage", relative);
}
