import { useEffect, useMemo, useState } from 'react';
import { Check, Circle, Clock } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import {
  supabase,
  type DbCourseMilestone,
  type DbMemberMilestone,
  type MemberMilestoneStatus,
} from '@/lib/supabase';
import { GraduationCap } from 'lucide-react';
import { notifyError } from '@/lib/notify';

const STATUS_ICON: Record<MemberMilestoneStatus, React.ReactElement> = {
  not_started: <Circle size={14} className="text-muted" />,
  in_progress: <Clock size={14} className="text-warn" />,
  done: <Check size={14} className="text-ok" />,
};
const STATUS_LABEL: Record<MemberMilestoneStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};

export function CourseProgress() {
  const { user } = useAuth();
  const { profiles } = useTeam();
  const [milestones, setMilestones] = useState<DbCourseMilestone[]>([]);
  const [progress, setProgress] = useState<DbMemberMilestone[]>([]);

  async function reload() {
    const { data: ms } = await supabase
      .from('course_milestones')
      .select('*')
      .order('sort_order');
    setMilestones((ms as DbCourseMilestone[]) || []);
    const { data: mp } = await supabase.from('member_milestones').select('*');
    setProgress((mp as DbMemberMilestone[]) || []);
  }

  useEffect(() => {
    reload();
  }, []);

  function statusOf(milestoneId: string, userId: string): MemberMilestoneStatus {
    return progress.find((p) => p.milestone_id === milestoneId && p.user_id === userId)?.status ?? 'not_started';
  }

  async function cycle(milestoneId: string) {
    if (!user) return;
    const order: MemberMilestoneStatus[] = ['not_started', 'in_progress', 'done'];
    const cur = statusOf(milestoneId, user.id);
    const next = order[(order.indexOf(cur) + 1) % order.length];
    const { error } = await supabase.from('member_milestones').upsert(
      {
        milestone_id: milestoneId,
        user_id: user.id,
        status: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'milestone_id,user_id' },
    );
    if (error) {
      notifyError('Could not update milestone', error);
      return;
    }
    await reload();
  }

  const myProgress = useMemo(() => {
    if (!user || !milestones.length) return { done: 0, total: 0, pct: 0 };
    const done = milestones.filter((m) => statusOf(m.id, user.id) === 'done').length;
    return { done, total: milestones.length, pct: Math.round((done / milestones.length) * 100) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, milestones, progress]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1 flex items-center gap-2">
          <GraduationCap className="text-primary-dark" size={22} /> Course Progress
        </h1>
        <p className="muted text-sm mt-1">
          FI graduation requirements for CEE Spring 2026. Each founder tracks their own progress —
          everyone sees the team's status to keep accountable.
        </p>
      </div>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Your graduation tracker</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-primary-deep">{myProgress.pct}%</div>
              <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${myProgress.pct}%` }} />
              </div>
              <div className="text-sm text-muted">
                {myProgress.done}/{myProgress.total}
              </div>
            </div>
            <div className="space-y-2">
              {milestones.map((m) => {
                const s = statusOf(m.id, user.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 bg-white border border-border rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{m.title}</div>
                      {m.description && (
                        <div className="text-xs text-muted mt-0.5">{m.description}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={s === 'done' ? 'secondary' : 'outline'}
                      onClick={() => cycle(m.id)}
                    >
                      {STATUS_ICON[s]} {STATUS_LABEL[s]}
                    </Button>
                  </div>
                );
              })}
              {!milestones.length && (
                <div className="text-sm text-muted">
                  No milestones yet. Run the program seed to add the FI requirements.
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team status</CardTitle>
        </CardHeader>
        <CardBody>
          {!profiles.length ? (
            <div className="text-sm text-muted">No founders yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-bg">
                    <th className="text-left text-xs font-medium text-muted px-3 py-2 border-b border-border">
                      Milestone
                    </th>
                    {profiles.map((p) => (
                      <th
                        key={p.user_id}
                        className="text-left text-xs font-medium text-muted px-3 py-2 border-b border-border min-w-[110px]"
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
                  {milestones.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-3 py-2 align-top w-72">
                        <div className="font-medium text-sm">{m.title}</div>
                      </td>
                      {profiles.map((p) => {
                        const s = statusOf(m.id, p.user_id);
                        return (
                          <td key={p.user_id} className="px-3 py-2 align-top">
                            <div className="inline-flex items-center gap-1 text-xs">
                              {STATUS_ICON[s]}
                              <span className={s === 'done' ? 'text-ink' : 'text-muted'}>
                                {STATUS_LABEL[s]}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!milestones.length && (
                    <tr>
                      <td className="px-3 py-3 text-sm text-muted" colSpan={profiles.length + 1}>
                        No milestones loaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
