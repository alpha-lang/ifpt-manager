'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Filter, Search, Calendar, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx'; 

type Vault = {
  id: string;
  name: string;
  [key: string]: unknown;
};

type Transaction = {
  id: string;
  created_at: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  vault_id: string;
  author?: string | null;
  vaults?: { name?: string | null } | null;
  [key: string]: unknown;
};

export default function DGAuditPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTRES ---
  const [dateStart, setDateStart] = useState(new Date().toISOString().slice(0, 8) + '01'); // 1er du mois
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().slice(0, 10)); // Aujourd'hui
  const [selectedVault, setSelectedVault] = useState('TOUS');
  const [selectedType, setSelectedType] = useState('TOUS');
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATS DE LA PÉRIODE ---
  const [stats, setStats] = useState({ recette: 0, depense: 0, solde: 0 });

  const loadData = async () => {
    setLoading(true);
    // On charge UNIQUEMENT les transactions validées pour un audit comptable propre
    const { data: tx } = await supabase.from('transactions')
        .select('*, vaults(name)')
        .eq('status', 'VALIDATED') 
        .order('created_at', { ascending: false });
    const { data: v } = await supabase.from('vaults').select('*').order('name');
    setTransactions((tx ?? []) as Transaction[]);
    setVaults((v ?? []) as Vault[]);
    setLoading(false);
  };

  const applyFilters = () => {
    let res = transactions;

    // Filtres
    if (dateStart) res = res.filter(t => t.created_at >= `${dateStart}T00:00:00`);
    if (dateEnd) res = res.filter(t => t.created_at <= `${dateEnd}T23:59:59`);
    if (selectedVault !== 'TOUS') res = res.filter(t => t.vault_id === selectedVault);
    if (selectedType !== 'TOUS') res = res.filter(t => t.type === selectedType);
    
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        res = res.filter(t => 
            t.description.toLowerCase().includes(lower) || 
            t.category.toLowerCase().includes(lower) ||
            t.amount.toString().includes(lower)
        );
    }

    setFiltered(res);

    // Calcul des totaux sur la sélection
    const r = res.filter(t => t.type === 'RECETTE').reduce((a, b) => a + b.amount, 0);
    const d = res.filter(t => t.type === 'DEPENSE').reduce((a, b) => a + b.amount, 0);
    setStats({ recette: r, depense: d, solde: r - d });
  };

  useEffect(() => { loadData(); }, []);

  // Ré-appliquer les filtres quand une variable change
  useEffect(() => {
    applyFilters();
  }, [transactions, dateStart, dateEnd, selectedVault, selectedType, searchTerm]);

  // --- EXPORT EXCEL (.XLSX) ---
  const exportToExcel = () => {
    if (filtered.length === 0) return;

    const dataToExport = filtered.map(t => ({
        "Date": new Date(t.created_at).toLocaleDateString(),
        "Heure": new Date(t.created_at).toLocaleTimeString(),
        "Type": t.type,
        "Catégorie": t.category,
        "Description": t.description,
        "Compte / Caisse": t.vaults?.name || '?',
        "Entrée": t.type === 'RECETTE' ? t.amount : 0,
        "Sortie": t.type === 'DEPENSE' ? t.amount : 0,
        "Auteur": t.author || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [{wch: 12}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 40}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}];
    ws['!cols'] = wscols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal IFPT");
    XLSX.writeFile(wb, `AUDIT_IFPT_${dateStart}_au_${dateEnd}.xlsx`);
  };

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT AUDIT...</div>;

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
        <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-green-700"/>
            <span className="font-bold text-gray-700 uppercase tracking-tight">Journal Général & Audit</span>
        </div>
        <button onClick={exportToExcel} className="bg-green-700 text-white px-3 py-1 rounded shadow-sm flex items-center gap-2 font-bold text-[10px] hover:bg-green-800 transition active:scale-95">
            <Download size={12}/> EXPORT EXCEL
        </button>
      </div>

      {/* BARRE D'OUTILS DE FILTRES */}
      <div className="bg-white p-2 border border-gray-300 shadow-sm mt-2 flex flex-wrap gap-2 items-center shrink-0">
        
        {/* DATES */}
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
            <Calendar size={12} className="text-gray-500 mr-2"/>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none"/>
            <span className="mx-1 text-gray-400">-</span>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none"/>
        </div>

        {/* COMPTE */}
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
            <span className="text-[9px] font-bold text-gray-400 uppercase mr-2">Compte</span>
            <select value={selectedVault} onChange={e => setSelectedVault(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none w-24 cursor-pointer">
                <option value="TOUS">TOUS</option>
                {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
        </div>

        {/* TYPE */}
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
            <span className="text-[9px] font-bold text-gray-400 uppercase mr-2">Sens</span>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none w-20 cursor-pointer">
                <option value="TOUS">TOUT</option>
                <option value="RECETTE">ENTRÉES</option>
                <option value="DEPENSE">SORTIES</option>
            </select>
        </div>

        {/* RECHERCHE */}
        <div className="relative flex-1">
            <Search className="absolute left-2 top-1.5 text-gray-400" size={12}/>
            <input 
                placeholder="Recherche (Libellé, Montant)..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-7 pr-2 h-7 border border-gray-300 rounded text-[10px] outline-none focus:border-blue-500"
            />
        </div>

        <button onClick={loadData}><RefreshCw size={14} className="text-blue-600 hover:rotate-180 transition"/></button>
      </div>

      {/* KPIS RAPIDES */}
      <div className="grid grid-cols-3 gap-2 mt-2 shrink-0 h-16">
          <div className="bg-green-50 border border-green-200 p-2 rounded flex justify-between items-center shadow-sm">
              <div>
                  <p className="text-[9px] uppercase font-bold text-green-700">Total Recettes</p>
                  <p className="text-sm font-bold text-green-900 font-mono">+{stats.recette.toLocaleString()} Ar</p>
              </div>
              <ArrowUpCircle className="text-green-400 opacity-50" size={24}/>
          </div>
          <div className="bg-red-50 border border-red-200 p-2 rounded flex justify-between items-center shadow-sm">
              <div>
                  <p className="text-[9px] uppercase font-bold text-red-700">Total Dépenses</p>
                  <p className="text-sm font-bold text-red-900 font-mono">-{stats.depense.toLocaleString()} Ar</p>
              </div>
              <ArrowDownCircle className="text-red-400 opacity-50" size={24}/>
          </div>
          <div className={`border p-2 rounded flex justify-between items-center shadow-sm ${stats.solde >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <div>
                  <p className={`text-[9px] uppercase font-bold ${stats.solde >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Résultat Période</p>
                  <p className={`text-sm font-bold font-mono ${stats.solde >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                    {stats.solde > 0 ? '+' : ''}{stats.solde.toLocaleString()} Ar
                  </p>
              </div>
              <Filter className={`${stats.solde >= 0 ? 'text-blue-400' : 'text-orange-400'} opacity-50`} size={24}/>
          </div>
      </div>

      {/* TABLEAU DES DONNÉES (Style Sage) */}
      <div className="flex-1 bg-white rounded shadow-sm border border-gray-400 overflow-hidden flex flex-col mt-2">
        <div className="overflow-auto flex-1 bg-white relative">
            <table className="w-full text-left text-[10px] border-collapse">
                <thead className="bg-gray-200 text-gray-600 uppercase font-bold sticky top-0 z-10 shadow-sm text-[9px]">
                    <tr>
                        <th className="p-2 border-r border-gray-300 w-24">Date</th>
                        <th className="p-2 border-r border-gray-300 w-20 text-center">Type</th>
                        <th className="p-2 border-r border-gray-300 w-32">Catégorie</th>
                        <th className="p-2 border-r border-gray-300">Libellé de l&apos;écriture</th>
                        <th className="p-2 border-r border-gray-300 w-24">Compte</th>
                        <th className="p-2 border-r border-gray-300 w-24">Auteur</th>
                        <th className="p-2 text-right w-24 bg-gray-50">Montant</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                    {filtered.map((t, i) => (
                        <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                            <td className="p-2 border-r border-gray-100 text-gray-500">
                                {new Date(t.created_at).toLocaleDateString()} 
                                <span className="text-[8px] opacity-50 ml-1">{new Date(t.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="p-2 border-r border-gray-100 text-center">
                                {t.type === 'RECETTE' && <span className="text-green-700 font-bold text-[9px]">RECETTE</span>}
                                {t.type === 'DEPENSE' && <span className="text-red-700 font-bold text-[9px]">DEPENSE</span>}
                                {t.type === 'TRANSFERT' && <span className="text-blue-700 font-bold text-[9px]">VIR. INT</span>}
                            </td>
                            <td className="p-2 border-r border-gray-100 font-bold text-gray-700 font-sans text-[9px]">{t.category}</td>
                            <td className="p-2 border-r border-gray-100 text-gray-600 truncate max-w-md font-sans" title={t.description}>{t.description}</td>
                            <td className="p-2 border-r border-gray-100 text-blue-600 text-[9px] font-bold font-sans">
                                {t.vaults?.name}
                            </td>
                            <td className="p-2 border-r border-gray-100 text-gray-400 italic font-sans">{t.author?.substring(0,10)}</td>
                            <td className={`p-2 text-right font-bold ${t.type === 'RECETTE' ? 'text-green-700' : 'text-red-700'} bg-gray-50/50`}>
                                {t.type === 'RECETTE' ? '+' : '-'}{t.amount.toLocaleString()}
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic text-[10px]">Aucune écriture trouvée.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="p-1 bg-gray-100 border-t border-gray-300 text-right text-[9px] text-gray-500 pr-2">
            {filtered.length} lignes trouvées
        </div>
      </div>
    </div>
  );
}
