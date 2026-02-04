'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Wallet, TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle, Clock, ArrowRight, RefreshCw, BarChart3, Coins } from 'lucide-react';
import Link from 'next/link';

export default function EconomeDashboard() {
  const [stats, setStats] = useState({ recette: 0, depense: 0, solde: 0, count: 0 });
  const [session, setSession] = useState<any>(null);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [vaults, setVaults] = useState<any[]>([]); // Pour les soldes réels
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Session Caisse
    const { data: sess } = await supabase.from('cash_registers').select('*').eq('status', 'OPEN').maybeSingle();
    setSession(sess);

    // 2. Transactions du Jour (Stats Rapides)
    const { data: txDay } = await supabase.from('transactions')
        .select('*, vaults(name, icon)')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false });

    if (txDay) {
        const r = txDay.filter(t => t.type === 'RECETTE').reduce((a, b) => a + b.amount, 0);
        const d = txDay.filter(t => t.type === 'DEPENSE').reduce((a, b) => a + b.amount, 0);
        setStats({ recette: r, depense: d, solde: r - d, count: txDay.length });
        setRecentTx(txDay.slice(0, 5));
    }

    // 3. SOLDES RÉELS (Calcul complet)
    const { data: vList } = await supabase.from('vaults').select('*').order('name');
    const { data: allTx } = await supabase.from('transactions').select('amount, type, vault_id').eq('status', 'VALIDATED'); // Seul le validé compte

    if (vList && allTx) {
        const computedVaults = vList.map(v => {
            const vaultTx = allTx.filter(t => t.vault_id === v.id);
            const bal = (v.balance || 0) + vaultTx.reduce((acc, t) => {
                if (t.type === 'RECETTE') return acc + t.amount;
                if (t.type === 'DEPENSE') return acc - t.amount;
                if (t.type === 'TRANSFERT') return acc + t.amount;
                return acc;
            }, 0);
            return { ...v, balance: bal };
        });
        setVaults(computedVaults);
    }

    setLoading(false);
  };

  const cards = [
    { title: 'RECETTES (JOUR)', val: stats.recette, color: 'text-green-600', border: 'border-green-500', icon: TrendingUp },
    { title: 'DÉPENSES (JOUR)', val: stats.depense, color: 'text-red-600', border: 'border-red-500', icon: TrendingDown },
    { title: 'SOLDE SESSION', val: stats.solde, color: 'text-blue-600', border: 'border-blue-500', icon: Wallet },
    { title: 'OPÉRATIONS', val: stats.count, color: 'text-purple-600', border: 'border-purple-500', icon: Activity, unit: '' },
  ];

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT TDB...</div>;

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
        <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-gray-600"/>
            <span className="font-bold text-gray-700 uppercase tracking-tight">Tableau de Bord</span>
            <span className="text-[10px] text-gray-400 font-mono hidden md:inline">| {new Date().toLocaleDateString()}</span>
        </div>
        
        {session ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-2 py-0.5 rounded shadow-sm">
                <CheckCircle size={12} className="text-green-600"/>
                <span className="text-[9px] font-bold text-green-800 uppercase">SESSION OUVERTE ({new Date(session.opening_date).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})})</span>
            </div>
        ) : (
            <Link href="/econome/recette" className="flex items-center gap-2 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-sm hover:bg-red-100 transition animate-pulse">
                <AlertCircle size={12} className="text-red-600"/>
                <span className="text-[9px] font-bold text-red-800 uppercase underline">SESSION FERMÉE - OUVRIR</span>
            </Link>
        )}
        <button onClick={loadDashboard}><RefreshCw size={12} className="text-blue-500 hover:rotate-180 transition"/></button>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden">
          
          {/* COLONNE GAUCHE (KPIS + JOURNAL) */}
          <div className="flex-1 flex flex-col gap-2">
              
              {/* KPIs */}
              <div className="grid grid-cols-4 gap-2 h-20 shrink-0">
                {cards.map((c, i) => (
                  <div key={i} className={`bg-white px-3 py-2 rounded shadow-sm border-l-4 ${c.border} flex flex-col justify-center`}>
                    <div className="flex justify-between items-start">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{c.title}</p>
                        <c.icon className={`${c.color} opacity-80`} size={14} />
                    </div>
                    <h3 className={`text-lg font-bold ${c.color} font-mono mt-1`}>
                        {c.val.toLocaleString()} <span className="text-[10px] text-gray-400 font-sans font-normal">{c.unit ?? 'Ar'}</span>
                    </h3>
                  </div>
                ))}
              </div>

              {/* FIL D'ACTUALITÉ (Style Sage) */}
              <div className="flex-1 bg-white border border-gray-300 rounded shadow-sm flex flex-col overflow-hidden">
                  <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex justify-between items-center shrink-0 h-8">
                      <h3 className="font-bold text-gray-700 text-[10px] flex items-center gap-1 uppercase"><Clock size={12}/> Activité Récente</h3>
                      <Link href="/econome/historique" className="text-[9px] text-blue-600 hover:underline flex items-center gap-1 font-bold">HISTORIQUE <ArrowRight size={8}/></Link>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-white p-0">
                      {recentTx.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-300 text-[10px] italic">
                              <Activity size={24} className="mb-2 opacity-20"/>Aucun mouvement aujourd'hui
                          </div>
                      ) : (
                          <table className="w-full text-left text-[10px] border-collapse">
                              <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                                  <tr>
                                      <th className="p-2 w-16">Heure</th>
                                      <th className="p-2 w-24">Type</th>
                                      <th className="p-2">Libellé</th>
                                      <th className="p-2 text-right w-24">Montant</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono">
                                  {recentTx.map(t => (
                                      <tr key={t.id} className="hover:bg-blue-50 transition-colors">
                                          <td className="p-2 text-gray-400">{new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                          <td className="p-2 font-sans font-bold text-[9px] text-gray-600">{t.category}</td>
                                          <td className="p-2 text-gray-700 truncate max-w-xs font-sans">{t.description}</td>
                                          <td className={`p-2 text-right font-bold ${t.type === 'RECETTE' ? 'text-green-600' : 'text-red-600'}`}>
                                              {t.type === 'RECETTE' ? '+' : ''}{t.amount.toLocaleString()}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                  </div>
              </div>
          </div>

          {/* COLONNE DROITE (SOLDES RÉELS) */}
          <div className="w-64 bg-white border border-gray-300 rounded shadow-sm flex flex-col shrink-0">
              <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex items-center h-8 shrink-0">
                  <h3 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-1"><Coins size={12}/> Soldes Actuels</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {vaults.map(v => (
                      <div key={v.id} className="group p-2 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition cursor-default">
                          <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                  <span className="text-base">{v.icon}</span>
                                  <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-blue-700">{v.name}</span>
                              </div>
                          </div>
                          <div className={`text-right font-mono font-bold text-sm ${v.balance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                              {v.balance.toLocaleString()} Ar
                          </div>
                      </div>
                  ))}
                  
                  <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                      <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Total Trésorerie</p>
                      <p className="text-lg font-mono font-bold text-blue-800">
                          {vaults.reduce((a,b)=>a+b.balance, 0).toLocaleString()} Ar
                      </p>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}