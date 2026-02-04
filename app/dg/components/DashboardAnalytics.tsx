'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, Activity, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardAnalytics() {
  const [dataFlow, setDataFlow] = useState<any[]>([]);
  const [dataPie, setDataPie] = useState<any[]>([]);
  const [kpi, setKpi] = useState({ totalRecette: 0, totalDepense: 0, soldeGlobal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    // 1. Charger tout l'historique validé
    const { data: tx } = await supabase.from('transactions')
        .select('amount, type, category, created_at')
        .eq('status', 'VALIDATED');
    
    if (tx) {
        // --- KPI GLOBAUX ---
        const r = tx.filter(t => t.type === 'RECETTE' || (t.type === 'TRANSFERT' && t.amount > 0)).reduce((a, b) => a + b.amount, 0);
        // Note: Pour les dépenses globales, on inclut les sorties (dépenses + transferts sortants)
        const d = tx.filter(t => t.type === 'DEPENSE' || (t.type === 'TRANSFERT' && t.amount < 0)).reduce((a, b) => a + Math.abs(b.amount), 0);
        
        // Solde global théorique (peut être différent de la somme des caisses si pas d'initialisation, mais bon indicateur de flux)
        setKpi({ totalRecette: r, totalDepense: d, soldeGlobal: r - d });

        // --- GRAPHIQUE 1 : FLUX MENSUEL (Bar Chart) ---
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        
        const flow = months.map((m, index) => {
            const monthTx = tx.filter(t => {
                const d = new Date(t.created_at);
                return d.getMonth() === index && d.getFullYear() === currentYear;
            });
            return {
                name: m,
                Entrées: monthTx.filter(t => t.type === 'RECETTE').reduce((a, b) => a + b.amount, 0),
                Sorties: monthTx.filter(t => t.type === 'DEPENSE').reduce((a, b) => a + b.amount, 0),
            };
        });
        setDataFlow(flow);

        // --- GRAPHIQUE 2 : RÉPARTITION DÉPENSES (Pie Chart) ---
        const depenses = tx.filter(t => t.type === 'DEPENSE');
        const categories = Array.from(new Set(depenses.map(t => t.category))); // Liste unique catégories
        
        const pie = categories.map(cat => ({
            name: cat,
            value: depenses.filter(t => t.category === cat).reduce((a, b) => a + b.amount, 0)
        })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 catégories
        
        setDataPie(pie);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CALCUL ANALYTICS...</div>;

  return (
    <div className="space-y-4">
        
        {/* CARTES KPI HAUT DE GAMME (Style Sage) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded shadow-sm border border-gray-300 flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Flux Net (Année)</p>
                    <h3 className={`text-xl font-bold font-mono mt-1 ${kpi.soldeGlobal >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                        {kpi.soldeGlobal > 0 ? '+' : ''}{kpi.soldeGlobal.toLocaleString()} <span className="text-[10px] text-gray-400 font-sans">Ar</span>
                    </h3>
                </div>
                <div className="bg-blue-50 p-2 rounded text-blue-600"><Activity size={20}/></div>
            </div>
            
            <div className="bg-white p-3 rounded shadow-sm border border-gray-300 flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Recettes Cumulées</p>
                    <h3 className="text-xl font-bold text-green-700 font-mono mt-1">+{kpi.totalRecette.toLocaleString()}</h3>
                </div>
                <div className="bg-green-50 p-2 rounded text-green-600"><ArrowUpCircle size={20}/></div>
            </div>
            
            <div className="bg-white p-3 rounded shadow-sm border border-gray-300 flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Dépenses Cumulées</p>
                    <h3 className="text-xl font-bold text-red-700 font-mono mt-1">-{kpi.totalDepense.toLocaleString()}</h3>
                </div>
                <div className="bg-red-50 p-2 rounded text-red-600"><ArrowDownCircle size={20}/></div>
            </div>
        </div>

        {/* SECTION GRAPHIQUES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-72">
            
            {/* BAR CHART: FLUX */}
            <div className="lg:col-span-2 bg-white p-3 rounded shadow-sm border border-gray-300 flex flex-col">
                <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                    <h4 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-1"><TrendingUp size={12}/> Évolution Trésorerie 2025</h4>
                </div>
                <div className="flex-1 w-full min-h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataFlow} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                            <XAxis dataKey="name" tick={{fontSize: 9, fill:'#6b7280'}} axisLine={false} tickLine={false} interval={0}/>
                            <YAxis tick={{fontSize: 9, fill:'#6b7280'}} axisLine={false} tickLine={false}/>
                            <Tooltip 
                                contentStyle={{borderRadius: '4px', border:'1px solid #e5e7eb', fontSize:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}} 
                                cursor={{fill: '#f3f4f6'}}
                            />
                            <Bar dataKey="Entrées" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12}/>
                            <Bar dataKey="Sorties" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={12}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* PIE CHART: DEPENSES */}
            <div className="bg-white p-3 rounded shadow-sm border border-gray-300 flex flex-col">
                <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                    <h4 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-1"><PieIcon size={12}/> Top Postes Dépenses</h4>
                </div>
                
                <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={dataPie} 
                                cx="50%" cy="50%" 
                                innerRadius={40} outerRadius={60} 
                                paddingAngle={2} 
                                dataKey="value"
                            >
                                {dataPie.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none"/> ))}
                            </Pie>
                            <Tooltip contentStyle={{fontSize:'10px', borderRadius:'4px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Légende au centre */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-bold text-gray-700">{dataPie.length}</span>
                        <span className="text-[8px] text-gray-400 uppercase">Postes</span>
                    </div>
                </div>
                
                <div className="mt-2 space-y-1 overflow-y-auto max-h-24 pr-1 scrollbar-thin">
                    {dataPie.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center text-[9px] border-b border-gray-50 pb-0.5 last:border-0">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                <span className="text-gray-600 truncate max-w-[80px]" title={entry.name}>{entry.name}</span>
                            </div>
                            <span className="font-mono font-bold text-gray-800">{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}