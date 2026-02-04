'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft, BadgeCheck, User, Building2, Wallet } from 'lucide-react';

type Transaction = {
  id: string;
  created_at: string;
  amount: number;
  description: string;
  author?: string | null;
  vaults?: { name?: string | null } | null;
  [key: string]: unknown;
};

function SalairePrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [data, setData] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
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
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-mono text-xs text-gray-400 animate-pulse uppercase tracking-widest">Génération du bulletin de paie...</div>;
  if (!data) return <div className="text-red-600 text-center p-10 font-bold border-2 border-red-600 m-10">PIÈCE COMPTABLE INTROUVABLE</div>;

  // Extraction du nom de l'employé
  const nomBeneficiaire = data.description.includes('-') 
      ? data.description.split('-').pop().trim() 
      : data.description;

  return (
    <div className="max-w-[21cm] mx-auto bg-white p-10 font-sans text-gray-900 min-h-screen relative">
      
      {/* NAVIGATION NO-PRINT */}
      <div className="no-print absolute top-2 left-0 right-0 flex justify-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black uppercase">
              <ArrowLeft size={12}/> Retour au journal
          </button>
      </div>

      {/* HEADER PROFESSIONNEL STYLE SAGE */}
      <div className="flex justify-between items-start border-b-4 border-gray-800 pb-4 mb-8">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-slate-800 flex items-center justify-center text-white text-[10px] font-black">IF</div>
                  <h2 className="font-black text-sm tracking-tighter uppercase text-slate-800">IFPT Manager <span className="font-light text-gray-400">RH & Paie</span></h2>
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Institut de Formation Professionnelle</p>
              <p className="text-[9px] text-gray-400">Antananarivo, Madagascar</p>
          </div>
          <div className="text-right border-l-2 border-gray-100 pl-6">
              <h1 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">BULLETIN DE PAIE</h1>
              <div className="bg-gray-800 text-white px-2 py-0.5 inline-block font-mono text-[10px] font-bold mb-2 uppercase">
                  Période : {new Date(data.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Référence : #{data.id.split('-')[0].toUpperCase()}</p>
          </div>
      </div>

      {/* BLOC PARTIES CONCERNÉES */}
      <div className="grid grid-cols-2 gap-0 mb-10 border border-gray-300 rounded-sm overflow-hidden">
          {/* EMPLOYEUR */}
          <div className="p-4 bg-gray-50 border-r border-gray-300">
              <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-gray-400"/>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Employeur</span>
              </div>
              <p className="text-xs font-black uppercase text-gray-800">Institut de Formation (IFPT)</p>
              <p className="text-[10px] text-gray-500 mt-1">Siège Social Antananarivo</p>
              <p className="text-[9px] font-mono text-gray-400 mt-2 italic">NIF/STAT: [Données Système]</p>
          </div>
          {/* SALARIÉ */}
          <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-gray-400"/>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Salarié</span>
              </div>
              <p className="text-sm font-black uppercase text-blue-900 leading-none mb-1">{nomBeneficiaire}</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase">Désignation : {data.description}</p>
              <p className="text-[9px] text-gray-400 mt-2 font-mono">ID_EXT: {data.id.split('-')[4] || 'N/A'}</p>
          </div>
      </div>

      {/* CORPS DU BULLETIN (TABLEAU FINANCIER) */}
      <div className="mb-10">
          <table className="w-full text-xs border-collapse border border-gray-400">
              <thead>
                  <tr className="bg-gray-100 uppercase text-[9px] font-black text-gray-600 border-b border-gray-400">
                      <th className="p-3 text-left border-r border-gray-400">Désignation des Éléments de Salaire</th>
                      <th className="p-3 text-right w-40">Montant Net (Ar)</th>
                  </tr>
              </thead>
              <tbody className="font-sans">
                  <tr className="border-b border-gray-200">
                      <td className="p-3 border-r border-gray-400">
                          <p className="font-bold text-gray-800">Traitement de Base / Salaire Forfaitaire</p>
                          <p className="text-[9px] text-gray-400 mt-1 uppercase italic">Selon pointage et contrat en vigueur</p>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-700">
                          {data.amount.toLocaleString()}
                      </td>
                  </tr>
                  {/* LIGNES VIDES POUR L'ASPECT LOGICIEL DENSE */}
                  {[1, 2, 3].map(i => (
                      <tr key={i} className="border-b border-gray-100 h-8">
                          <td className="p-3 border-r border-gray-400"></td>
                          <td className="p-3"></td>
                      </tr>
                  ))}
              </tbody>
              <tfoot>
                  <tr className="bg-blue-900 text-white font-black">
                      <td className="p-4 text-right uppercase tracking-[0.2em] border-r border-blue-800">Net à Payer (Caisse) :</td>
                      <td className="p-4 text-right font-mono text-lg">
                          {data.amount.toLocaleString()} <span className="text-[10px]">Ar</span>
                      </td>
                  </tr>
              </tfoot>
          </table>
      </div>

      {/* MODE DE RÈGLEMENT */}
      <div className="flex items-center gap-4 mb-16 p-4 bg-gray-50 border border-dotted border-gray-400">
          <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm text-green-600">
              <BadgeCheck size={20}/>
          </div>
          <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Certification de Paiement</p>
              <p className="text-xs font-bold text-gray-700 uppercase">
                  Règlement effectué ce jour par <span className="text-blue-700">[{data.vaults?.name}]</span>
              </p>
          </div>
          <div className="ml-auto text-right font-mono text-[9px] text-gray-400 uppercase">
              Auth_By: {data.author}<br/>
              Date: {new Date(data.created_at).toLocaleDateString()}
          </div>
      </div>

      {/* ESPACE SIGNATURES */}
      <div className="grid grid-cols-2 gap-20 mt-10">
          <div className="text-center">
              <p className="font-black uppercase text-[9px] text-gray-400 mb-20 tracking-[0.2em] border-b pb-1">Visa de l&apos;Employeur</p>
              <div className="text-[8px] text-gray-300 italic uppercase">Cachet Officiel Requis</div>
          </div>
          <div className="text-center">
              <p className="font-black uppercase text-[9px] text-gray-400 mb-20 tracking-[0.2em] border-b pb-1">Signature du Salarié</p>
              <div className="text-[8px] text-gray-300 italic uppercase">&quot;Lu et Approuvé&quot;</div>
          </div>
      </div>

      {/* PIED DE PAGE TECHNIQUE */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end border-t border-dotted border-gray-200 pt-4">
          <div className="text-[8px] text-gray-300 uppercase leading-none font-mono">
              <p>TRANS_RH_ID_{data.id}</p>
              <p>GÉNÉRÉ PAR MODULE PAIE v2.4 - IFPT FINANCE</p>
          </div>
          <div className="text-[9px] font-black text-gray-100 uppercase tracking-[0.5em] rotate-180" style={{writingMode: 'vertical-rl'}}>
              BULLETIN DE PAIE CONFIDENTIEL
          </div>
      </div>

      {/* BOUTON FLOTTANT (no-print) */}
      <div className="fixed bottom-6 right-6 no-print">
         <button onClick={() => window.print()} className="bg-blue-900 text-white p-4 rounded shadow-2xl hover:bg-black transition transform active:scale-95 flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
            <Printer size={16}/> Imprimer Fiche
         </button>
      </div>

    </div>
  );
}

export default function PrintSalairePage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-mono animate-pulse uppercase text-xs">Extraction des registres RH...</div>}>
            <SalairePrintContent />
        </Suspense>
    );
}
