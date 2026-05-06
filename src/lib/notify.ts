// Lightweight notify: simple alert wrapper for now.
// Can be upgraded to a toast system later without changing call sites.

export function notifyError(label: string, err: unknown) {
  const msg = err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err);
  console.error(`[${label}]`, err);
  alert(`${label}\n\n${msg}`);
}

export function notifyOk(msg: string) {
  console.info('[ok]', msg);
}
