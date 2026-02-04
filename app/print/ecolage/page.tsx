'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft, Check, GraduationCap, CalendarDays, History } from 'lucide-react';

type Student = {
  id: string;
  nom: string;
  prenom?: string | null;
  matricule: string;
  classe: string;
  [key: string]: unknown;
};

type Transaction = {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  [key: string]: unknown;
};

function EcolageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matricule = searchParams.get('matricule');
  
  const [student, setStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const SCHOOL_MONTHS = ['OCT', 'NOV', 'DEC', 'JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT'];

  const loadData = async () => {
    const { data: stu } = await supabase.from('students').select('*').eq('matricule', matricule).single();
    const { data: trans } = await supabase.from('transactions')
        .select('*')
        .eq('student_matricule', matricule)
        .eq('category', 'ECOLAGE')
        .order('created_at', { ascending: true });
    
    if (stu) {
        setStudent(stu as Student);
        setTransactions((trans ?? []) as Transaction[]);
        setTimeout(() => window.print(), 1000);
    }
    setLoading(false);
  };

  useEffect(() => { if (matricule) loadData(); }, [matricule]);

  const getPaidMonths = () => {
    const paid: string[] = [];
    transactions.forEach(t => {
        SCHOOL_MONTHS.forEach(m => {
            if (new RegExp(`\\b${m}\\b`, 'i').test(t.description)) paid.push(m);
        });
    });
    return paid;
  };

  if (loading) return <div className="p-20 text-center font-mono text-xs text-gray-400 animate-pulse uppercase tracking-widest">Génération du relevé académique...</div>;
  if (!student) return <div className="text-red-600 text-center p-10 font-bold border-2 border-red-600 m-10">DOSSIER ÉTUDIANT INTROUVABLE</div>;

  const paidMonths = getPaidMonths();
  const totalVersé = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="max-w-[21cm] mx-auto bg-white p-10 font-sans text-gray-900 min-h-screen relative">
      
      {/* NAVIGATION NO-PRINT */}
      <div className="no-print absolute top-2 left-0 right-0 flex justify-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black uppercase">
              <ArrowLeft size={12}/> Retour à l&apos;annuaire
          </button>
      </div>

      {/* HEADER TYPE LOGICIEL ERP */}
      <div className="flex justify-between items-start border-b-4 border-gray-800 pb-4 mb-8">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-blue-900 flex items-center justify-center text-white text-[10px] font-black">IF</div>
                  <h2 className="font-black text-sm tracking-tighter uppercase">IFPT Manager <span className="font-light text-gray-400">Scolarité</span></h2>
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-tight">
                Institut de Formation Professionnelle et Technique<br/>
                <span className="text-[8px] font-normal lowercase tracking-normal">Antananarivo, Madagascar</span>
              </p>
          </div>
          <div className="text-right border-l-2 border-gray-100 pl-6">
              <h1 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">CARTE DE SUIVI ÉCOLAGE</h1>
              <div className="bg-blue-900 text-white px-2 py-0.5 inline-block font-mono text-[10px] font-bold mb-2">
                  ANNÉE ACADÉMIQUE : 2025-2026
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Date d&apos;édition : {new Date().toLocaleDateString()}</p>
          </div>
      </div>

      {/* FICHE IDENTITÉ ÉTUDIANT */}
      <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm mb-8 grid grid-cols-2 gap-6">
          <div className="space-y-2">
              <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-gray-400"/>
                  <span className="text-[10px] font-black text-gray-400 uppercase">Étudiant</span>
              </div>
              <p className="text-sm font-black text-gray-800 uppercase pl-6">{student.nom} {student.prenom}</p>
              <p className="text-[10px] font-bold text-blue-700 pl-6 tracking-widest">MATRICULE : {student.matricule}</p>
          </div>
          <div className="space-y-2 border-l border-gray-200 pl-6">
              <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-gray-400"/>
                  <span className="text-[10px] font-black text-gray-400 uppercase">Parcours / Classe</span>
              </div>
              <p className="text-sm font-black text-gray-800 uppercase pl-6">{student.classe}</p>
              <p className="text-[10px] font-bold text-gray-500 pl-6 italic">Statut Financier : <span className={paidMonths.length > 8 ? 'text-green-600' : 'text-orange-600'}>En cours</span></p>
          </div>
      </div>

      {/* GRILLE DE POINTAGE MENSUEL (L'aspect "Carte de Suivi") */}
      <div className="mb-10">
        <h3 className="font-black uppercase text-[10px] text-gray-500 mb-3 flex items-center gap-2 tracking-[0.2em]">
            <Check size={14} className="text-green-600"/> État de validation des mensualités
        </h3>
        <div className="grid grid-cols-6 gap-1 mt-2">
            {SCHOOL_MONTHS.map(m => {
                const isPaid = paidMonths.includes(m);
                return (
                    <div key={m} className={`border p-2 text-center relative ${isPaid ? 'bg-gray-800 border-black' : 'bg-white border-gray-200'}`}>
                        <p className={`font-black text-xs ${isPaid ? 'text-white' : 'text-gray-300'}`}>{m}</p>
                        <div className={`text-[8px] font-bold uppercase mt-1 ${isPaid ? 'text-green-400' : 'text-gray-100'}`}>
                            {isPaid ? 'VALIDE' : '-'}
                        </div>
                        {isPaid && <Check className="absolute top-1 right-1 text-green-500" size={8} />}
                    </div>
                );
            })}
        </div>
      </div>

      {/* TABLEAU HISTORIQUE DES ENCAISSEMENTS */}
      <div className="mb-12">
        <h3 className="font-black uppercase text-[10px] text-gray-500 mb-3 flex items-center gap-2 tracking-[0.2em]">
            <History size={14} className="text-blue-600"/> Historique détaillé des versements
        </h3>
        <table className="w-full text-[11px] border-collapse">
            <thead>
                <tr className="bg-gray-800 text-white uppercase text-[9px]">
                    <th className="p-2 border border-gray-800 text-left w-24">Date OP.</th>
                    <th className="p-2 border border-gray-800 text-left">Description de l&apos;Écriture</th>
                    <th className="p-2 border border-gray-800 text-center w-28">Référence</th>
                    <th className="p-2 border border-gray-800 text-right w-32">Montant (Ar)</th>
                </tr>
            </thead>
            <tbody className="font-mono">
                {transactions.map(t => (
                    <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="p-2 text-gray-800 font-sans uppercase font-bold text-[10px]">
                            {t.description.split('(')[1]?.replace(')', '') || t.description}
                        </td>
                        <td className="p-2 text-center text-gray-400 text-[9px]">#{t.id.split('-')[0].toUpperCase()}</td>
                        <td className="p-2 text-right font-black text-gray-900 bg-gray-50/50">
                            {t.amount.toLocaleString()}
                        </td>
                    </tr>
                ))}
                <tr className="bg-gray-100 font-black">
                    <td className="p-2 text-right uppercase text-[9px] font-sans" colSpan={3}>Cumul des versements effectués :</td>
                    <td className="p-2 text-right text-sm border-t-2 border-gray-800">{totalVersé.toLocaleString()} Ar</td>
                </tr>
            </tbody>
        </table>
      </div>

      {/* ESPACE SIGNATURES ET CACHETS */}
      <div className="grid grid-cols-2 gap-12 mt-20 pt-10 border-t-2 border-gray-100">
          <div className="text-center">
              <p className="font-black uppercase text-[9px] text-gray-400 mb-20 tracking-widest">Le Responsable Financier</p>
              <div className="border-b border-gray-200 w-32 mx-auto"></div>
          </div>
          <div className="text-center">
              <p className="font-black uppercase text-[9px] text-gray-400 mb-20 tracking-widest">Le Parent / L&apos;Étudiant</p>
              <div className="border-b border-gray-200 w-32 mx-auto"></div>
          </div>
      </div>

      {/* PIED DE PAGE TECHNIQUE */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end border-t border-dotted border-gray-200 pt-4">
          <div className="text-[8px] text-gray-300 uppercase leading-none font-mono">
              <p>STU_ID: {student.id}</p>
              <p>RELEVÉ GÉNÉRÉ PAR SYSTÈME SÉCURISÉ IFPT</p>
          </div>
          <div className="text-[9px] font-black text-gray-200 uppercase tracking-[0.5em] rotate-180" style={{writingMode: 'vertical-rl'}}>
              PIÈCE COMPTABLE SCOLAIRE
          </div>
      </div>

      {/* BOUTON D'ACTION NO-PRINT */}
      <div className="fixed bottom-6 right-6 no-print">
         <button onClick={() => window.print()} className="bg-blue-900 text-white p-4 rounded shadow-2xl hover:bg-black transition transform active:scale-95 flex items-center gap-2 font-bold text-xs">
            <Printer size={16}/> LANCER L&apos;IMPRESSION
         </button>
      </div>

    </div>
  );
}

export default function PrintEcolagePage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-mono animate-pulse">EXTRACTION DES DONNÉES FINANCIÈRES...</div>}>
            <EcolageContent />
        </Suspense>
    );
}
