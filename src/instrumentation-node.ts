/**
 * Node-runtime-only instrumentation: reports env configuration, boots
 * infrastructure dependencies. Idempotency lives in scripts/start-deps.sh.
 */
export async function register() {
  try {
    const { reportEnv } = await import("./lib/env-report");
    reportEnv();
  } catch {
    /* never block startup on reporting */
  }
  try {
    const { spawn } = await import("child_process");
    const child = spawn("bash", ["scripts/start-deps.sh"], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (err) {
    console.error("[instrumentation] failed to run start-deps:", err);
  }
}

