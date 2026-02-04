'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Banknote, Printer, RefreshCw } from 'lucide-react';

export default function EcolagesPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('TOUS');

  // Mois scolaires (Ordre chronologique)
  const MONTHS = ['OCT', 'NOV', 'DEC', 'JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT'];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    // 1. Récupérer tous les étudiants
    const { data: stu } = await supabase.from('students').select('*').order('nom');
    
    // 2. Récupérer toutes les transactions d'écolage
    const { data: tx } = await supabase.from('transactions')
        .select('student_matricule, description, created_at')
        .eq('category', 'ECOLAGE');

    setStudents(stu || []);
    setTransactions(tx || []);
    setLoading(false);
  };

  // --- LOGIQUE CŒUR : Vérifier si un mois est payé ---
  const checkPayment = (matricule: string, month: string) => {
    // On cherche une transaction pour cet élève qui contient le mois (mot entier)
    // Ex: "JUIN" ne doit pas matcher dans "JUILLET" -> d'où le \b
    // Mais attention aux accents ou casses -> 'i' flag
    if (!matricule) return false;
    return transactions.some(t => 
        // Si vous avez stocké le matricule dans student_matricule (idéal)
        (t.student_matricule === matricule || t.description.includes(matricule)) && 
        new RegExp(`\\b${month}\\b`, 'i').test(t.description)
    );
  };

  // Filtrage liste
  const filteredStudents = students.filter(s => {
    const matchSearch = s.nom.toLowerCase().includes(search.toLowerCase()) || s.matricule.toLowerCase().includes(search.toLowerCase());
    const matchClasse = filterClasse === 'TOUS' || s.classe === filterClasse;
    return matchSearch && matchClasse;
  });

  // Liste unique des classes pour le filtre
  const classes = ['TOUS', ...Array.from(new Set(students.map(s => s.classe)))];

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* BARRE D'OUTILS COMPACTE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Banknote size={16} className="text-green-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Suivi des Écolages</span>
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-200">ANNÉE EN COURS</span>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
                  <Filter size={12} className="text-gray-400 mr-2"/>
                  <select 
                      className="bg-transparent text-[10px] font-bold text-gray-700 outline-none w-32"
                      value={filterClasse}
                      onChange={e => setFilterClasse(e.target.value)}
                  >
                      {classes.map(c => <option key={c} value={c}>{c === 'TOUS' ? 'TOUTES CLASSES' : c}</option>)}
                  </select>
              </div>

              <div className="relative">
                  <Search className="absolute left-2 top-1.5 text-gray-400" size={12}/>
                  <input 
                      className="pl-7 p-1 w-40 border border-gray-300 rounded text-[10px] h-7 bg-white focus:border-blue-500 outline-none transition-colors" 
                      placeholder="Matricule / Nom..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)}
                  />
              </div>

              <button onClick={loadData}><RefreshCw size={14} className={`text-blue-600 hover:rotate-180 transition ${loading ? 'animate-spin' : ''}`}/></button>
          </div>
      </div>

      {/* TABLEAU DE SUIVI (Vue Sage) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden">
          <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-[10px] border-collapse">
                  <thead className="bg-gray-800 text-white font-bold uppercase sticky top-0 z-20 shadow-sm text-[9px]">
                      <tr>
                          <th className="p-1 border-r border-gray-600 text-left w-64 pl-2 bg-gray-800 sticky left-0 z-30">Étudiant</th>
                          {MONTHS.map(m => (
                              <th key={m} className="p-1 text-center w-12 border-r border-gray-600">{m}</th>
                          ))}
                          <th className="p-1 text-center w-16 border-r border-gray-600">Statut</th>
                          <th className="p-1 text-center w-10">Doc</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-sans">
                      {loading ? (
                          <tr><td colSpan={15} className="p-10 text-center text-gray-400">Chargement des données...</td></tr>
                      ) : filteredStudents.map((s, i) => (
                          <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                              
                              {/* COLONNE FIXE (Nom) */}
                              <td className="p-1 border-r border-gray-300 sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_#ddd]">
                                  <div className="flex justify-between items-center px-1">
                                      <div className="truncate max-w-[180px] font-bold text-gray-700" title={`${s.nom} ${s.prenom}`}>
                                          {s.nom} {s.prenom}
                                      </div>
                                      <div className="text-[9px] text-gray-400 font-mono">{s.matricule}</div>
                                  </div>
                                  <div className="px-1 text-[8px] text-blue-600 font-bold">{s.classe}</div>
                              </td>

                              {/* MOIS */}
                              {MONTHS.map(m => {
                                  const isPaid = checkPayment(s.matricule, m);
                                  return (
                                      <td key={m} className="p-0 border-r border-gray-200 text-center align-middle h-8">
                                          {isPaid ? (
                                              <div className="w-full h-full flex items-center justify-center bg-green-50">
                                                  <CheckCircle size={12} className="text-green-600"/>
                                              </div>
                                          ) : (
                                              <span className="text-[8px] text-gray-200 font-mono">.</span>
                                          )}
                                      </td>
                                  );
                              })}

                              {/* STATUT */}
                              <td className="p-1 border-r border-gray-200 text-center">
                                  <span className="bg-blue-50 text-blue-700 px-1 rounded-[2px] text-[8px] font-bold border border-blue-100">
                                      INSCRIT
                                  </span>
                              </td>

                              {/* ACTION */}
                              <td className="p-1 text-center">
                                  <button 
                                      onClick={() => window.open(`/print/ecolage?matricule=${s.matricule}`, '_blank')}
                                      className="text-gray-400 hover:text-blue-600 transition"
                                      title="Imprimer Carte Suivi"
                                  >
                                      <Printer size={12}/>
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {!loading && filteredStudents.length === 0 && (
                          <tr><td colSpan={15} className="p-8 text-center text-gray-400 italic text-[10px]">Aucun étudiant trouvé pour ces critères.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
          
          <div className="bg-yellow-50 border-t border-yellow-200 p-1.5 flex items-center gap-2 text-[10px] text-yellow-800">
              <AlertCircle size={12}/>
              <span><b>Info :</b> Ce tableau se met à jour en temps réel basé sur les transactions contenant le "Mois" dans leur libellé.</span>
              <span className="ml-auto font-mono text-gray-500">{filteredStudents.length} étudiants affichés</span>
          </div>
      </div>
    </div>
  );
}