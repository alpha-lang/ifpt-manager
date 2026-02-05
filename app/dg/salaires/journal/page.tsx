'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, Search, FileText, ArrowLeft, Calendar, RefreshCw, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Transaction = {
  id: string;
  created_at: string;
  description?: string | null;
  amount: number;
  vaults?: { name?: string | null } | null;
  [key: string]: unknown;
};

export default function JournalSalaires() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();
  const [dateStart, setDateStart] = useState(`${currentYear}-01-01`);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let res = transactions;
    if (dateStart) res = res.filter(t => t.created_at >= `${dateStart}T00:00:00`);
    if (dateEnd) res = res.filter(t => t.created_at <= `${dateEnd}T23:59:59`);
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        res = res.filter(t => t.description.toLowerCase().includes(lower) || t.amount.toString().includes(lower));
    }
    setFiltered(res);
  }, [transactions, dateStart, dateEnd, searchTerm]);

  const loadSalaries = async () => {
    setLoading(true);
    const { data } = await supabase.from('transactions')
        .select('*, vaults!transactions_vault_id_fkey(name)')
        .eq('type', 'DEPENSE')
        .eq('category', 'SALAIRE')
        .order('created_at', { ascending: false });
    setTransactions((data ?? []) as Transaction[]);
    setLoading(false);
  };

  const total = filtered.reduce((acc, t) => acc + t.amount, 0);

  useEffect(() => { loadSalaries(); }, []);

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT SALAIRES...</div>;

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0 no-print">
          <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition border border-gray-200">
                  <ArrowLeft size={14}/>
              </button>
              <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-600"/>
                  <span className="font-bold text-gray-700 uppercase tracking-tight">Journal des Paies</span>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold text-[10px]">
                  TOTAL PÉRIODE: {total.toLocaleString()} Ar
              </div>
              <button onClick={() => loadSalaries()}><RefreshCw size={14} className="text-blue-600 hover:rotate-180 transition"/></button>
          </div>
      </div>

      {/* BARRE D'OUTILS FILTRES */}
      <div className="bg-white p-2 border border-gray-300 shadow-sm mt-2 flex flex-wrap gap-2 items-center shrink-0 no-print">
          
          {/* DATES */}
          <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
              <Calendar size={12} className="text-gray-500 mr-2"/>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none text-gray-700"/>
              <span className="mx-1 text-gray-400">-</span>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none text-gray-700"/>
          </div>

          {/* RECHERCHE */}
          <div className="relative flex-1">
              <Search className="absolute left-2 top-1.5 text-gray-400" size={12}/>
              <input 
                  placeholder="Rechercher (Nom, Montant)..." 
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-7 pr-2 h-7 border border-gray-300 rounded text-[10px] outline-none focus:border-blue-500 font-bold"
              />
          </div>

          {/* BOUTON IMPRESSION */}
          <button onClick={() => window.print()} className="bg-gray-800 text-white px-3 py-1 rounded shadow-sm flex items-center gap-2 font-bold text-[10px] h-7 hover:bg-black transition active:scale-95">
              <Printer size={12}/> IMPRIMER LISTE
          </button>
      </div>

      {/* TABLEAU (Style Sage) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden print:border-none print:shadow-none">
          
          {/* En-tête spécial Impression */}
          <div className="hidden print:block text-center mb-4 border-b pb-4 pt-4">
              <h1 className="text-xl font-bold uppercase">Journal des Salaires Décaissés</h1>
              <p className="text-sm">Période du {new Date(dateStart).toLocaleDateString()} au {new Date(dateEnd).toLocaleDateString()}</p>
          </div>

          <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                      <tr>
                          <th className="p-2 border-r border-gray-300 w-24">Date</th>
                          <th className="p-2 border-r border-gray-300">Employé / Libellé Paie</th>
                          <th className="p-2 border-r border-gray-300 w-32">Mode Paiement</th>
                          <th className="p-2 border-r border-gray-300 w-24 text-right">Net Payé</th>
                          <th className="p-2 text-center w-16 no-print">Fiche</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                      {filtered.map((t, i) => (
                          <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors print:bg-white`}>
                              <td className="p-2 border-r border-gray-100 text-gray-500">
                                  {new Date(t.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-2 border-r border-gray-100 font-bold text-gray-700 font-sans uppercase">
                                  {t.description}
                              </td>
                              <td className="p-2 border-r border-gray-100 text-gray-600 font-sans text-[9px]">
                                  {t.vaults?.name}
                              </td>
                              <td className="p-2 border-r border-gray-100 text-right font-bold text-blue-900 bg-blue-50/30">
                                  {t.amount.toLocaleString()} Ar
                              </td>
                              <td className="p-1 text-center no-print">
                                  <button 
                                      onClick={() => window.open(`/print/salaire?id=${t.id}`, '_blank')} 
                                      className="text-gray-400 hover:text-blue-600 transition p-1"
                                      title="Imprimer Fiche Individuelle"
                                  >
                                      <Printer size={12}/>
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {filtered.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic text-[10px]">Aucun salaire trouvé sur cette période.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* PIED DE PAGE : TOTAUX */}
          <div className="bg-gray-100 font-bold border-t border-gray-300 flex text-[10px] uppercase shrink-0">
              <div className="p-2 flex-1 text-right text-gray-600 border-r border-gray-300 flex items-center justify-end">
                  <Banknote size={12} className="mr-2"/> Total Salaires Versés :
              </div>
              <div className="p-2 w-32 text-right text-blue-900 border-r border-gray-300 bg-blue-100">
                  {total.toLocaleString()} Ar
              </div>
              <div className="w-16 bg-gray-200 no-print"></div>
          </div>
      </div>

      <style jsx global>{`
        @media print {
            @page { margin: 15mm; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            aside, nav { display: none !important; } 
            main { margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
            div { overflow: visible !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
}
