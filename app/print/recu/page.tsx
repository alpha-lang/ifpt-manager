'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, CheckCircle, ArrowLeft, Hash, Clock, User } from 'lucide-react';

function RecuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    const { data: tx } = await supabase.from('transactions')
        .select('*, vaults(name)')
        .eq('id', id)
        .single();
    
    if (tx) {
        setData(tx);
        // Délai pour assurer le rendu avant l'appel système d'impression
        setTimeout(() => window.print(), 1000);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center font-mono text-[10px] text-gray-400 animate-pulse">TRAITEMENT DU TICKET...</div>;
  if (!data) return <div className="p-10 text-center text-red-600 font-bold border-2 border-red-600 uppercase text-xs">Erreur: Transaction non trouvée</div>;

  return (
    <div className="max-w-[80mm] mx-auto bg-white p-2 font-mono leading-tight text-black print:p-0">
      
      {/* NAVIGATION NO-PRINT */}
      <div className="no-print flex justify-between mb-4 gap-2">
          <button onClick={() => router.back()} className="flex-1 flex items-center justify-center gap-1 text-[9px] font-bold text-gray-500 hover:text-black uppercase border border-gray-200 py-1 rounded">
              <ArrowLeft size={10}/> Retour
          </button>
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-1 text-[9px] font-bold bg-gray-800 text-white py-1 rounded">
              <Printer size={10}/> Imprimer
          </button>
      </div>

      {/* EN-TÊTE LOGICIEL SAGE STYLE */}
      <div className="text-center mb-4 border-b border-black pb-2">
        <h1 className="font-black text-lg uppercase tracking-tighter">IFPT MANAGER</h1>
        <p className="font-bold text-[10px] uppercase">Finance & Scolarité</p>
        <p className="text-[9px]">Antananarivo, Madagascar</p>
        <div className="flex justify-center gap-2 mt-1 text-[8px] text-gray-600">
            <span>TEL: 034 00 000 00</span>
            <span>-</span>
            <span>v2.0.4</span>
        </div>
      </div>

      {/* TITRE DU DOCUMENT */}
      <div className="text-center mb-4">
          <span className="border-2 border-black px-4 py-0.5 font-black text-xs uppercase tracking-widest">
              Reçu de Paiement
          </span>
      </div>

      {/* INFO MÉTADONNÉES */}
      <div className="space-y-1 mb-4 text-[10px] border-b border-dotted border-gray-400 pb-2">
        <div className="flex justify-between">
            <span className="flex items-center gap-1"><Hash size={8}/> RÉF :</span>
            <span className="font-black">#{data.id.split('-')[0].toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
            <span className="flex items-center gap-1"><Clock size={8}/> DATE :</span>
            <span>{new Date(data.created_at).toLocaleDateString()} {new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div className="flex justify-between">
            <span className="flex items-center gap-1"><User size={8}/> OPÉRATEUR :</span>
            <span className="uppercase">{data.author?.substring(0, 15) || 'Caisse 01'}</span>
        </div>
        
        {data.student_matricule && (
            <div className="flex justify-between mt-1 bg-gray-100 p-1">
                <span>MATRICULE :</span>
                <span className="font-black underline">{data.student_matricule}</span>
            </div>
        )}
      </div>

      {/* CORPS DU TICKET (DÉTAILS) */}
      <div className="mb-4">
        <p className="font-black uppercase text-[10px] mb-1">{data.category}</p>
        <p className="text-[10px] italic leading-tight mb-3 text-gray-700">
            {data.description}
        </p>
        
        <div className="border-t border-black pt-2 flex justify-between items-end">
            <span className="font-black text-[10px] uppercase">Total Perçu</span>
            <span className="font-black text-xl tracking-tighter">
                {data.amount.toLocaleString()} <span className="text-xs">Ar</span>
            </span>
        </div>
      </div>

      {/* VALIDATION & MODE */}
      <div className="mb-6 py-2 border-t border-b border-dashed border-gray-400 text-center">
        <p className="text-[9px] uppercase font-bold text-gray-600 mb-1">Mode : {data.vaults?.name}</p>
        <div className="inline-flex items-center gap-1 font-black text-[10px] uppercase bg-black text-white px-2 py-0.5 rounded-sm">
            <CheckCircle size={10}/> Transaction Validée
        </div>
      </div>

      {/* FOOTER TICKET */}
      <div className="text-center text-[8px] space-y-1 opacity-80">
        <p className="font-bold">MERCI DE VOTRE CONFIANCE</p>
        <p>Document généré numériquement.</p>
        <p>Sommes non remboursables après validation.</p>
        <div className="pt-2 font-mono text-[7px] text-gray-400 break-all">
            SIG_AUTH_{data.id.replace(/-/g, '')}
        </div>
        <p className="mt-2 font-black tracking-[0.3em]">*** FIN DU TICKET ***</p>
      </div>

      {/* STYLE SPÉCIFIQUE IMPRESSION THERMIQUE */}
      <style jsx global>{`
        @media print {
            @page { 
                margin: 0; 
                size: 80mm auto; 
            }
            body { 
                background: white; 
                color: black;
                width: 80mm;
            }
            .no-print { display: none !important; }
            /* Forcer le noir pur pour les têtes thermiques */
            * { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important;
                color: black !important;
            }
            /* Supprimer les marges parasites du navigateur */
            html, body { margin: 0; padding: 0; }
        }
      `}</style>
    </div>
  );
}

export default function PrintRecuPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center font-mono text-xs animate-pulse uppercase">Initialisation flux ticket...</div>}>
            <RecuContent />
        </Suspense>
    );
}