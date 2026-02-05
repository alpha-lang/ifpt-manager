'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wallet, Bell, AlertTriangle, Printer, Calendar, RefreshCw, BarChart3, Activity } from 'lucide-react';
// @ts-expect-error recharts export types conflict with Next.js type resolution in this project
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import PendingValidations from './components/PendingValidations';
import { toVaults, toTransactions, SafeTransaction } from '@/lib/typeValidators';
import { subscribeEconome } from '@/lib/realtime';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

type Vault = {
  id: string;
  name: string;
  balance: number;
  icon?: string | null;
  [key: string]: unknown;
};

type Notification = {
  id: string;
  message: string;
  [key: string]: unknown;
};

type Transaction = SafeTransaction;

type ChartEntry = {
  name: string;
  value: number;
};

export default function DGDashboard() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [stats, setStats] = useState({ recette: 0, depense: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chartData, setChartData] = useState<ChartEntry[]>([]); 
  const [loading, setLoading] = useState(true);

  // Filtres de Date
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    // 1. Liste des comptes
    const { data: vList } = await supabase.from('vaults').select('*').order('name');
    
    // 2. Transactions validées sur la période (pour le rapport)
    const { data: allTx } = await supabase.from('transactions')
        .select('amount, type, vault_id, created_at, category, status')
        .eq('status', 'VALIDATED') 
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

    // 3. Solde réel actuel (toutes dates confondues)
    const { data: balanceTx } = await supabase.from('transactions')
        .select('amount, type, vault_id')
        .eq('status', 'VALIDATED');

    const { data: notifs } = await supabase.from('notifications').select('*').eq('status', 'UNREAD').order('created_at', { ascending: false });

    if (vList && allTx && balanceTx) {
        const balanceTransactions = toTransactions(balanceTx);
        // Calcul Soldes Actuels
        const computedVaults = toVaults(vList).map(v => {
            const vaultTx = balanceTransactions.filter(t => t.vault_id === v.id);
            const bal = (v.balance || 0) + vaultTx.reduce((acc, t) => {
                if (t.type === 'RECETTE') return acc + t.amount;
                if (t.type === 'DEPENSE') return acc - t.amount;
                if (t.type === 'TRANSFERT') return acc + t.amount; 
                return acc;
            }, 0);
            return { ...v, balance: bal } as Vault;
        });
        setVaults(computedVaults);

        // Stats Période
        const periodTransactions = toTransactions(allTx);
        const r = periodTransactions.filter(t => t.type === 'RECETTE').reduce((a, b) => a + b.amount, 0);
        const d = periodTransactions.filter(t => t.type === 'DEPENSE').reduce((a, b) => a + b.amount, 0);
        setStats({ recette: r, depense: d });

        // Graphique Période
        const depenses = periodTransactions.filter(t => t.type === 'DEPENSE');
        const categories = Array.from(new Set(depenses.map(t => t.category).filter(Boolean)));
        const pieData: ChartEntry[] = categories.map(cat => ({
            name: String(cat),
            value: depenses.filter(t => t.category === cat).reduce((a, b) => a + b.amount, 0)
        })).sort((a, b) => b.value - a.value).slice(0, 5);
        setChartData(pieData);
    }
    setNotifications(Array.isArray(notifs) ? notifs : []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
      await supabase.from('notifications').update({ status: 'READ' }).eq('id', id);
      loadData();
  };

  const handlePrint = () => window.print();
  const totalGlobal = vaults.reduce((acc, v) => acc + v.balance, 0);

  useEffect(() => { 
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
  }, []);

    // Realtime : refresh data when DB changes
    useEffect(() => {
        const unsubscribe = subscribeEconome({
            onVaults: () => loadData(),
            onTransactions: () => loadData(),
            onRegister: () => loadData()
        });
        return unsubscribe;
    }, [startDate, endDate]);

  useEffect(() => { 
      if(startDate && endDate) loadData(); 
  }, [startDate, endDate]);

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT TDB...</div>;

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0 no-print">
          <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-900"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Supervision Générale</span>
          </div>
          
          <div className="flex items-center gap-3">
              {/* FILTRES DATES */}
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
                  <Calendar size={12} className="text-gray-500 mr-2"/>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none text-gray-700"/>
                  <span className="mx-1 text-gray-400">-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none text-gray-700"/>
              </div>

              <button onClick={handlePrint} className="bg-gray-800 text-white px-3 py-1 rounded shadow-sm flex items-center gap-2 font-bold text-[10px] h-7 hover:bg-black transition active:scale-95">
                  <Printer size={12}/> RAPPORT
              </button>

              <div className="relative">
                  <button className={`bg-white border ${notifications.length > 0 ? 'border-red-300 text-red-600' : 'border-gray-300 text-gray-500'} p-1 rounded h-7 w-7 flex items-center justify-center transition hover:bg-gray-50`}>
                      <Bell size={14}/>
                  </button>
                  {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] w-3 h-3 flex items-center justify-center rounded-full font-bold">{notifications.length}</span>}
              </div>
              
              <button onClick={loadData}><RefreshCw size={14} className="text-blue-600 hover:rotate-180 transition"/></button>
          </div>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden">
          
          {/* COLONNE GAUCHE (KPIS + ALERTES) */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              
              {/* KPIs HAUT DE GAMME */}
              <div className="grid grid-cols-3 gap-2 h-20 shrink-0">
                  <div className="bg-white p-2 rounded shadow-sm border-l-4 border-blue-500 flex flex-col justify-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Trésorerie Globale</p>
                      <h3 className="text-xl font-bold text-blue-900 font-mono mt-1">{totalGlobal.toLocaleString()} <span className="text-[10px] text-gray-400 font-sans">Ar</span></h3>
                  </div>
                  <div className="bg-white p-2 rounded shadow-sm border-l-4 border-green-500 flex flex-col justify-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Recettes (Période)</p>
                      <h3 className="text-xl font-bold text-green-600 font-mono mt-1">+{stats.recette.toLocaleString()} <span className="text-[10px] text-gray-400 font-sans">Ar</span></h3>
                  </div>
                  <div className="bg-white p-2 rounded shadow-sm border-l-4 border-red-500 flex flex-col justify-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Dépenses (Période)</p>
                      <h3 className="text-xl font-bold text-red-600 font-mono mt-1">-{stats.depense.toLocaleString()} <span className="text-[10px] text-gray-400 font-sans">Ar</span></h3>
                  </div>
              </div>

              {/* NOTIFICATIONS (Si présentes) */}
              {notifications.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 max-h-32 overflow-y-auto shrink-0 shadow-inner">
                      <h3 className="text-red-800 font-bold flex items-center gap-1 text-[10px] uppercase mb-1 sticky top-0 bg-red-50 pb-1"><AlertTriangle size={12}/> Alertes Système</h3>
                      <div className="space-y-1">
                          {notifications.map(n => (
                              <div key={n.id} className="bg-white p-1.5 rounded flex justify-between items-center shadow-sm border border-red-100">
                                  <p className="text-[10px] text-gray-600">{n.message}</p>
                                  <button onClick={() => markAsRead(n.id)} className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded font-bold hover:bg-gray-200">VU</button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* VALIDATIONS EN ATTENTE */}
              <div className="shrink-0 no-print">
                  <PendingValidations />
              </div>

              {/* GRAPHIQUES & COMPTES */}
              <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
                  
                  {/* DETAIL COMPTES */}
                  <div className="bg-white border border-gray-300 rounded shadow-sm flex flex-col overflow-hidden">
                      <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex justify-between items-center shrink-0">
                          <span className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-1"><Wallet size={12}/> État des Caisses</span>
                      </div>
                      <div className="flex-1 overflow-auto p-2 space-y-2">
                          {vaults.map(v => (
                              <div key={v.id} className="flex justify-between items-center p-2 bg-gray-50 border border-gray-200 rounded hover:bg-white hover:border-blue-300 transition group">
                                  <div className="flex items-center gap-2">
                                      <span className="text-lg bg-white w-8 h-8 flex items-center justify-center rounded-full border border-gray-100 shadow-sm">{v.icon}</span>
                                      <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-blue-700">{v.name}</span>
                                  </div>
                                  <span className="font-mono font-bold text-sm text-gray-800">{v.balance.toLocaleString()} Ar</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* PIE CHART */}
                  <div className="bg-white border border-gray-300 rounded shadow-sm flex flex-col overflow-hidden">
                      <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex justify-between items-center shrink-0">
                          <span className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-1"><Activity size={12}/> Top Dépenses</span>
                      </div>
                      <div className="flex-1 relative min-h-[150px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none"/>)}
                                  </Pie>
                                  <Tooltip contentStyle={{fontSize:'10px', borderRadius:'4px'}}/>
                              </PieChart>
                          </ResponsiveContainer>
                          {/* Légende */}
                          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center text-[9px]">
                              {chartData.map((entry, index) => (
                                  <div key={index} className="flex items-center gap-1 bg-gray-50 px-1 rounded border">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                      <span className="truncate max-w-[60px]">{entry.name}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </div>

      {/* FOOTER IMPRESSION */}
      <div className="hidden print:block mt-8 pt-4 border-t border-black text-xs">
          <div className="flex justify-between">
              <p>Édité le {new Date().toLocaleDateString()}</p>
              <p className="font-bold uppercase">Visa Direction</p>
          </div>
      </div>
    </div>
  );
}
