'use client';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRightLeft,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  PieChart,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { supabase } from '@/lib/supabase';

type MenuItem = {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  link: string;
  requiresOpenRegister?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

export default function Sidebar() {
  const router = useRouter();
  const path = usePathname();
  const [role] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('role') || '' : ''));
  const [name] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('name') || 'Utilisateur' : 'Utilisateur'));
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (role !== 'ECONOME') return;
    let isMounted = true;

    const loadRegisterStatus = async () => {
      const { data } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('status', 'OPEN')
        .maybeSingle();
      if (isMounted) {
        setIsRegisterOpen(Boolean(data));
      }
    };

    loadRegisterStatus();
    return () => {
      isMounted = false;
    };
  }, [role, path]);

  const economeMenuGroups: MenuGroup[] = [
    {
      label: 'Général',
      items: [
        { label: 'Tableau de Bord', icon: LayoutDashboard, link: '/econome' },
      ]
    },
    {
      label: 'POS',
      items: [
        { label: 'Encaissement', icon: TrendingUp, link: '/econome/recette', requiresOpenRegister: true },
        { label: 'Décaissement', icon: TrendingDown, link: '/econome/depense', requiresOpenRegister: true },
      ]
    },
    {
      label: 'Scolarité',
      items: [
        { label: 'Annuaire Étudiants', icon: Users, link: '/econome/etudiants' },
        { label: 'Suivi Écolages', icon: BookOpen, link: '/econome/ecolages' },
      ]
    },
    {
      label: 'Caisse',
      items: [
        { label: 'Historique Journaux', icon: Calendar, link: '/econome/journal' },
        { label: 'Audit & Clôture', icon: Lock, link: '/econome/cloture', requiresOpenRegister: true },
      ]
    },
    {
      label: 'Coffre',
      items: [
        { label: 'Gestion Multicompte', icon: Wallet, link: '/econome/compte' },
        { label: 'Transfert', icon: ArrowRightLeft, link: '/econome/transfert', requiresOpenRegister: true },
      ]
    },
    {
      label: 'Autre',
      items: [
        { label: 'Paramètres', icon: Settings, link: '/econome/parametres' },
      ]
    },
  ];

  const dgMenuGroups: MenuGroup[] = [
    {
      label: 'Administration',
      items: [
        { label: 'Supervision Globale', icon: PieChart, link: '/dg' },
        { label: 'Journal & Audit', icon: DollarSign, link: '/dg/audit' },
        { label: 'Traitement Paies', icon: Activity, link: '/dg/salaires' },
        { label: 'Pointage RH', icon: UserCheck, link: '/app/dg/salaires/components/PointageJournalier' },
        { label: 'Registre Personnel', icon: Users, link: '/dg/salaires/components/EmployesList.tsx' },
        { label: 'Journal des Paies', icon: FileText, link: '/dg/salaires/journal' },
        { label: 'Équipe Économes', icon: ShieldCheck, link: '/dg/users' },
        { label: 'Paramètres Admin', icon: Settings, link: '/dg/parametres' },
      ]
    },
  ];

  const menuGroups = role === 'ECONOME' ? economeMenuGroups : role === 'DG' ? dgMenuGroups : [];
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
        {menuGroups.map((group, groupIndex) => (
          <div key={`${group.label}-${groupIndex}`} className="mb-2">
            <div className="px-4 pt-2 pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">
              {group.label}
            </div>
            {group.items.map((m, i) => {
              const Icon = m.icon;
              const isActive = path === m.link;
              const isDisabled = Boolean(m.requiresOpenRegister && isRegisterOpen === false);
              return (
                <button
                  key={`${m.link}-${i}`}
                  onClick={() => (isDisabled ? null : router.push(m.link))}
                  disabled={isDisabled}
                  title={isDisabled ? 'Caisse fermée' : undefined}
                  className={`w-full flex items-center justify-start gap-3 px-4 py-2 text-[11px] transition-all duration-150 group text-left
                  ${isDisabled
                    ? 'opacity-50 cursor-not-allowed border-l-4 border-transparent'
                    : isActive
                      ? `bg-slate-700/50 text-white border-l-4 ${themeAccent}`
                      : 'border-l-4 border-transparent hover:bg-slate-700/30 hover:text-slate-100'
                  }`}
                >
                  <Icon
                    size={14}
                    className={`shrink-0 ${
                      isDisabled
                        ? 'text-slate-500'
                        : isActive
                          ? themeIcon
                          : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span className={`${isActive ? 'font-bold underline decoration-blue-500/30 underline-offset-4' : 'font-medium'} truncate`}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
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
