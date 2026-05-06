'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [worlds, setWorlds] = useState<{id:string, name:string}[]>([]);
  const [orgs, setOrgs] = useState<{id:string, name:string}[]>([]);
  const [newName, setNewName] = useState({ world: '', org: '' });

  const fetchData = async () => {
    const { data: w } = await supabase.from('worlds').select('*');
    const { data: o } = await supabase.from('organizations').select('*');
    if (w) setWorlds(w);
    if (o) setOrgs(o);
  };

  useEffect(() => { fetchData(); }, []);

  const addWorld = async () => {
    await supabase.from('worlds').insert([{ name: newName.world }]);
    setNewName({ ...newName, world: '' });
    fetchData();
  };

  const addOrg = async () => {
    await supabase.from('organizations').insert([{ name: newName.org }]);
    setNewName({ ...newName, org: '' });
    fetchData();
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Master Data Settings</h1>

      {/* 世界観管理 */}
      <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700">
        <h2 className="text-blue-400 font-bold mb-4">WORLD MANAGEMENT</h2>
        <div className="flex gap-2 mb-6">
          <input 
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-white"
            value={newName.world} onChange={(e) => setNewName({...newName, world: e.target.value})}
            placeholder="New World Name..."
          />
          <button onClick={addWorld} className="bg-blue-600 px-6 py-2 rounded-xl font-bold text-white">ADD</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {worlds.map(w => <span key={w.id} className="bg-slate-700 px-3 py-1 rounded-full text-xs text-slate-300">{w.name}</span>)}
        </div>
      </section>

      {/* 組織管理 */}
      <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700">
        <h2 className="text-emerald-400 font-bold mb-4">ORGANIZATION MANAGEMENT</h2>
        <div className="flex gap-2 mb-6">
          <input 
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-white"
            value={newName.org} onChange={(e) => setNewName({...newName, org: e.target.value})}
            placeholder="New Org Name..."
          />
          <button onClick={addOrg} className="bg-emerald-600 px-6 py-2 rounded-xl font-bold text-white">ADD</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {orgs.map(o => <span key={o.id} className="bg-slate-700 px-3 py-1 rounded-full text-xs text-slate-300">{o.name}</span>)}
        </div>
      </section>
    </div>
  );
}