'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowRight, ArrowLeft, ArrowRightLeft, ShieldCheck, User } from 'lucide-react';

type Transaction = {
  id: string;
  created_at: string;
  amount: number;
  description?: string | null;
  author?: string | null;
  vaults?: { name?: string | null } | null;
  [key: string]: unknown;
};

function TransfertPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id'); 
  
  const [data, setData] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTransaction = async () => {
    const { data: tx } = await supabase.from('transactions')
        .select('*, vaults(name)')
        .eq('id', id)
        .single();
    
    if (tx) {
        setData(tx as Transaction);
        setTimeout(() => window.print(), 1000);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadTransaction();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-mono text-xs text-gray-400 animate-pulse uppercase">Traitement du mouvement de fonds...</div>;
  if (!data) return <div className="text-red-600 text-center p-10 font-bold border-2 border-red-600 m-10">TRANSACTION INTROUVABLE</div>;

  return (
    <div className="max-w-[21cm] mx-auto bg-white p-10 font-sans text-gray-900 min-h-screen relative">
      
      {/* NAVIGATION NO-PRINT */}
      <div className="no-print absolute top-2 left-0 right-0 flex justify-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black uppercase">
              <ArrowLeft size={12}/> Retour aux comptes
          </button>
      </div>

      {/* HEADER LOGICIEL ERP */}
      <div className="flex justify-between items-start border-b-4 border-gray-800 pb-4 mb-8">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-blue-700 flex items-center justify-center text-white text-[10px] font-black italic">IF</div>
                  <h2 className="font-black text-sm tracking-tighter uppercase text-slate-800">IFPT Manager <span className="font-light text-gray-400 tracking-normal">Trésorerie</span></h2>
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-tight">Mouvement de Fonds Interne</p>
          </div>
          <div className="text-right border-l-2 border-gray-100 pl-6">
              <h1 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">BON DE TRANSFERT</h1>
              <div className="bg-blue-50 text-blue-800 px-2 py-0.5 inline-block font-mono text-[10px] font-bold">
                  REF: #{data.id.split('-')[0].toUpperCase()}
              </div>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Date : {new Date(data.created_at).toLocaleDateString()} à {new Date(data.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
          </div>
      </div>

      {/* ZONE FLUX DE TRÉSORERIE */}
      <div className="border-2 border-gray-800 rounded-sm mb-10 overflow-hidden">
          <div className="bg-gray-800 text-white p-2 px-4 flex justify-between items-center uppercase font-black text-[9px] tracking-[0.2em]">
              <span>Origine / Destination</span>
              <span className="flex items-center gap-2"><ArrowRightLeft size={12}/> Virement Interne</span>
          </div>
          
          <div className="p-8 flex items-center justify-around bg-gray-50">
              <div className="text-center space-y-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Compte Source</span>
                  <div className="px-6 py-3 bg-white border-2 border-gray-200 rounded font-black text-gray-700 uppercase tracking-tighter text-sm shadow-sm">
                      {data.vaults?.name}
                  </div>
              </div>
              
              <div className="flex flex-col items-center">
                  <ArrowRight size={40} className="text-blue-600 animate-pulse"/>
                  <span className="text-[8px] font-bold text-blue-600 mt-1 uppercase">Transfert</span>
              </div>

              <div className="text-center space-y-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Montant Transféré</span>
                  <div className="px-6 py-3 bg-blue-900 text-white border-2 border-blue-900 rounded font-mono font-black text-xl shadow-lg">
                      {Math.abs(data.amount).toLocaleString()} <span className="text-xs">Ar</span>
                  </div>
              </div>
          </div>
      </div>

      {/* DÉTAILS DE L'OPÉRATION */}
      <div className="space-y-6 mb-12">
          <h3 className="font-black uppercase text-[10px] text-gray-500 border-b pb-1 tracking-[0.1em]">Détails techniques de l&apos;écriture</h3>
          
          <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Type de mouvement</span>
                  <span className="font-bold text-xs uppercase text-gray-700">VIREMENT DE COMPTE À COMPTE</span>
              </div>
              <div className="col-span-2 flex flex-col border-l pl-4 border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Libellé / Justification</span>
                  <span className="font-bold text-xs text-gray-700 italic">&quot;{data.description}&quot;</span>
              </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Agent Responsable</span>
                  <div className="flex items-center gap-2 font-bold text-xs uppercase text-gray-700">
                      <User size={12} className="text-gray-400"/> {data.author}
                  </div>
              </div>
              <div className="col-span-2 flex flex-col border-l pl-4 border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Statut d&apos;Audit</span>
                  <div className="flex items-center gap-1 text-green-700 font-black text-[10px] uppercase">
                      <ShieldCheck size={14}/> Écriture Validée en Grand Livre
                  </div>
              </div>
          </div>
      </div>

      {/* ZONES DE SIGNATURE ET DÉCHARGE */}
      <div className="grid grid-cols-2 gap-12 mt-20 pt-10 border-t-2 border-gray-800">
          <div className="text-center space-y-20">
              <p className="font-black uppercase text-[9px] text-gray-400 tracking-widest border-b pb-1">Signature Émetteur (Caisse Départ)</p>
              <div className="text-[8px] text-gray-300 italic uppercase">Nom & Prénom de l&apos;agent</div>
          </div>
          <div className="text-center space-y-20 border-l border-gray-100 pl-12">
              <p className="font-black uppercase text-[9px] text-gray-400 tracking-widest border-b pb-1">Signature Récepteur (Caisse Arrivée)</p>
              <div className="text-[8px] text-gray-300 italic uppercase">Confirmation de réception des fonds</div>
          </div>
      </div>

      {/* PIED DE PAGE TECHNIQUE */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end border-t border-dotted border-gray-200 pt-4">
          <div className="text-[8px] text-gray-300 uppercase leading-none font-mono">
              <p>TRANS_MOVE_ID_{data.id}</p>
              <p>SYSTÈME GÉNÉRÉ PAR IFPT-FINANCE-V2</p>
          </div>
          <div className="text-[10px] font-black text-gray-200 uppercase tracking-[0.5em] rotate-180" style={{writingMode: 'vertical-rl'}}>
              MOUVEMENT DE TRÉSORERIE
          </div>
      </div>

      {/* BOUTON FLOTTANT (no-print) */}
      <div className="fixed bottom-6 right-6 no-print">
         <button onClick={() => window.print()} className="bg-gray-800 text-white p-4 rounded shadow-2xl hover:bg-black transition transform active:scale-95 flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
            <Printer size={16}/> Imprimer Bon
         </button>
      </div>

      <style jsx global>{`
        @media print {
            @page { margin: 15mm; size: auto; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function PrintTransfertPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-mono animate-pulse uppercase text-xs">Préparation de la pièce comptable...</div>}>
            <TransfertPrintContent />
        </Suspense>
    );
}
