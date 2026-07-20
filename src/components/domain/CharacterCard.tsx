// src/components/domain/CharacterCard.tsx
import Link from 'next/link';
import { Character } from '../../types/database';

export default function CharacterCard({ character }: { character: Character }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-sm hover:border-blue-500/50 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">{character.name}</h3>
          <p className="text-slate-500 text-xs font-mono uppercase">{character.gender}</p>
        </div>
        <Link href={`/edit/${character.id}`} className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold px-3 py-1 rounded-full transition-colors">
          編集
        </Link>
      </div>

      {/* タグ表示エリア */}
      <div className="flex flex-wrap gap-2 mb-6">
        {character.worlds?.map(w => (
          <span key={w.id} className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded uppercase font-black">
            {w.name}
          </span>
        ))}
        {character.organizations?.map(o => (
          <span key={o.id} className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-black">
            {o.name}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        <StatBar label="ATK" value={character.stats?.attack ?? character.stats?.ATK ?? 0} color="bg-rose-500" />
        <StatBar label="DEF" value={character.stats?.defense ?? character.stats?.DEF ?? 0} color="bg-sky-500" />
      </div>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}