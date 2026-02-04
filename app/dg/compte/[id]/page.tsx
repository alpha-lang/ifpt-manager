'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Printer, Calendar, TrendingUp, TrendingDown, ArrowRightLeft, RefreshCw, Wallet } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation'; 

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [vault, setVault] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [realBalance, setRealBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filtres Dates (Par défaut : Mois en cours)
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [dateStart, setDateStart] = useState(firstDay);
  const [dateEnd, setDateEnd] = useState(today);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  useEffect(() => {
    applyFilters();
  }, [transactions, dateStart, dateEnd]);

  const loadData = async (vaultId: string) => {
    setLoading(true);

    // 1. Info du Coffre
    const { data: v } = await supabase.from('vaults').select('*').eq('id', vaultId).single();
    
    // 2. TOUTES les transactions VALIDÉES de ce coffre
    const { data: tx } = await supabase.from('transactions')
        .select('*')
        .eq('vault_id', vaultId)
        .eq('status', 'VALIDATED')
        .order('created_at', { ascending: false });

    if (v && tx) {
        setVault(v);
        setTransactions(tx);
        
        // CALCUL DU SOLDE RÉEL (Basé sur tout l'historique)
        const sumMouvements = tx.reduce((acc, t) => {
            if (t.type === 'RECETTE') return acc + t.amount;
            if (t.type === 'DEPENSE') return acc - t.amount;
            if (t.type === 'TRANSFERT') return acc + t.amount; // Montant déjà signé dans la base pour les transferts
            return acc;
        }, 0);

        setRealBalance(sumMouvements); 
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let res = transactions;
    if (dateStart) res = res.filter(t => t.created_at >= `${dateStart}T00:00:00`);
    if (dateEnd) res = res.filter(t => t.created_at <= `${dateEnd}T23:59:59`);
    setFiltered(res);
  };

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT COMPTE...</div>;
  if (!vault) return <div className="p-10 text-center text-red-500 font-bold">COMPTE INTROUVABLE</div>;

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT (Navigation + Infos + Filtres) */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-12 shrink-0 no-print">
        <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition border border-gray-200">
                <ArrowLeft size={14}/>
            </button>
            <div>
                <h1 className="text-sm font-bold uppercase text-gray-800 flex items-center gap-2">
                    <span className="text-xl">{vault.icon}</span> {vault.name}
                </h1>
                <p className="text-[10px] text-gray-400 font-mono">ID: {vault.id.split('-')[0].toUpperCase()}</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
             {/* SOLDE ACTUEL (Highlight) */}
             <div className="text-right border-r pr-4 border-gray-200 mr-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase block flex items-center justify-end gap-1"><Wallet size={10}/> Solde Actuel</span>
                <span className={`text-lg font-bold font-mono ${realBalance < 0 ? 'text-red-600' : 'text-blue-800'}`}>
                    {realBalance.toLocaleString()} Ar
                </span>
            </div>

            {/* FILTRES DATES */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-2 py-1 h-8">
                <Calendar size={12} className="text-gray-500"/>
                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none text-gray-700"/>
                <span className="text-gray-400">-</span>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none text-gray-700"/>
            </div>

            <button onClick={() => window.print()} className="bg-gray-800 text-white px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-2 hover:bg-black transition active:scale-95 h-8">
                <Printer size={12}/> RELEVÉ
            </button>
            <button onClick={() => loadData(id)} className="text-blue-600 hover:rotate-180 transition"><RefreshCw size={14}/></button>
        </div>
      </div>

      {/* JOURNAL / TABLEAU (Style Sage) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden print:border-none print:shadow-none">
        
        {/* En-tête spécial Impression */}
        <div className="hidden print:block text-center mb-6 border-b pb-4 pt-4">
            <h1 className="text-2xl font-bold uppercase">Relevé de Compte : {vault.name}</h1>
            <p className="text-sm">Période du {new Date(dateStart).toLocaleDateString()} au {new Date(dateEnd).toLocaleDateString()}</p>
            <div className="mt-4 text-right">
                <span className="font-bold border border-black px-4 py-1">Solde arrêté : {realBalance.toLocaleString()} Ar</span>
            </div>
        </div>

        <div className="flex-1 overflow-auto bg-white relative">
            <table className="w-full text-left text-[10px] border-collapse">
                <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                    <tr>
                        <th className="p-2 border-r border-gray-300 w-24">Date</th>
                        <th className="p-2 border-r border-gray-300 w-20 text-center">Type</th>
                        <th className="p-2 border-r border-gray-300">Libellé / Description</th>
                        <th className="p-2 border-r border-gray-300 w-28 text-right bg-green-50">Crédit (+)</th>
                        <th className="p-2 border-r border-gray-300 w-28 text-right bg-red-50">Débit (-)</th>
                        <th className="p-2 text-center w-16">Auteur</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                    {filtered.map((t, i) => {
                        let credit = 0;
                        let debit = 0;
                        
                        if (t.type === 'RECETTE') credit = t.amount;
                        else if (t.type === 'DEPENSE') debit = t.amount;
                        else if (t.type === 'TRANSFERT') {
                            if (t.amount > 0) credit = t.amount;
                            else debit = Math.abs(t.amount);
                        }

                        return (
                            <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors print:bg-white`}>
                                <td className="p-2 border-r border-gray-100 text-gray-500">
                                    {new Date(t.created_at).toLocaleDateString()} 
                                    <span className="text-[8px] opacity-50 ml-1">{new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </td>
                                <td className="p-2 border-r border-gray-100 text-center">
                                    {t.type === 'RECETTE' && <span className="text-green-700 font-bold text-[9px] flex items-center justify-center gap-1"><TrendingUp size={8}/> REC</span>}
                                    {t.type === 'DEPENSE' && <span className="text-red-700 font-bold text-[9px] flex items-center justify-center gap-1"><TrendingDown size={8}/> DEP</span>}
                                    {t.type === 'TRANSFERT' && <span className="text-blue-700 font-bold text-[9px] flex items-center justify-center gap-1"><ArrowRightLeft size={8}/> VIR</span>}
                                </td>
                                <td className="p-2 border-r border-gray-100 font-medium text-gray-700 font-sans truncate max-w-lg" title={t.description}>
                                    <span className="font-bold text-[9px] text-gray-400 uppercase mr-1">{t.category} :</span>
                                    {t.description}
                                </td>
                                <td className="p-2 border-r border-gray-100 text-right font-bold text-green-700 bg-green-50/20">
                                    {credit > 0 ? credit.toLocaleString() : '-'}
                                </td>
                                <td className="p-2 border-r border-gray-100 text-right font-bold text-red-700 bg-red-50/20">
                                    {debit > 0 ? debit.toLocaleString() : '-'}
                                </td>
                                <td className="p-2 text-center text-gray-400 italic text-[9px]">
                                    {t.author?.substring(0,8)}
                                </td>
                            </tr>
                        );
                    })}
                    {filtered.length === 0 && (
                        <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic text-[10px]">Aucune opération sur cette période.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* PIED DE PAGE : TOTAUX PÉRIODE */}
        <div className="bg-gray-100 font-bold border-t border-gray-300 flex text-[10px] uppercase shrink-0">
            <div className="p-2 flex-1 text-right text-gray-600 border-r border-gray-300 flex items-center justify-end">Mouvements Période :</div>
            <div className="p-2 w-28 text-right text-green-800 border-r border-gray-300 bg-green-100">
                +{filtered.reduce((acc, t) => {
                     if (t.type === 'RECETTE' || (t.type === 'TRANSFERT' && t.amount > 0)) return acc + t.amount;
                     return acc;
                }, 0).toLocaleString()}
            </div>
            <div className="p-2 w-28 text-right text-red-800 border-r border-gray-300 bg-red-100">
                -{filtered.reduce((acc, t) => {
                     if (t.type === 'DEPENSE') return acc + t.amount;
                     if (t.type === 'TRANSFERT' && t.amount < 0) return acc + Math.abs(t.amount);
                     return acc;
                }, 0).toLocaleString()}
            </div>
            <div className="w-16 bg-gray-200"></div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
            @page { margin: 10mm; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            aside, nav { display: none !important; } 
            main { margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
            /* Force table expansion */
            div { overflow: visible !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
}