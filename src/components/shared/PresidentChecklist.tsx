import { useEffect, useState } from 'react';
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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* localStorage may be blocked — ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!sprint) {
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
        .eq('sprint_id', sprint.id);
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
  }, [sprint?.id]);

  async function toggle(itemCode: string) {
    if (!sprint) return;
    const existing = items.find((i) => i.item_code === itemCode);
    const nextDone = !(existing?.done ?? false);
    // Optimistic update
    const optimistic: DbPresidentChecklist = {
      sprint_id: sprint.id,
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
        sprint_id: sprint.id,
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

  const total = PRESIDENT_RESPONSIBILITIES.length;
  const doneCount = PRESIDENT_RESPONSIBILITIES.filter((r) =>
    items.find((i) => i.item_code === r.code && i.done),
  ).length;
  const sprintLabel = sprint ? `Sprint W${sprint.week_number}` : 'No active sprint';

  return (
    <Card className="border-primary/40 bg-bubble/30">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Briefcase size={18} className="text-primary-deep" /> President checklist —{' '}
          {sprintLabel}
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            <strong className="text-ink">{doneCount}</strong> / {total} done
          </span>
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
          {!sprint ? (
            <p className="text-sm text-muted">
              No active sprint — start one in <a className="text-primary-dark hover:underline" href="#/sprints">Sprints</a> to track checklist progress.
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
