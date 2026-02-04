'use client';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, TrendingUp, TrendingDown, LogOut, PieChart, 
  Users, BookOpen, DollarSign, Lock, Calendar, ArrowRightLeft, 
  FileText, Settings, ShieldCheck, UserCheck, Activity 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useState } from 'react';

export default function Sidebar() {
  const router = useRouter();
  const path = usePathname();
  const [role] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('role') || '' : ''));
  const [name] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('name') || 'Utilisateur' : 'Utilisateur'));

  const menus = [
    // --- NAVIGATION ÉCONOME (Liens alignés sur ton terminal) ---
    { role: 'ECONOME', label: 'Tableau de Bord', icon: LayoutDashboard, link: '/econome' },
    { role: 'ECONOME', label: 'POS Recette', icon: TrendingUp, link: '/econome/recette' },
    { role: 'ECONOME', label: 'Dépenses', icon: TrendingDown, link: '/econome/depense' },
    { role: 'ECONOME', label: 'Transferts', icon: ArrowRightLeft, link: '/econome/transfert' },
    { role: 'ECONOME', label: 'Suivi Écolages', icon: BookOpen, link: '/econome/ecolages' }, // LIEN CORRIGÉ
    { role: 'ECONOME', label: 'Annuaire Étudiants', icon: Users, link: '/econome/etudiants' },
    { role: 'ECONOME', label: 'Audit & Clôture', icon: Lock, link: '/econome/cloture' }, // LIEN CORRIGÉ
    { role: 'ECONOME', label: 'Historique Journaux', icon: Calendar, link: '/econome/journal' }, // LIEN CORRIGÉ
    { role: 'ECONOME', label: 'Paramètres Compte', icon: Settings, link: '/econome/parametres' },
    
    // --- NAVIGATION DG (Liens alignés sur ton terminal) ---
    { role: 'DG', label: 'Supervision Globale', icon: PieChart, link: '/dg' },
    { role: 'DG', label: 'Journal & Audit', icon: DollarSign, link: '/dg/audit' },
    { role: 'DG', label: 'Traitement Paies', icon: Activity, link: '/dg/salaires' }, // LIEN CORRIGÉ
    { role: 'DG', label: 'Pointage RH', icon: UserCheck, link: '/app/dg/salaires/components/PointageJournalier' }, // LIEN CORRIGÉ
    { role: 'DG', label: 'Registre Personnel', icon: Users, link: '/dg/salaires/components/EmployesList.tsx' }, // LIEN CORRIGÉ
    { role: 'DG', label: 'Journal des Paies', icon: FileText, link: '/dg/salaires/journal' },
    { role: 'DG', label: 'Équipe Économes', icon: ShieldCheck, link: '/dg/users' },
    { role: 'DG', label: 'Paramètres Admin', icon: Settings, link: '/dg/parametres' },
  ];

  const myMenu = menus.filter(m => m.role === role);
  const themeAccent = role === 'DG' ? 'border-red-600' : 'border-blue-600';
  const themeIcon = role === 'DG' ? 'text-red-500' : 'text-blue-500';

  const handleLogout = () => {
    Swal.fire({
      title: 'Quitter la session ?', 
      text: 'Les modifications non enregistrées seront perdues.',
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#1e293b', 
      cancelButtonColor: '#d33',
      confirmButtonText: 'Déconnexion', 
      cancelButtonText: 'Annuler',
      heightAuto: false
    }).then((res) => { 
        if (res.isConfirmed) { 
            sessionStorage.clear(); 
            router.push('/'); 
        } 
    });
  };

  return (
    <aside className="w-[220px] bg-[#1e293b] text-slate-300 flex flex-col h-screen fixed shadow-2xl z-50 text-[11px] border-r border-slate-700">
      
      {/* BRANDING LOGICIEL (Aligné à gauche) */}
      <div className="h-12 flex items-center justify-start px-4 border-b border-slate-700 bg-slate-900/50">
        <div className={`w-1.5 h-6 ${role === 'DG' ? 'bg-red-600' : 'bg-blue-600'} mr-3 rounded-full shrink-0`}></div>
        <span className="font-black tracking-tighter text-white uppercase text-sm text-left">
          IFPT <span className="font-light text-slate-400">MANAGER</span>
        </span>
      </div>

      {/* USER INFO PANEL (Aligné à gauche) */}
      <div className="p-3 bg-slate-800/30 border-b border-slate-700/50 flex items-center justify-start gap-3">
        <div className="w-7 h-7 shrink-0 rounded bg-slate-700 flex items-center justify-center text-white font-bold border border-slate-600 text-[10px] uppercase shadow-inner">
          {role?.charAt(0) || 'U'}
        </div>
        <div className="overflow-hidden leading-tight text-left">
          <p className="font-bold text-slate-100 truncate w-32 uppercase tracking-tighter italic">
            {name}
          </p>
          <p className="text-[9px] text-emerald-500 font-medium flex items-center gap-1 uppercase">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span> {role}
          </p>
        </div>
      </div>

      <div className="p-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 px-4 text-left">
        Menu Principal
      </div>
      
      <nav className="flex-1 py-1 overflow-y-auto custom-scrollbar scroll-smooth">
        {myMenu.map((m, i) => {
          const Icon = m.icon;
          const isActive = path === m.link;
          return (
            <button key={i} onClick={() => router.push(m.link)}
              className={`w-full flex items-center justify-start gap-3 px-4 py-2 text-[11px] transition-all duration-150 group text-left
              ${isActive 
                ? `bg-slate-700/50 text-white border-l-4 ${themeAccent}` 
                : 'border-l-4 border-transparent hover:bg-slate-700/30 hover:text-slate-100'
              }`}
            >
              <Icon size={14} className={`shrink-0 ${isActive ? themeIcon : 'text-slate-500 group-hover:text-slate-300'}`} /> 
              <span className={`${isActive ? 'font-bold underline decoration-blue-500/30 underline-offset-4' : 'font-medium'} truncate`}>
                {m.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-2 bg-slate-900/50 border-t border-slate-700">
        <button 
          onClick={handleLogout} 
          className="flex items-center justify-start gap-2 text-slate-400 hover:text-red-400 hover:bg-red-950/20 w-full px-3 py-2 font-bold rounded transition-all group text-left"
        >
          <LogOut size={14} className="group-hover:translate-x-1 transition-transform shrink-0" /> 
          <span className="uppercase tracking-tighter">Déconnexion</span>
        </button>
        <div className="text-[8px] text-slate-600 text-center mt-2 font-mono uppercase tracking-tighter">
          IFPT Finance v2.0.4
        </div>
      </div>
    </aside>
  );
}
