const origin = process.env.E2E_BASE_URL || "http://localhost:3000";
let ready = false;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) {
  console.error("Application did not become ready.");
  process.exitCode = 1;
}
