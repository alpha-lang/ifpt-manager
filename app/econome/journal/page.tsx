'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Eye, CheckCircle, XCircle, Search, X, Printer, Lock } from 'lucide-react';

export default function HistoriquePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // MODAL DETAILS
  const [selectedSession, setSelectedSession] = useState<any>(null); // La session qu'on regarde
  const [details, setDetails] = useState<any[]>([]); // Les transactions de cette session
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    // On charge les sessions de caisse (journaux)
    const { data } = await supabase.from('cash_registers')
      .select('*')
      .order('opening_date', { ascending: false }); // Du plus récent au plus vieux
    setSessions(data || []);
    setLoading(false);
  };

  const openDetails = async (session: any) => {
    setSelectedSession(session);
    setLoadingDetails(true);
    // On charge les transactions de CETTE session
    const { data } = await supabase.from('transactions')
      .select('*, vaults(name)') // On joint la table vaults pour avoir le nom du coffre
      .eq('register_id', session.id)
      .order('created_at', { ascending: false });
    setDetails(data || []);
    setLoadingDetails(false);
  };

  const closeDetails = () => {
    setSelectedSession(null);
    setDetails([]);
  };

  // Calculs Totaux pour la modale
  const totalRecette = details.filter(t => t.type === 'RECETTE').reduce((a, b) => a + b.amount, 0);
  const totalDepense = details.filter(t => t.type === 'DEPENSE').reduce((a, b) => a + b.amount, 0);

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT HISTORIQUE...</div>;

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-gray-100 p-2 text-xs font-sans overflow-hidden">
      
      {/* HEADER PAGE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
        <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-600"/>
            <span className="font-bold text-gray-700 uppercase tracking-tight">Historique des Journaux</span>
        </div>
        <span className="text-gray-400 text-[10px] font-mono">{sessions.length} SESSIONS ARCHIVÉES</span>
      </div>

      {/* TABLEAU DES SESSIONS (JOURNAUX) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden">
        <div className="flex-1 overflow-auto bg-white relative">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                <tr>
                  <th className="p-2 border-r border-gray-300 w-32">Date Ouv.</th>
                  <th className="p-2 border-r border-gray-300 w-32">Date Clôture</th>
                  <th className="p-2 border-r border-gray-300">Responsable</th>
                  <th className="p-2 border-r border-gray-300 text-center w-24">Statut</th>
                  <th className="p-2 border-r border-gray-300 text-right w-32">Solde Ouverture</th>
                  <th className="p-2 border-r border-gray-300 text-right w-32">Solde Clôture</th>
                  <th className="p-2 text-center w-12">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {sessions.map((s, i) => {
                    const isOpen = s.status === 'OPEN';
                    return (
                    <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="p-2 border-r border-gray-100 text-gray-600">
                            {new Date(s.opening_date).toLocaleDateString()}
                        </td>
                        <td className="p-2 border-r border-gray-100 text-gray-500">
                            {s.closing_date ? new Date(s.closing_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-2 border-r border-gray-100 text-gray-800 font-bold font-sans text-[10px] uppercase">
                            {s.opened_by || 'ECONOME'}
                        </td>
                        <td className="p-2 border-r border-gray-100 text-center">
                            {isOpen ? (
                                <span className="text-green-700 font-bold text-[9px] bg-green-50 px-1 rounded border border-green-100">OUVERT</span>
                            ) : (
                                <span className="text-gray-500 font-bold text-[9px] bg-gray-100 px-1 rounded border border-gray-200">CLÔTURÉ</span>
                            )}
                        </td>
                        <td className="p-2 border-r border-gray-100 text-right text-gray-600">
                            {s.opening_amount?.toLocaleString()}
                        </td>
                        <td className="p-2 border-r border-gray-100 text-right font-bold text-blue-800">
                            {isOpen ? '...' : (s.closing_balance_global?.toLocaleString())}
                        </td>
                        <td className="p-1 text-center">
                            <button onClick={() => openDetails(s)} className="text-blue-500 hover:text-blue-700 transition" title="Consulter le journal">
                                <Eye size={14}/>
                            </button>
                        </td>
                    </tr>
                )})}
              </tbody>
            </table>
        </div>
      </div>

      {/* --- MODALE DÉTAILS (Overlay Style Sage) --- */}
      {selectedSession && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded shadow-2xl w-full max-w-5xl h-[90%] flex flex-col border border-gray-400 overflow-hidden">
                
                {/* Header Modale */}
                <div className="p-2 px-3 border-b bg-gray-100 flex justify-between items-center h-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-700 text-xs uppercase flex items-center gap-2">
                            <Lock size={14}/> JOURNAL DU {new Date(selectedSession.opening_date).toLocaleDateString()}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold ${selectedSession.status==='OPEN'?'bg-green-100 text-green-700 border-green-200':'bg-gray-200 text-gray-600 border-gray-300'}`}>
                            ID: {selectedSession.id.split('-')[0].toUpperCase()}
                        </span>
                    </div>
                    <button onClick={closeDetails} className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded transition"><X size={16}/></button>
                </div>

                {/* Contenu Tableau Détails */}
                <div className="flex-1 overflow-auto bg-gray-50 p-2">
                    <div className="bg-white border border-gray-300 shadow-sm min-h-full">
                    {loadingDetails ? <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT ECRITURES...</div> : (
                        <table className="w-full text-left text-[10px] border-collapse">
                            <thead className="bg-gray-100 text-gray-600 uppercase font-bold sticky top-0 border-b z-10 shadow-sm text-[9px]">
                                <tr>
                                    <th className="p-1.5 border-r border-gray-300 w-16 text-center">Heure</th>
                                    <th className="p-1.5 border-r border-gray-300 w-20 text-center">Type</th>
                                    <th className="p-1.5 border-r border-gray-300 w-32">Catégorie</th>
                                    <th className="p-1.5 border-r border-gray-300">Libellé de l'écriture</th>
                                    <th className="p-1.5 border-r border-gray-300 w-24">Caisse/Banque</th>
                                    <th className="p-1.5 border-r border-gray-300 text-right w-24">Débit</th>
                                    <th className="p-1.5 text-right w-24">Crédit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                                {details.map((t, i) => (
                                    <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                                        <td className="p-1.5 border-r border-gray-200 text-gray-400 text-center">
                                            {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="p-1.5 border-r border-gray-200 text-center">
                                            {t.type === 'RECETTE' 
                                                ? <span className="text-green-700 font-bold">RECETTE</span> 
                                                : <span className="text-red-700 font-bold">DEPENSE</span>
                                            }
                                        </td>
                                        <td className="p-1.5 border-r border-gray-200 font-bold text-gray-700 font-sans text-[9px]">{t.category}</td>
                                        <td className="p-1.5 border-r border-gray-200 text-gray-600 truncate max-w-xs font-sans" title={t.description}>{t.description}</td>
                                        <td className="p-1.5 border-r border-gray-200 text-blue-600 text-[9px]">{t.vaults?.name}</td>
                                        
                                        {/* Débit (Dépense) */}
                                        <td className="p-1.5 border-r border-gray-200 text-right font-bold text-red-700 bg-red-50/20">
                                            {t.type==='DEPENSE' ? t.amount.toLocaleString() : '-'}
                                        </td>

                                        {/* Crédit (Recette) */}
                                        <td className="p-1.5 text-right font-bold text-green-700 bg-green-50/20">
                                            {t.type==='RECETTE' ? t.amount.toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {details.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-400 italic">Aucune transaction enregistrée</td></tr>}
                            </tbody>
                        </table>
                    )}
                    </div>
                </div>

                {/* Footer Totaux Modale */}
                <div className="p-2 px-3 bg-gray-100 border-t flex justify-between items-center h-12 shrink-0">
                    <button 
                        onClick={() => window.open(`/print/journal?id=${selectedSession.id}`, '_blank')} 
                        className="bg-gray-800 text-white px-3 py-1.5 rounded shadow-sm text-[10px] font-bold hover:bg-black flex items-center gap-2 transition active:scale-95">
                        <Printer size={12}/> IMPRIMER JOURNAL
                    </button>

                    <div className="flex gap-6 font-mono text-[11px] bg-white border px-3 py-1 rounded shadow-sm">
                        <div className="text-green-700">Total Recettes: <b>{totalRecette.toLocaleString()} Ar</b></div>
                        <div className="text-red-700 border-l pl-4 ml-4 border-gray-300">Total Dépenses: <b>{totalDepense.toLocaleString()} Ar</b></div>
                        <div className="text-blue-800 border-l pl-4 ml-4 border-gray-300 bg-blue-50 px-2 rounded">
                            Balance: <b>{(totalRecette - totalDepense).toLocaleString()} Ar</b>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}