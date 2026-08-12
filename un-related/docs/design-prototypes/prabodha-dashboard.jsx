import React, { useState } from 'react';
import {
  LayoutGrid, Users, GraduationCap, Layers, BookOpen, Calendar,
  ClipboardCheck, FileText, BookMarked, Award, Settings, LogOut,
  PanelLeft, Check, Circle, ArrowRight
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Institute',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
      { key: 'students', label: 'Students', icon: Users },
      { key: 'teachers', label: 'Teachers', icon: GraduationCap },
      { key: 'batches', label: 'Batches', icon: Layers },
      { key: 'subjects', label: 'Subjects', icon: BookOpen },
      { key: 'timetable', label: 'Timetable', icon: Calendar },
      { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      { key: 'materials', label: 'Materials', icon: FileText },
      { key: 'homework', label: 'Homework', icon: BookMarked },
      { key: 'marks', label: 'Marks', icon: Award },
      { key: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const EMPTY_STATES = {
  students: { title: 'No students yet', body: 'Add your first student to start tracking attendance, homework, and progress.', cta: 'Add a student' },
  teachers: { title: 'No teachers yet', body: 'Add a teacher and assign them a subject and batch to teach.', cta: 'Add a teacher' },
  batches: { title: 'No batches yet', body: 'Create a batch to start grouping students, like "Class 11 Science Maths."', cta: 'Create a batch' },
  subjects: { title: 'No subjects yet', body: 'Add a subject, then assign a teacher and batch to it.', cta: 'Add a subject' },
  timetable: { title: 'No classes scheduled', body: 'Once a subject has a teacher assigned, schedule it into a weekly slot here.', cta: 'Build the timetable' },
  attendance: { title: 'No attendance recorded yet', body: 'Attendance for a class will show up here once a teacher marks it.', cta: 'Mark attendance' },
  materials: { title: 'No study material yet', body: 'Upload a PDF, note, image, or link for a batch and subject.', cta: 'Upload material' },
  homework: { title: 'No homework assigned yet', body: 'Assign homework to a batch — every student gets tracked automatically.', cta: 'Assign homework' },
  marks: { title: 'No marks entered yet', body: 'Marks entered by teachers will appear here, organized by subject.', cta: 'Enter marks' },
  settings: { title: 'Institute settings', body: 'Update your institute profile, logo, academic year, and working days.', cta: 'Edit settings' },
};

function StatCard({ label, value, Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <Icon size={20} strokeWidth={1.6} color="#0F3D3E" />
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function PrabodhaDashboard() {
  const [active, setActive] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [checklist, setChecklist] = useState([
    { key: 'batch', label: 'Create your first batch', done: false },
    { key: 'teachers', label: 'Add teachers', done: false },
    { key: 'students', label: 'Enroll students', done: true },
    { key: 'attendance', label: "Record today's attendance", done: false },
  ]);

  const instituteName = 'Ayush Institute';
  const stats = { students: 1, teachers: 0, batches: 0, sessions: 0 };

  const toggleChecklist = (key) => {
    setChecklist((list) => list.map((item) => item.key === key ? { ...item, done: !item.done } : item));
  };

  const activeItem = NAV_SECTIONS[0].items.find((i) => i.key === active);

  return (
    <div className="prabodha-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .prabodha-shell {
          --pine: #0F3D3E;
          --pine-deep: #0A2B2C;
          --paper: #F6F7F3;
          --card: #FFFFFF;
          --saffron: #E2984A;
          --saffron-deep: #C97D2E;
          --ink: #13221F;
          --ink-soft: #5B6B67;
          --line: #DCE2DC;
          --display: 'Fraunces', serif;
          --body: 'Inter', sans-serif;
          --mono: 'JetBrains Mono', monospace;
          font-family: var(--body);
          color: var(--ink);
          display: flex;
          height: 100vh;
          width: 100%;
          background: var(--paper);
          overflow: hidden;
        }
        .prabodha-shell *{ box-sizing: border-box; }

        .sidebar {
          width: 260px;
          flex-shrink: 0;
          background: var(--pine-deep);
          color: #CFE0DC;
          display: flex;
          flex-direction: column;
          transition: width .2s ease;
          overflow: hidden;
        }
        .sidebar.collapsed { width: 76px; }

        .sidebar-brand {
          display: flex; align-items: center; gap: 12px;
          padding: 22px 20px; border-bottom: 1px solid rgba(207,224,220,0.12);
        }
        .brand-mark {
          width: 38px; height: 38px; border-radius: 9px; background: var(--saffron);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          font-family: var(--display); font-weight: 700; font-size: 18px; color: var(--pine-deep);
        }
        .brand-text { font-family: var(--display); font-weight: 600; font-size: 17px; color: #F6F7F3; white-space: nowrap; }
        .brand-sub { font-family: var(--mono); font-size: 10.5px; color: #8FA8A2; text-transform: uppercase; letter-spacing: .06em; margin-top: 1px; }

        .sidebar-section-label {
          font-family: var(--mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em;
          color: #6C8681; padding: 18px 22px 8px; white-space: nowrap;
        }
        .nav-list { display: flex; flex-direction: column; gap: 2px; padding: 0 10px; }
        .nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 8px; cursor: pointer;
          font-size: 14px; font-weight: 500; color: #CFE0DC;
          background: transparent; border: none; text-align: left; width: 100%;
          transition: background .15s;
          white-space: nowrap;
        }
        .nav-item:hover { background: rgba(207,224,220,0.08); }
        .nav-item.active { background: rgba(226,152,74,0.16); color: #F6F7F3; }
        .nav-item.active svg { color: var(--saffron); }
        .nav-item span { overflow: hidden; text-overflow: ellipsis; }

        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 32px; background: var(--paper); border-bottom: 1px solid var(--line);
          flex-shrink: 0;
        }
        .topbar-left { display: flex; align-items: center; gap: 16px; }
        .collapse-btn {
          background: none; border: none; cursor: pointer; color: var(--ink-soft);
          display: flex; align-items: center; padding: 4px; border-radius: 6px;
        }
        .collapse-btn:hover { background: var(--line); }
        .topbar-title { font-family: var(--display); font-weight: 600; font-size: 17px; }
        .signout-btn {
          display: flex; align-items: center; gap: 8px; font-family: var(--body); font-weight: 600; font-size: 13.5px;
          padding: 9px 16px; border-radius: 7px; border: 1.5px solid var(--line); background: var(--card); color: var(--ink);
          cursor: pointer; transition: border-color .15s;
        }
        .signout-btn:hover { border-color: var(--pine); }

        .content { flex: 1; overflow-y: auto; padding: 36px 32px 48px; }

        .eyebrow { font-family: var(--mono); font-size: 11.5px; letter-spacing: .12em; color: var(--saffron-deep); text-transform: uppercase; margin-bottom: 8px; }
        .page-title { font-family: var(--display); font-weight: 600; font-size: 32px; letter-spacing: -0.01em; margin-bottom: 30px; }

        .stat-grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 18px; margin-bottom: 30px; max-width: 720px; }
        .stat-card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 22px 22px 20px; }
        .stat-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .stat-label { font-size: 14px; color: var(--ink-soft); font-weight: 500; }
        .stat-value { font-family: var(--display); font-weight: 600; font-size: 34px; color: var(--ink); }

        .getting-started { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 30px 32px; max-width: 720px; }
        .gs-title { font-family: var(--display); font-weight: 600; font-size: 21px; margin-bottom: 18px; }
        .gs-list { display: flex; flex-direction: column; gap: 3px; }
        .gs-item {
          display: flex; align-items: center; gap: 12px; padding: 11px 6px; border-radius: 8px;
          cursor: pointer; background: transparent; border: none; text-align: left; width: 100%;
          font-family: var(--body); font-size: 15px; color: var(--ink); transition: background .15s;
        }
        .gs-item:hover { background: var(--paper); }
        .gs-check {
          width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid var(--line);
        }
        .gs-check.done { background: var(--saffron); border-color: var(--saffron); }
        .gs-item.done span { color: var(--ink-soft); text-decoration: line-through; }

        .empty-state {
          background: var(--card); border: 1px solid var(--line); border-radius: 12px;
          padding: 64px 40px; max-width: 560px; text-align: center;
        }
        .empty-icon {
          width: 52px; height: 52px; border-radius: 12px; background: var(--paper);
          display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
        }
        .empty-title { font-family: var(--display); font-weight: 600; font-size: 20px; margin-bottom: 10px; }
        .empty-body { font-size: 14.5px; color: var(--ink-soft); margin-bottom: 24px; max-width: 380px; margin-left: auto; margin-right: auto; }
        .empty-cta {
          display: inline-flex; align-items: center; gap: 8px; font-family: var(--body); font-weight: 600; font-size: 14px;
          padding: 11px 20px; border-radius: 24px; border: none; background: var(--saffron); color: var(--pine-deep); cursor: pointer;
        }
      `}</style>

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">P</div>
          {!collapsed && (
            <div>
              <div className="brand-text">Prabodha</div>
              <div className="brand-sub">Admin</div>
            </div>
          )}
        </div>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && <div className="sidebar-section-label">{section.label}</div>}
            <div className="nav-list">
              {section.items.map((item) => (
                <button
                  key={item.key}
                  className={`nav-item ${active === item.key ? 'active' : ''}`}
                  onClick={() => setActive(item.key)}
                  title={item.label}
                >
                  <item.icon size={18} strokeWidth={1.7} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
              <PanelLeft size={19} strokeWidth={1.7} />
            </button>
            <div className="topbar-title">Prabodha</div>
          </div>
          <button className="signout-btn">
            <LogOut size={15} strokeWidth={1.8} />
            Sign out
          </button>
        </div>

        <div className="content">
          {active === 'dashboard' ? (
            <>
              <div className="eyebrow">Welcome back</div>
              <div className="page-title">{instituteName}</div>

              <div className="stat-grid">
                <StatCard label="Total Students" value={stats.students} Icon={Users} />
                <StatCard label="Total Teachers" value={stats.teachers} Icon={GraduationCap} />
                <StatCard label="Active Batches" value={stats.batches} Icon={Layers} />
                <StatCard label="Today's Sessions" value={stats.sessions} Icon={Calendar} />
              </div>

              <div className="getting-started">
                <div className="gs-title">Getting started</div>
                <div className="gs-list">
                  {checklist.map((item) => (
                    <button key={item.key} className={`gs-item ${item.done ? 'done' : ''}`} onClick={() => toggleChecklist(item.key)}>
                      <span className={`gs-check ${item.done ? 'done' : ''}`}>
                        {item.done && <Check size={13} strokeWidth={3} color="#0A2B2C" />}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="eyebrow">{NAV_SECTIONS[0].label}</div>
              <div className="page-title">{activeItem?.label}</div>
              <div className="empty-state">
                <div className="empty-icon">
                  {activeItem && <activeItem.icon size={24} strokeWidth={1.6} color="#0F3D3E" />}
                </div>
                <div className="empty-title">{EMPTY_STATES[active]?.title}</div>
                <div className="empty-body">{EMPTY_STATES[active]?.body}</div>
                <button className="empty-cta">
                  {EMPTY_STATES[active]?.cta}
                  <ArrowRight size={15} strokeWidth={2} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
