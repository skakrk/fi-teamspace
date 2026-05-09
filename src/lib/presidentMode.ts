// President Mode helpers
//
// Per-record activity model:
//   filled_by = user_id  -> owner-filled (active for this entity)
//   filled_by != user_id -> proxy-filled (by president)
//   record missing       -> proxy-candidate

export type FilledRecord = {
  user_id: string;
  filled_by: string | null;
};

export const isOwnerFilled = (r: FilledRecord | null | undefined): boolean =>
  !!r && r.filled_by === r.user_id;

export const isProxyFilled = (r: FilledRecord | null | undefined): boolean =>
  !!r && r.filled_by !== null && r.filled_by !== r.user_id;

// True when a president is allowed to take over this slot:
// either it's empty, or someone else (or a previous proxy) filled it.
export const canProxy = (r: FilledRecord | null | undefined): boolean =>
  !r || !isOwnerFilled(r);

// Stamps payload with filled_by = current user id (the actual writer).
// RLS on every per-user table enforces filled_by = auth.uid(), so this
// is the single source of truth for who actually wrote the record.
export function withFilledBy<T extends object>(
  payload: T,
  currentUserId: string,
): T & { filled_by: string } {
  return { ...payload, filled_by: currentUserId };
}
