import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tighter">
          設定資料データベース
        </Link>
        <div className="flex gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <NavLink href="/" label="キャラクター" />
          <NavLink href="/worlds" label="世界観" />
          <NavLink href="/organizations" label="組織" />
          <NavLink href="/relations" label="相関図" />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
      {label}
    </Link>
  );
}