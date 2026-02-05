'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft, Receipt, ShieldCheck, Scale, Banknote } from 'lucide-react';

type BilletageDetail = {
  id: string;
  name: string;
  realBalance?: number | null;
  billetage?: Record<string, number> | null;
};

type Session = {
  id: string;
  opening_date: string;
  status: string;
  opened_by?: string | null;
  opening_balance_global?: number | null;
  closing_balance_global?: number | null;
  details_billetage?: BilletageDetail[] | null;
  [key: string]: unknown;
};

type Transaction = {
  id: string;
  created_at: string;
  type: string;
  category?: string | null;
  description?: string | null;
  amount: number;
  vaults?: { name?: string | null } | null;
  [key: string]: unknown;
};

function JournalPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [session, setSession] = useState<Session | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const { data: sess } = await supabase.from('cash_registers').select('*').eq('id', id).single();
    const { data: trans } = await supabase.from('transactions')
      .select('*, vaults!transactions_vault_id_fkey(name)')
      .eq('register_id', id)
      .order('created_at', { ascending: true });

    if (sess) {
      setSession(sess as Session);
      setTransactions((trans ?? []) as Transaction[]);
      setTimeout(() => window.print(), 1000);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-mono text-xs text-gray-400 animate-pulse">CHARGEMENT DES DONNÉES COMPTABLES...</div>;
  if (!session) return <div className="text-red-600 text-center p-10 font-bold border-2 border-red-600 m-10 uppercase">Erreur : Session de caisse introuvable</div>;

  const totalRecette = transactions.filter(t => t.type === 'RECETTE').reduce((a, b) => a + b.amount, 0);
  const totalDepense = transactions.filter(t => t.type === 'DEPENSE').reduce((a, b) => a + b.amount, 0);
  const soldeTheorique = (session.opening_balance_global || 0) + totalRecette - totalDepense;

  return (
    <div className="max-w-[21cm] mx-auto bg-white p-10 font-sans text-gray-900 min-h-screen relative">
      
      {/* BARRE DE RETOUR (Cachée à l'impression) */}
      <div className="no-print absolute top-2 left-0 right-0 flex justify-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black uppercase">
              <ArrowLeft size={12}/> Retour à l&apos;historique
          </button>
      </div>

      {/* HEADER LOGICIEL */}
      <div className="flex justify-between items-start border-b-4 border-gray-800 pb-4 mb-6">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-gray-900 flex items-center justify-center text-white text-[10px] font-black italic">IF</div>
                  <h2 className="font-black text-sm tracking-tighter uppercase">IFPT Manager <span className="font-light text-gray-400 tracking-normal">Audit</span></h2>
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-tight">Journal de Caisse Quotidien</p>
          </div>
          <div className="text-right border-l-2 border-gray-100 pl-6">
              <h1 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">BORDEREAU DE JOURNÉE</h1>
              <div className="bg-gray-100 text-gray-800 px-2 py-0.5 inline-block font-mono text-[10px] font-bold">
                  SESSION: #{session.id.split('-')[0].toUpperCase()}
              </div>
              <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">Date : {new Date(session.opening_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
      </div>

      {/* RÉCAPITULATIF FINANCIER DENSE */}
      <div className="grid grid-cols-4 border-2 border-gray-800 mb-8 divide-x-2 divide-gray-800">
          <div className="p-3 bg-gray-50">
              <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Report (J-1)</span>
              <span className="font-mono font-bold text-sm">{(session.opening_balance_global || 0).toLocaleString()} <span className="text-[9px]">Ar</span></span>
          </div>
          <div className="p-3">
              <span className="text-[8px] font-black text-green-600 uppercase block mb-1">Encaissements (+)</span>
              <span className="font-mono font-bold text-sm text-green-700">+{totalRecette.toLocaleString()}</span>
          </div>
          <div className="p-3">
              <span className="text-[8px] font-black text-red-600 uppercase block mb-1">Décaissements (-)</span>
              <span className="font-mono font-bold text-sm text-red-700">-{totalDepense.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-gray-800 text-white">
              <span className="text-[8px] font-black text-gray-400 uppercase block mb-1 tracking-widest underline decoration-blue-500">Solde Théorique</span>
              <span className="font-mono font-black text-sm">{soldeTheorique.toLocaleString()} <span className="text-[9px]">Ar</span></span>
          </div>
      </div>

      {/* TABLEAU DES OPÉRATIONS */}
      <div className="mb-10">
        <h3 className="font-black uppercase text-[9px] text-gray-400 mb-2 tracking-[0.2em] flex items-center gap-2">
            <Receipt size={12} className="text-gray-400"/> Journal détaillé des écritures
        </h3>
        <table className="w-full text-[10px] border-collapse border border-gray-200">
            <thead className="bg-gray-100 uppercase text-[8px] font-black text-gray-600">
                <tr>
                    <th className="p-2 border border-gray-200 w-16 text-center">Heure</th>
                    <th className="p-2 border border-gray-200 w-20 text-center">Flux</th>
                    <th className="p-2 border border-gray-200">Désignation de l&apos;opération</th>
                    <th className="p-2 border border-gray-200 w-24">Caisse</th>
                    <th className="p-2 border border-gray-200 w-28 text-right">Montant (Ar)</th>
                </tr>
            </thead>
            <tbody className="font-sans">
                {transactions.map((t, idx) => (
                    <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="p-2 border border-gray-200 text-center font-mono text-gray-500">
                            {new Date(t.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </td>
                        <td className="p-2 border border-gray-200 text-center">
                            <span className={`font-black text-[8px] px-1 rounded ${t.type === 'RECETTE' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                {t.type}
                            </span>
                        </td>
                        <td className="p-2 border border-gray-200 font-medium text-gray-700">
                            <span className="text-[8px] font-black text-gray-400 mr-2 uppercase">{t.category}</span>
                            {t.description}
                        </td>
                        <td className="p-2 border border-gray-200 text-gray-500 uppercase italic font-bold text-[9px]">
                            {t.vaults?.name}
                        </td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-bold text-gray-900">
                            {t.amount.toLocaleString()}
                        </td>
                    </tr>
                ))}
                {transactions.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Aucun mouvement enregistré pour cette session.</td></tr>
                )}
            </tbody>
        </table>
      </div>

      {/* SECTION CLÔTURE ET AUDIT PHYSIQUE (SI FERMÉ) */}
      {session.status === 'CLOSED' && (
          <div className="mt-12 pt-6 border-t-4 border-dotted border-gray-200 break-inside-avoid">
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white">
                      <ShieldCheck size={18}/>
                  </div>
                  <h3 className="font-black uppercase text-sm tracking-tighter text-gray-800">Procès-Verbal de Clôture & Audit Physique</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-10">
                  {/* Tableau des soldes réels */}
                  <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-2"><Scale size={12}/> Comparatif des soldes par caisse</h4>
                      <table className="w-full text-[10px] border-collapse border border-gray-800">
                          <thead className="bg-gray-800 text-white uppercase text-[8px]">
                              <tr>
                                  <th className="p-2 text-left">Coffre / Compte</th>
                                  <th className="p-2 text-right">Déclaré (Réel)</th>
                              </tr>
                          </thead>
                          <tbody className="font-mono">
                              {session.details_billetage?.map((d) => (
                                  <tr key={d.id} className="border-b border-gray-200">
                                      <td className="p-2 font-sans font-bold uppercase text-[9px] text-gray-600">{d.name}</td>
                                      <td className="p-2 text-right font-black text-gray-800">{d.realBalance?.toLocaleString()} Ar</td>
                                  </tr>
                              ))}
                              <tr className="bg-gray-50">
                                  <td className="p-2 font-sans font-black text-right uppercase text-[8px]">SOLDE TOTAL PHYSIQUE :</td>
                                  <td className="p-2 text-right text-sm font-black border-t-2 border-gray-800 text-blue-900 bg-blue-50">
                                    {session.closing_balance_global?.toLocaleString()} Ar
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-sm text-[9px] text-yellow-800 italic">
                        <b>Écart constaté :</b> {(session.closing_balance_global - soldeTheorique).toLocaleString()} Ar
                      </div>
                  </div>

                  {/* Billetage Espèces */}
                  <div className="space-y-4">
                    <h4 className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-2"><Banknote size={12}/> Détail du billetage (Espèces)</h4>
                    {session.details_billetage?.find((d) => d.billetage)?.billetage ? (
                        <div className="border border-gray-200 p-3 bg-white">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[10px]">
                                {Object.entries(session.details_billetage.find((d) => d.billetage)?.billetage ?? {})
                                  .sort((a,b) => parseInt(b[0]) - parseInt(a[0]))
                                  .map(([val, count]) => (
                                    count > 0 && (
                                        <div key={val} className="flex justify-between border-b border-gray-50 pb-0.5">
                                            <span className="text-gray-400">{parseInt(val).toLocaleString()} Ar</span>
                                            <span className="font-black text-gray-800">x {count}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 border border-dashed border-gray-200 flex items-center justify-center text-[9px] text-gray-300 italic uppercase">Aucune donnée de billetage</div>
                    )}
                  </div>
              </div>
          </div>
      )}

      {/* ZONE SIGNATURES */}
      <div className="mt-16 flex justify-between text-[10px] pt-8 border-t-2 border-gray-800">
          <div className="text-center w-1/4">
              <p className="font-black uppercase mb-20 tracking-tighter">L&apos;Agent de Caisse</p>
              <p className="font-bold text-gray-400 uppercase">{session.opened_by}</p>
          </div>
          <div className="text-center w-1/4 border-x border-gray-100">
              <p className="font-black uppercase mb-20 tracking-tighter">Chef Économe</p>
              <div className="border-b border-gray-200 w-20 mx-auto"></div>
          </div>
          <div className="text-center w-1/4">
              <p className="font-black uppercase mb-20 tracking-tighter">Visa Direction</p>
              <div className="border-b border-gray-200 w-20 mx-auto"></div>
          </div>
      </div>

      {/* PIED DE PAGE TECHNIQUE */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end border-t border-dotted border-gray-200 pt-4">
          <div className="text-[8px] text-gray-300 uppercase leading-none font-mono">
              <p>REF_REG_AUDIT_{session.id}</p>
              <p>GÉNÉRÉ PAR LE SYSTÈME IFPT FINANCE v2.0</p>
          </div>
          <div className="text-[10px] font-black text-gray-100 uppercase tracking-[1em] rotate-180" style={{writingMode: 'vertical-rl'}}>
              AUDIT INTERNE IFPT
          </div>
      </div>

      {/* BOUTON FLOTTANT (no-print) */}
      <div className="fixed bottom-6 right-6 no-print">
         <button onClick={() => window.print()} className="bg-gray-900 text-white p-4 rounded shadow-2xl hover:scale-110 transition flex items-center gap-2 font-bold text-xs">
            <Printer size={16}/> IMPRIMER JOURNAL
         </button>
      </div>

    </div>
  );
}

export default function JournalPrintPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-mono animate-pulse uppercase text-xs">Extraction du Grand Livre...</div>}>
            <JournalPrintContent />
        </Suspense>
    );
}
