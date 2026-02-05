'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Transaction = {
  id: string;
  created_at: string;
  amount: number;
  category?: string | null;
  description: string;
  beneficiary?: string | null;
  author?: string | null;
  vaults?: { name?: string | null } | null;
  [key: string]: unknown;
};

function DecaissementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [data, setData] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const { data: tx } = await supabase.from('transactions')
        .select('*, vaults!transactions_vault_id_fkey(name)')
        .eq('id', id)
        .single();
    
    if (tx) {
        setData(tx as Transaction);
        // Petit délai pour laisser les polices/données se stabiliser
        setTimeout(() => window.print(), 1000);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="p-10 text-center font-mono text-xs text-gray-400 uppercase tracking-widest">Génération du bordereau...</div>;
  if (!data) return <div className="text-red-600 text-center p-10 font-bold border-2 border-red-600 m-10">PIÈCE COMPTABLE INTROUVABLE</div>;

  return (
    <div className="max-w-[21cm] mx-auto bg-white p-10 font-sans text-gray-900 min-h-screen relative">
      
      {/* BARRE DE RETOUR (Cachée à l'impression) */}
      <div className="no-print absolute top-2 left-0 right-0 flex justify-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black uppercase">
              <ArrowLeft size={12}/> Retour au journal
          </button>
      </div>

      {/* EN-TÊTE PROFESSIONNEL */}
      <div className="flex justify-between items-start border-b-4 border-gray-800 pb-4 mb-10">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-black flex items-center justify-center text-white text-[10px] font-black">IF</div>
                  <h2 className="font-black text-sm tracking-tighter uppercase">IFPT Manager <span className="font-light text-gray-400">Finance</span></h2>
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Institut de Formation Professionnelle et Technique</p>
              <p className="text-[9px] text-gray-400 mt-1">Sce Comptabilité / Direction Générale</p>
          </div>
          <div className="text-right border-l-2 border-gray-100 pl-6">
              <h1 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">BON DE DÉCAISSEMENT</h1>
              <div className="bg-gray-800 text-white px-2 py-1 inline-block font-mono text-xs font-bold mb-2">
                  REF: #{data.id.split('-')[0].toUpperCase()}
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Édité le : {new Date(data.created_at).toLocaleDateString()} à {new Date(data.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
          </div>
      </div>

      {/* CORPS DU BORDEREAU */}
      <div className="space-y-8 mb-16">
          
          <div className="grid grid-cols-4 gap-4 items-center">
              <span className="col-span-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bénéficiaire :</span>
              <div className="col-span-3 border-b-2 border-gray-100 py-2">
                  <span className="text-lg font-black text-gray-800 uppercase italic">
                      {data.beneficiary || data.description.split('-')[1] || data.description}
                  </span>
              </div>
          </div>

          <div className="grid grid-cols-4 gap-4 items-center">
              <span className="col-span-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Objet / Motif :</span>
              <div className="col-span-3 border-b-2 border-gray-100 py-2">
                  <span className="text-sm font-bold text-gray-700 uppercase">
                      [{data.category}] - {data.description}
                  </span>
              </div>
          </div>

          <div className="grid grid-cols-4 gap-4 items-center">
              <span className="col-span-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode Sortie :</span>
              <div className="col-span-3 border-b-2 border-gray-100 py-2">
                  <span className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div> {data.vaults?.name}
                  </span>
              </div>
          </div>

          {/* ZONE MONTANT (Le plus important) */}
          <div className="mt-12 bg-gray-50 p-6 border-2 border-gray-800 flex justify-between items-center rounded-sm">
              <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Somme Déboursée</span>
                  <span className="text-xs italic text-gray-600 font-serif">Arrêté à la somme de {data.amount.toLocaleString()} Ariary</span>
              </div>
              <div className="text-right">
                  <span className="text-3xl font-black text-gray-900 font-mono">
                      {data.amount.toLocaleString()} <span className="text-lg">Ar</span>
                  </span>
              </div>
          </div>
      </div>

      {/* ZONE DE VALIDATION */}
      <div className="grid grid-cols-3 gap-8 pt-6">
          <div className="border border-gray-300 p-4 h-40 flex flex-col items-center">
              <p className="font-black uppercase text-[9px] text-gray-400 mb-2 border-b w-full text-center pb-1">Visa Direction</p>
              <div className="mt-auto text-[8px] text-gray-300 italic uppercase">Approuvé numériquement</div>
          </div>
          <div className="border border-gray-300 p-4 h-40 flex flex-col items-center">
              <p className="font-black uppercase text-[9px] text-gray-400 mb-2 border-b w-full text-center pb-1">Caisse / Comptable</p>
              <p className="text-[10px] font-bold mt-2 uppercase">{data.author}</p>
          </div>
          <div className="border border-gray-300 p-4 h-40 flex flex-col items-center">
              <p className="font-black uppercase text-[9px] text-gray-400 mb-2 border-b w-full text-center pb-1">Le Bénéficiaire</p>
              <p className="mt-auto text-[8px] text-gray-400 uppercase font-bold border-t w-full text-center pt-2">Nom & Signature</p>
          </div>
      </div>

      {/* PIED DE PAGE DISCRET */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
          <div className="text-[8px] text-gray-300 uppercase leading-none font-mono">
              <p>ID_TRANS_SAGE_{data.id}</p>
              <p>Generated by IFPT-FIN-SYS-v2</p>
          </div>
          <div className="text-[10px] font-black text-gray-200 uppercase tracking-[0.5em] rotate-180" style={{writingMode: 'vertical-rl'}}>
              IFPT PIECE COMPTABLE
          </div>
      </div>

      {/* BOUTON FLOTTANT (Caché à l'impression) */}
      <div className="fixed bottom-6 right-6 no-print">
         <button onClick={() => window.print()} className="bg-gray-800 text-white p-4 rounded shadow-2xl hover:bg-black transition transform active:scale-95 flex items-center gap-2 font-bold text-xs">
            <Printer size={16}/> IMPRIMER BORDEREAU
         </button>
      </div>

    </div>
  );
}

export default function PrintDecaissementPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-mono animate-pulse">PRÉPARATION DU DOCUMENT...</div>}>
            <DecaissementContent />
        </Suspense>
    );
}
