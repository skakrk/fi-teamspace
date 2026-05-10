import { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Briefcase, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  supabase,
  type DbPresidentChecklist,
  type DbSprint,
} from '@/lib/supabase';
import { PRESIDENT_RESPONSIBILITIES } from '@/components/shared/PresidentRole';
import { notifyError } from '@/lib/notify';

const COLLAPSED_KEY = 'fi-teamspace:presidentChecklist:collapsed';

export function PresidentChecklist({
  sprint,
  currentUserId,
}: {
  sprint: DbSprint | null;
  currentUserId: string;
}) {
  const [items, setItems] = useState<DbPresidentChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSprints, setAllSprints] = useState<DbSprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(sprint?.id ?? null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Load full sprint list once for the switcher.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('sprints')
        .select('*')
        .order('week_number', { ascending: true });
      if (!alive) return;
      const list = (data as DbSprint[]) || [];
      setAllSprints(list);
      // If parent never passed a sprint, fall back to current → latest
      if (!selectedSprintId) {
        const cur = list.find((s) => s.is_current) ?? list[list.length - 1] ?? null;
        if (cur) setSelectedSprintId(cur.id);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep our selection in sync with the parent's "current sprint" — but only
  // until the user explicitly picks something else (parent prop changes).
  useEffect(() => {
    if (sprint?.id && !selectedSprintId) setSelectedSprintId(sprint.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprint?.id]);

  const selectedSprint = useMemo(
    () => allSprints.find((s) => s.id === selectedSprintId) ?? sprint ?? null,
    [allSprints, selectedSprintId, sprint],
  );

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* localStorage may be blocked — ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!selectedSprint) {
      setItems([]);
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('president_checklist')
        .select('*')
        .eq('sprint_id', selectedSprint.id);
      if (!alive) return;
      if (error) {
        notifyError('Could not load president checklist', error);
        setItems([]);
      } else {
        setItems((data as DbPresidentChecklist[]) || []);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [selectedSprint?.id]);

  async function toggle(itemCode: string) {
    if (!selectedSprint) return;
    const existing = items.find((i) => i.item_code === itemCode);
    const nextDone = !(existing?.done ?? false);
    // Optimistic update
    const optimistic: DbPresidentChecklist = {
      sprint_id: selectedSprint.id,
      item_code: itemCode,
      done: nextDone,
      done_at: nextDone ? new Date().toISOString() : null,
      done_by: nextDone ? currentUserId : null,
    };
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.item_code === itemCode);
      if (idx === -1) return [...prev, optimistic];
      const copy = [...prev];
      copy[idx] = optimistic;
      return copy;
    });
    const { error } = await supabase.from('president_checklist').upsert(
      {
        sprint_id: selectedSprint.id,
        item_code: itemCode,
        done: nextDone,
        done_at: nextDone ? new Date().toISOString() : null,
        // RLS requires done_by = auth.uid() — always stamp current user
        done_by: currentUserId,
      },
      { onConflict: 'sprint_id,item_code' },
    );
    if (error) {
      notifyError('Could not save checklist', error);
      // Roll back on error
      setItems((prev) =>
        existing
          ? prev.map((i) => (i.item_code === itemCode ? existing : i))
          : prev.filter((i) => i.item_code !== itemCode),
      );
    }
  }

  // FI Working Group meetings (and therefore president duties) start in W2.
  // W0 (Onboarding) and W1 (Accelerator Kickoff) precede them — no checklist.
  const isPreWorkingGroup = (selectedSprint?.week_number ?? 99) < 2;
  const total = PRESIDENT_RESPONSIBILITIES.length;
  const doneCount = PRESIDENT_RESPONSIBILITIES.filter((r) =>
    items.find((i) => i.item_code === r.code && i.done),
  ).length;
  // Sort sprints newest first so the dropdown's most-recent options surface
  const sprintsForPicker = useMemo(
    () => [...allSprints].sort((a, b) => b.week_number - a.week_number),
    [allSprints],
  );

  return (
    <Card className="border-primary/40 bg-bubble/30">
      <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Briefcase size={18} className="text-primary-deep" /> President checklist
        </CardTitle>
        <div className="flex items-center gap-3 flex-wrap">
          {sprintsForPicker.length > 0 ? (
            <SprintPicker
              sprints={sprintsForPicker}
              value={selectedSprintId}
              onChange={setSelectedSprintId}
            />
          ) : (
            <span className="text-xs text-muted">No sprint</span>
          )}
          {isPreWorkingGroup ? (
            <span className="text-xs text-muted italic">no duties</span>
          ) : (
            <span className="text-xs text-muted">
              <strong className="text-ink">{doneCount}</strong> / {total} done
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-xs text-muted hover:text-ink inline-flex items-center gap-1"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardBody>
          {!selectedSprint ? (
            <p className="text-sm text-muted">
              No active sprint — start one in <a className="text-primary-dark hover:underline" href="#/sprints">Sprints</a> to track checklist progress.
            </p>
          ) : isPreWorkingGroup ? (
            <p className="text-sm text-muted">
              Working Group meetings haven't started yet — no president duties for{' '}
              <strong className="text-ink">{selectedSprint.name}</strong>. The checklist
              becomes active from W2 onwards.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {PRESIDENT_RESPONSIBILITIES.map((r, i) => {
                const item = items.find((x) => x.item_code === r.code);
                const isDone = !!item?.done;
                return (
                  <li key={r.code}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => toggle(r.code)}
                      className={
                        'w-full flex items-start gap-2 text-left rounded-md px-2 py-1.5 transition-colors hover:bg-white/60 disabled:opacity-60 disabled:cursor-wait'
                      }
                    >
                      <span
                        className={
                          'w-5 h-5 rounded-md grid place-items-center flex-shrink-0 mt-0.5 border transition-colors ' +
                          (isDone
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white border-border text-muted')
                        }
                        aria-hidden
                      >
                        {isDone ? <Check size={12} /> : <span className="text-[10px] font-semibold">{i + 1}</span>}
                      </span>
                      <span className={isDone ? 'line-through text-muted' : ''}>{r.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      )}
    </Card>
  );
}

function SprintPicker({
  sprints,
  value,
  onChange,
}: {
  sprints: DbSprint[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = sprints.find((s) => s.id === value) ?? null;
  const label = selected
    ? `W${selected.week_number} · ${selected.name}${selected.is_current ? ' (current)' : ''}`
    : 'Choose sprint';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-between gap-2 h-8 rounded-lg border border-border bg-white text-ink font-medium px-3 text-xs hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-colors min-w-[200px]"
          aria-label="Choose sprint"
        >
          <span className="truncate">{label}</span>
          <ChevronDown size={12} className="text-muted shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 max-h-80 overflow-auto bg-surface border border-border rounded-xl shadow-pop p-1 animate-in fade-in-0 zoom-in-95"
        >
          {sprints.map((s) => {
            const isSel = s.id === value;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                className={
                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md text-xs transition-colors ' +
                  (isSel
                    ? 'bg-bubble text-primary-deep font-semibold'
                    : 'text-ink hover:bg-bg')
                }
              >
                <span className="w-5 shrink-0">
                  {isSel && <Check size={12} className="text-primary-deep" />}
                </span>
                <span className="truncate">
                  W{s.week_number} · {s.name}
                </span>
                {s.is_current && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-primary-dark font-medium">
                    current
                  </span>
                )}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
