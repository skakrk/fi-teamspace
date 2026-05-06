import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';

type Section = {
  id: string;
  title: string;
};

const TOC: Section[] = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'team', title: 'Team' },
  { id: 'my-profile', title: 'My profile' },
  { id: 'pitches', title: 'Pitches' },
  { id: 'meetings', title: 'Meetings' },
  { id: 'sprints', title: 'Sprints' },
  { id: 'course-progress', title: 'Course progress' },
  { id: 'polls', title: 'Polls' },
  { id: 'leaderboard', title: 'Leaderboard' },
  { id: 'resources', title: 'Resources' },
  { id: 'tips', title: 'Tips & FAQ' },
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-xl font-semibold mt-10 mb-3 scroll-mt-6 first:mt-0"
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold mt-5 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted leading-relaxed">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="text-sm text-muted leading-relaxed space-y-1.5 list-disc pl-5">
      {children}
    </ul>
  );
}

export function UserGuide() {
  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Logo size="lg" />
          <div>
            <h1 className="text-lg font-semibold leading-none">Best Teamspace</h1>
            <p className="text-xs text-muted mt-1">
              Breakers Team · FI Core Program (CEE, Spring 2026)
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-2">User guide</h2>
          <p className="text-sm text-muted mb-6">
            Everything you need to know to use Best Teamspace as a Breakers founder.
          </p>

          <nav className="bg-bg border border-border rounded-lg p-4 mb-8">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
              Contents
            </div>
            <ol className="text-sm grid sm:grid-cols-2 gap-x-4 gap-y-1 list-decimal pl-5">
              {TOC.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-primary-dark hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <H2 id="getting-started">1. Getting started</H2>
          <H3>Create an account</H3>
          <P>
            On the sign-in page, click <strong>"Don't have an account? Sign up"</strong>,
            enter your full name, email, and a password (minimum 6 characters). After
            sign-up, depending on the project's email-confirmation setting, you may need
            to confirm your email before signing in.
          </P>
          <H3>Sign in</H3>
          <P>
            Use the email you registered with. Forgot your password? Use{' '}
            <strong>"Forgot password?"</strong> on the sign-in page — we'll email you a
            reset link. Note: nobody can recover your original password (see{' '}
            <Link to="/security" className="text-primary-dark hover:underline">
              How we store passwords
            </Link>
            ), only reset it.
          </P>
          <H3>The sidebar</H3>
          <P>
            After signing in, the left sidebar shows every section. On mobile, tap the
            menu icon at the top to open it. Sign out from the bottom of the sidebar.
          </P>

          <H2 id="dashboard">2. Dashboard</H2>
          <P>
            Your working group's home page. At a glance you'll see:
          </P>
          <UL>
            <li>Your team's current cohort standing and recent rank trend.</li>
            <li>The next upcoming meeting with date, time, and join link.</li>
            <li>Active sprint progress — your tasks and the team completion percentage.</li>
            <li>Open polls awaiting your vote.</li>
            <li>The latest pitch version from each founder.</li>
            <li>
              A round-robin of recent successes and challenges shared by your teammates.
            </li>
          </UL>
          <P>
            If you're a <strong>president</strong>, an accountability checklist appears
            with the operational tasks expected of you for the current sprint.
          </P>
          <P>
            The dashboard also has two <strong>Present</strong> modes (links at the top):
            one for working-group meetings and one for full cohort sessions — they show a
            full-screen view designed to be projected during live meetings.
          </P>

          <H2 id="team">3. Team</H2>
          <P>
            Directory of every founder in your working group. Each card shows their
            project name, the founder's "about" line, contact links, and a sprint
            completion rate. Click any founder's name to open their full profile.
          </P>
          <P>
            At the top of the page, the team's shared <strong>vision</strong> and{' '}
            <strong>mission</strong> can be edited collaboratively, along with a link to
            your team's WhatsApp group chat.
          </P>

          <H2 id="my-profile">4. My profile</H2>
          <P>Edit how you and your project show up to the rest of the team.</P>
          <UL>
            <li>
              <strong>Personal details</strong>: full name, "about" blurb, contact info,
              avatar image.
            </li>
            <li>
              <strong>Project</strong>: project name, one-liner, description, logo,
              website / demo links.
            </li>
            <li>
              <strong>Social</strong>: LinkedIn, X/Twitter, Telegram, GitHub.
            </li>
            <li>
              <strong>Skills & needs</strong>: what you can help others with, and what
              you need help with — these surface in the Team page so people can find each
              other.
            </li>
          </UL>

          <H2 id="pitches">5. Pitches</H2>
          <P>
            One of the core FI deliverables is the Feedback Pitch. This page lists every
            founder's latest pitch version with its status (draft / ready / reviewed) and
            averaged scores from peer feedback (e.g. clarity, persuasiveness).
          </P>
          <P>
            Click a card to open the pitch detail. There you can:
          </P>
          <UL>
            <li>Read the current version and previous versions (if any).</li>
            <li>Submit structured feedback with scores and free-text comments.</li>
            <li>See feedback already given by other team members.</li>
            <li>If it's your own pitch, post a new version with updated text.</li>
          </UL>

          <H2 id="meetings">6. Meetings</H2>
          <P>
            Schedule and find Working Group sessions and Cohort Sessions. Each meeting
            entry has:
          </P>
          <UL>
            <li>Title, date, and start time.</li>
            <li>Agenda (markdown supported).</li>
            <li>Google Meet (or other) join link.</li>
            <li>A button to download the meeting as an <code>.ics</code> file you can add to your calendar.</li>
          </UL>
          <P>
            Toggle between <strong>Upcoming</strong> and <strong>Past</strong> at the top
            of the list. Open any meeting to see its full agenda and notes.
          </P>

          <H2 id="sprints">7. Sprints</H2>
          <P>
            Track weekly sprint tasks for the entire team in one grid. Rows are tasks,
            columns are founders. For each cell, set the status:
          </P>
          <UL>
            <li>
              <strong>Not started</strong>
            </li>
            <li>
              <strong>In progress</strong>
            </li>
            <li>
              <strong>Done</strong>
            </li>
            <li>
              <strong>Blocked</strong> — use this when something external is preventing
              you from finishing.
            </li>
          </UL>
          <P>
            Sprint completion percentage is calculated automatically and feeds into the
            dashboard, the leaderboard, and each founder's profile. Presidents (or
            anyone, depending on team rules) can create a new sprint and add tasks at the
            start of each week.
          </P>

          <H2 id="course-progress">8. Course progress</H2>
          <P>
            FI graduation has a sequence of milestones (e.g. "Idea Validation",
            "Customer Discovery", "Co-founder Vesting", etc.). This page shows two views:
          </P>
          <UL>
            <li>
              <strong>Personal</strong>: your own checklist with a progress bar.
            </li>
            <li>
              <strong>Team</strong>: a matrix showing where every founder stands on every
              milestone — useful for spotting who's ahead, who needs help, and what the
              team's bottleneck is.
            </li>
          </UL>

          <H2 id="polls">9. Polls</H2>
          <P>
            Lightweight team voting. Create a poll with custom options, set a deadline,
            and send the link to your team. Each open poll shows up on the dashboard
            until you've voted.
          </P>
          <P>
            For convenience, there's a <strong>"president election"</strong> shortcut
            that pre-populates a poll with all founders as options — useful at the start
            of each rotation.
          </P>
          <P>
            Open any poll to see current results and remaining time. Once the deadline
            passes, the poll is closed and final results are visible to everyone.
          </P>

          <H2 id="leaderboard">10. Leaderboard</H2>
          <P>
            How is your team doing compared to the rest of the cohort? This page shows:
          </P>
          <UL>
            <li>Your current rank and score.</li>
            <li>The full ranked list of teams in the cohort.</li>
            <li>A historical chart of your team's score week over week.</li>
            <li>
              An editor (visible to people with the appropriate role) for entering the
              cohort's weekly ratings as they're announced.
            </li>
          </UL>

          <H2 id="resources">11. Resources</H2>
          <P>
            A shared library of links your team has collected: events, articles, tools,
            other startup opportunities. Each post has a title, description, tags, the
            contributor's name, and a timestamp.
          </P>
          <P>
            Filter by category to narrow down. Anyone can contribute — paste in a useful
            link, tag it, and hit save.
          </P>

          <H2 id="tips">12. Tips & FAQ</H2>
          <H3>Where do I update my project name?</H3>
          <P>
            <Link to="/profile" className="text-primary-dark hover:underline">
              My profile
            </Link>{' '}
            → Project section.
          </P>
          <H3>I forgot my password.</H3>
          <P>
            On the sign-in page, click "Forgot password?", enter your email, and follow
            the link sent to you. We don't store your password — see{' '}
            <Link to="/security" className="text-primary-dark hover:underline">
              How we store passwords
            </Link>
            .
          </P>
          <H3>How do I add a meeting to my personal calendar?</H3>
          <P>
            Open the meeting and click the calendar / .ics download button. Open the
            downloaded file with your calendar app to add it.
          </P>
          <H3>Something looks broken.</H3>
          <P>
            Try a hard refresh (Cmd/Ctrl + Shift + R). If the problem persists, message
            your team's president — they can route it to the maintainers.
          </P>
        </div>

        <div className="mt-6">
          <Link to="/login" className="text-sm text-primary-dark hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
