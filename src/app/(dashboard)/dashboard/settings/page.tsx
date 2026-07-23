'use client';

import { useState } from 'react';
import { Building2, RotateCcw, Save } from 'lucide-react';
import { useInstitutionStore } from '@/components/dashboard/InstitutionStore';

export default function SettingsPage() {
  const { data, update, reset } = useInstitutionStore();
  const [name, setName] = useState(data.institutionName);
  const [saved, setSaved] = useState(false);
  const save = () => { update((current) => ({ ...current, institutionName: name.trim() || current.institutionName })); setSaved(true); };

  return <div className="max-w-[760px]"><div className="mb-8"><div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">Institution administration</div><h1 className="font-display font-semibold text-[32px] tracking-tight">Settings</h1><p className="text-ink-soft mt-2">Maintain the organization identity used throughout the workspace.</p></div><section className="rounded-xl border border-line bg-white p-7"><div className="flex items-center gap-3 mb-6"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine/10 text-pine"><Building2 size={20} /></div><div><div className="font-display text-xl font-semibold">Institution profile</div><div className="text-sm text-ink-soft">Basic details for this workspace.</div></div></div><label className="block max-w-[500px] text-sm font-semibold">Institution name<input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} className="mt-1.5 w-full rounded-md border border-line px-3 py-2.5 font-normal outline-none focus:border-pine" /></label><button onClick={save} className="mt-5 inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep"><Save size={16} />Save profile</button>{saved && <span className="ml-3 text-sm font-semibold text-pine">Saved</span>}</section><section className="mt-6 rounded-xl border border-saffron/40 bg-white p-7"><div className="font-display text-xl font-semibold">Reset demo workspace</div><p className="mt-2 text-sm text-ink-soft">Restore the sample institution data used in this local browser demo. This cannot be undone.</p><button onClick={() => { if (window.confirm('Reset all demo records?')) reset(); }} className="mt-5 inline-flex items-center gap-2 rounded-md border border-saffron px-4 py-2.5 text-sm font-semibold text-saffron-deep hover:bg-saffron/10"><RotateCcw size={16} />Reset demo data</button></section></div>;
}
