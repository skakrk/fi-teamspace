import { useEffect, useMemo, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Avatar } from '@/components/ui/Avatar';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import {
  supabase,
  type DbSprint,
  type DbSprintCompletion,
  type DbSprintTask,
  type DbTaskProgress,
  type TaskStatus,
} from '@/lib/supabase';
import { Target } from 'lucide-react';
import { notifyError } from '@/lib/notify';

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
};
const STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: 'bg-bg text-muted border-border',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  done: 'bg-bubble text-primary-deep border-primary/30',
  blocked: 'bg-red-100 text-red-700 border-red-200',
};

export function Sprints() {
  const { profiles } = useTeam();
  const { user } = useAuth();
  const [sprints, setSprints] = useState<DbSprint[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DbSprintTask[]>([]);
  const [progress, setProgress] = useState<DbTaskProgress[]>([]);
  const [completions, setCompletions] = useState<DbSprintCompletion[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState({ title: '', description: '' });
  const [sprintDraft, setSprintDraft] = useState({
    name: '',
    week_number: 1,
    description: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(Date.now() + 6 * 86400000), 'yyyy-MM-dd'),
  });

  async function loadSprints() {
    const { data } = await supabase.from('sprints').select('*').order('week_number');
    const list = (data as DbSprint[]) || [];
    setSprints(list);
    const cur = list.find((s) => s.is_current) || list[list.length - 1] || null;
    if (cur && !activeId) setActiveId(cur.id);
  }

  async function loadTasks() {
    if (!activeId) {
      setTasks([]);
      setProgress([]);
      setCompletions([]);
      return;
    }
    const { data: t } = await supabase
      .from('sprint_tasks')
      .select('*')
      .eq('sprint_id', activeId)
      .order('sort_order');
    setTasks((t as DbSprintTask[]) || []);
    const ids = ((t as DbSprintTask[]) || []).map((x) => x.id);
    if (ids.length) {
      const { data: p } = await supabase.from('task_progress').select('*').in('task_id', ids);
      setProgress((p as DbTaskProgress[]) || []);
    } else {
      setProgress([]);
    }
    const { data: c } = await supabase
      .from('sprint_completions')
      .select('*')
      .eq('sprint_id', activeId);
    setCompletions((c as DbSprintCompletion[]) || []);
  }

  async function toggleSprintComplete() {
    if (!user || !activeId) return;
    const mine = completions.find((c) => c.user_id === user.id);
    if (mine) {
      const { error } = await supabase
        .from('sprint_completions')
        .delete()
        .eq('sprint_id', activeId)
        .eq('user_id', user.id);
      if (error) return notifyError('Could not unmark completion', error);
    } else {
      const { error } = await supabase.from('sprint_completions').insert({
        sprint_id: activeId,
        user_id: user.id,
      });
      if (error) return notifyError('Could not mark completion', error);
    }
    await loadTasks();
  }

  useEffect(() => {
    loadSprints();
  }, []);
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const active = sprints.find((s) => s.id === activeId) || null;

  const stats = useMemo(() => {
    if (!tasks.length || !profiles.length) return { done: 0, total: 0 };
    const total = tasks.length * profiles.length;
    const done = progress.filter((p) => p.status === 'done').length;
    return { done, total };
  }, [tasks, profiles, progress]);

  function statusOf(taskId: string, userId: string): TaskStatus {
    const p = progress.find((x) => x.task_id === taskId && x.user_id === userId);
    return p?.status ?? 'not_started';
  }

  async function cycleStatus(taskId: string, userId: string) {
    if (!user || user.id !== userId) return;
    const order: TaskStatus[] = ['not_started', 'in_progress', 'done', 'blocked'];
    const cur = statusOf(taskId, userId);
    const next = order[(order.indexOf(cur) + 1) % order.length];
    await supabase
      .from('task_progress')
      .upsert({ task_id: taskId, user_id: userId, status: next }, { onConflict: 'task_id,user_id' });
    await loadTasks();
  }

  async function addTask() {
    if (!activeId || !taskDraft.title) return;
    const { error } = await supabase.from('sprint_tasks').insert({
      sprint_id: activeId,
      title: taskDraft.title,
      description: taskDraft.description || null,
      sort_order: tasks.length + 1,
    });
    if (error) {
      notifyError('Could not add task', error);
      return;
    }
    setTaskOpen(false);
    setTaskDraft({ title: '', description: '' });
    await loadTasks();
  }

  async function addSprint() {
    if (!sprintDraft.name) return;
    // unset previous current
    const { error: upErr } = await supabase
      .from('sprints')
      .update({ is_current: false })
      .gt('week_number', 0);
    if (upErr) {
      notifyError('Could not update sprints', upErr);
      return;
    }
    const { data, error } = await supabase
      .from('sprints')
      .insert({ ...sprintDraft, is_current: true })
      .select()
      .maybeSingle();
    if (error) {
      notifyError('Could not create sprint', error);
      return;
    }
    setSprintOpen(false);
    await loadSprints();
    if (data) setActiveId((data as DbSprint).id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <Target className="text-primary-dark" size={22} /> Sprints
          </h1>
          <p className="muted text-sm mt-1">
            Each week the whole team works on the same checklist. Click your cell to cycle status.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setSprintOpen(true)}>
            <Plus size={14} /> New sprint
          </Button>
          <Button onClick={() => setTaskOpen(true)} disabled={!activeId}>
            <Plus size={16} /> Add task
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {sprints.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={
              'px-3 py-1.5 rounded-lg text-sm border transition-colors ' +
              (s.id === activeId
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-border text-muted hover:text-ink')
            }
          >
            W{s.week_number} · {s.name}
            {s.is_current && <span className="ml-1 opacity-80">●</span>}
          </button>
        ))}
        {!sprints.length && <div className="text-sm text-muted">No sprints yet.</div>}
      </div>

      {active && (
        <Card>
          <CardHeader className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>{active.name}</CardTitle>
              <div className="text-xs text-muted mt-1">
                Week {active.week_number} · {format(new Date(active.start_date), 'MMM d')} –{' '}
                {format(new Date(active.end_date), 'MMM d')}
              </div>
              {active.description && (
                <div className="text-sm mt-2 text-muted">{active.description}</div>
              )}
            </div>
            <Button
              size="sm"
              variant={completions.some((c) => c.user_id === user?.id) ? 'secondary' : 'primary'}
              onClick={toggleSprintComplete}
              disabled={!user}
            >
              <Check size={14} />
              {completions.some((c) => c.user_id === user?.id)
                ? 'Sprint completed (click to unmark)'
                : 'Mark sprint completed'}
            </Button>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
              <span className="text-muted">Tasks:</span>
              <span className="font-medium text-ink">
                {stats.done}/{stats.total}
              </span>
              <span className="text-muted">cells done ·</span>
              <span className="text-muted">Sprint completed by:</span>
              <span className="font-medium text-ink">
                {completions.length}/{profiles.length}
              </span>
              {profiles.length > 0 && completions.length > 0 && (
                <div className="flex gap-1 ml-1">
                  {profiles
                    .filter((p) => completions.some((c) => c.user_id === p.user_id))
                    .map((p) => (
                      <span
                        key={p.user_id}
                        title={p.full_name}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bubble text-primary-deep text-[10px] font-semibold"
                      >
                        {(p.full_name || '?')
                          .split(' ')
                          .map((s) => s[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="text-sm text-muted">No tasks. Click "Add task" to start.</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-bg">
                      <th className="text-left text-xs font-medium text-muted px-3 py-2 border-b border-border">
                        Task
                      </th>
                      {profiles.map((p) => (
                        <th
                          key={p.user_id}
                          className="text-left text-xs font-medium text-muted px-3 py-2 border-b border-border min-w-[120px]"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar name={p.full_name || '?'} src={p.avatar_url} size="sm" />
                            <span className="truncate">
                              {(p.full_name || 'Unnamed').split(' ')[0]}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="px-3 py-2 align-top w-44 sm:w-72">
                          <div className="font-medium text-sm">{t.title}</div>
                          {t.description && (
                            <div className="text-xs text-muted mt-0.5">{t.description}</div>
                          )}
                        </td>
                        {profiles.map((p) => {
                          const s = statusOf(t.id, p.user_id);
                          const mine = user?.id === p.user_id;
                          return (
                            <td key={p.user_id} className="px-2 py-2 align-top">
                              <button
                                disabled={!mine}
                                onClick={() => cycleStatus(t.id, p.user_id)}
                                className={
                                  'w-full px-2 py-1.5 rounded-md text-xs border ' +
                                  STATUS_COLOR[s] +
                                  (mine ? ' hover:shadow-card cursor-pointer' : ' cursor-default opacity-90')
                                }
                                title={mine ? 'Click to change' : 'Read-only'}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {s === 'done' && <Check size={12} />}
                                  {STATUS_LABEL[s]}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Dialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        title="Add task"
        footer={
          <>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addTask}>Add</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={taskDraft.title}
              onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              rows={2}
              value={taskDraft.description}
              onChange={(e) => setTaskDraft({ ...taskDraft, description: e.target.value })}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={sprintOpen}
        onOpenChange={setSprintOpen}
        title="New sprint"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSprintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addSprint}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              value={sprintDraft.name}
              onChange={(e) => setSprintDraft({ ...sprintDraft, name: e.target.value })}
              placeholder="Sprint 2: Customer Discovery"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Week #</Label>
              <Input
                type="number"
                value={sprintDraft.week_number}
                onChange={(e) =>
                  setSprintDraft({ ...sprintDraft, week_number: Number(e.target.value || 1) })
                }
              />
            </div>
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={sprintDraft.start_date}
                onChange={(e) => setSprintDraft({ ...sprintDraft, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={sprintDraft.end_date}
                onChange={(e) => setSprintDraft({ ...sprintDraft, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={sprintDraft.description}
              onChange={(e) => setSprintDraft({ ...sprintDraft, description: e.target.value })}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
