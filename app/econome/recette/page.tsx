'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
// CORRECTION ICI : Ajout de 'Printer' dans les imports
import { PlusCircle, History, RefreshCw, X, Search, AlertCircle, Lock, UserPlus, Wallet, CheckCircle, Info, Printer } from 'lucide-react';

type Register = {
  id: string;
  [key: string]: unknown;
};

type Vault = {
  id: string;
  name: string;
  [key: string]: unknown;
};

type Student = {
  id?: string;
  matricule: string;
  nom: string;
  prenom?: string | null;
  classe: string;
  [key: string]: unknown;
};

type Transaction = {
  id: string;
  amount: number;
  type: string;
  category?: string | null;
  description?: string | null;
  created_at: string;
  vaults?: { name?: string | null } | null;
  [key: string]: unknown;
};

export default function POSRecette() {
  const [register, setRegister] = useState<Register | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Formulaire & Etats
  const [activeTab, setActiveTab] = useState('ETUDIANT'); 
  const [selectedVault, setSelectedVault] = useState('');
  
  const [matricule, setMatricule] = useState('');
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  
  const [amount, setAmount] = useState('');
  const [motif, setMotif] = useState('ECOLAGE');

  // Champs dynamiques
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState('S1');
  const [autreDetail, setAutreDetail] = useState('');

  // Notification Maison
  const [notif, setNotif] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  useEffect(() => { if (notif) setTimeout(() => setNotif(null), 3000); }, [notif]);

  // Ordre académique
  const MONTHS = ['OCT', 'NOV', 'DEC', 'JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT'];

  useEffect(() => {
    setStudent(null);
    setMatricule('');
    setSuggestions([]);
    setSelectedMonths([]);
    setSelectedSession('S1');
    setAutreDetail('');
    setAmount('');
    if (activeTab === 'ETUDIANT') setMotif('ECOLAGE'); else setMotif('AUTRE');
  }, [activeTab]);

  useEffect(() => { setSelectedMonths([]); setAutreDetail(''); }, [motif]);

  // --- LOGIQUE ---
  const isL1 = student && (student.classe.toUpperCase().includes('L1') || student.classe.toUpperCase().includes('1ERE'));
  const isAncien = student && !isL1;

  const handleSearchInput = async (val: string) => {
    setMatricule(val);
    if (val.length > 1) { 
      const { data } = await supabase.from('students').select('*').or(`matricule.ilike.%${val}%,nom.ilike.%${val}%`).limit(5);
      setSuggestions((data ?? []) as Student[]);
    } else { setSuggestions([]); }
  };

  const selectStudent = (s: Student) => {
    setStudent(s);
    setMatricule(s.matricule);
    setSuggestions([]); 
    if ((s.classe.toUpperCase().includes('L1')) && motif === 'RE-INSCRIPTION') setMotif('INSCRIPTION');
    if (!s.classe.toUpperCase().includes('L1') && motif === 'INSCRIPTION') setMotif('RE-INSCRIPTION');
  };
  
  const toggleMonth = (m: string) => {
    if (selectedMonths.includes(m)) setSelectedMonths(prev => prev.filter(x => x !== m));
    else setSelectedMonths(prev => [...prev, m]);
  };

  async function loadVaults() {
    const { data } = await supabase.from('vaults').select('*').order('name');
    if (data && data.length > 0) { setVaults(data as Vault[]); const def = (data as Vault[]).find(v => v.name.toLowerCase().includes('esp')) || (data as Vault[])[0]; setSelectedVault(def.id); }
  }
  
  async function checkRegister() {
    const { data } = await supabase.from('cash_registers').select('*').eq('status', 'OPEN').order('created_at', { ascending: false }).maybeSingle();
    setRegister((data ?? null) as Register | null); if (data) loadTransactions(data.id);
  }
  
  async function loadTransactions(regId: string) {
    const { data } = await supabase.from('transactions').select('*, vaults(name)').eq('register_id', regId).eq('type', 'RECETTE').order('created_at', { ascending: false });
    setTransactions((data ?? []) as Transaction[]);
  }

  useEffect(() => { loadVaults(); checkRegister(); }, []);
  
  const createStudent = async () => {
    const { value: form } = await Swal.fire({
        title: 'Nouveau',
        html: `<input id="swal-mat" class="swal2-input" placeholder="Matricule"><input id="swal-nom" class="swal2-input" placeholder="Nom"><input id="swal-classe" class="swal2-input" placeholder="Classe">`,
        showCancelButton: true, confirmButtonText: 'OK',
        preConfirm: () => ({
            matricule: (document.getElementById('swal-mat') as HTMLInputElement).value,
            nom: (document.getElementById('swal-nom') as HTMLInputElement).value,
            classe: (document.getElementById('swal-classe') as HTMLInputElement).value
        })
    });

    if (form.matricule) {
        await supabase.from('students').insert(form);
        setStudent(form); setMatricule(form.matricule);
        setNotif({ type: 'success', msg: 'Étudiant créé' });
    }
  };

  const processPayment = async () => {
    if (!amount || !register || !selectedVault) return;
    if (activeTab === 'ETUDIANT' && !student) return setNotif({type: 'error', msg: 'Étudiant requis'});
    
    const detailString = motif === 'ECOLAGE' ? `Mois: ${selectedMonths.join(', ')}` : (motif === 'DROIT EXAMEN' ? `Session: ${selectedSession}` : `Détail: ${autreDetail}`);
    const desc = activeTab === 'ETUDIANT' ? `${motif} (${detailString}) - ${student?.nom} (${matricule})` : `${motif} - ${autreDetail || 'CLIENT DIVERS'}`;

    const { data: newTrans, error } = await supabase.from('transactions').insert({
        register_id: register.id, vault_id: selectedVault, type: 'RECETTE', category: motif,
        amount: parseFloat(amount), description: desc, author: sessionStorage.getItem('name'), status: 'VALIDATED'
    }).select().single();

    if (!error && newTrans) {
        setAmount(''); 
        if(activeTab === 'ETUDIANT') { setMatricule(''); setStudent(null); setSelectedMonths([]); }
        else { setAutreDetail(''); }
        
        loadTransactions(register.id);
        setNotif({ type: 'success', msg: 'Encaissement enregistré' });
        
        // Impression directe (Optionnelle, ou via bouton dans journal)
        // window.open(`/print/recu?id=${newTrans.id}`, '_blank');
    }
  };

  if (!register) return (
    <div className="h-screen flex flex-col items-center justify-center text-gray-400 bg-gray-100">
        <Lock size={32} className="mb-2"/>
        <p className="text-[10px] font-bold uppercase text-gray-500">Caisse fermée - ouverture depuis le tableau de bord</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col relative">
      
      {/* NOTIF MAISON */}
      {notif && (
          <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg text-white font-bold text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
              notif.type === 'success' ? 'bg-emerald-600' : notif.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
              {notif.type === 'success' ? <CheckCircle size={14}/> : <Info size={14}/>} {notif.msg}
          </div>
      )}

      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Wallet size={16} className="text-gray-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Caisse Recette</span>
              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-green-200">OUVERTE</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
              <span>{new Date().toLocaleDateString()}</span>
              <button onClick={() => loadTransactions(register.id)}><RefreshCw size={12} className="hover:rotate-180 transition"/></button>
          </div>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden">
          
          {/* COLONNE GAUCHE : SAISIE (Fixe) */}
          <div className="w-80 flex flex-col gap-2 shrink-0">
              <div className="bg-white border border-gray-300 rounded shadow-sm p-3 flex flex-col gap-3 h-full">
                  
                  {/* TABS */}
                  <div className="flex border-b border-gray-200 pb-2">
                      {['ETUDIANT', 'AUTRE'].map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 text-[10px] font-bold py-1 ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                              {tab === 'ETUDIANT' ? 'ÉTUDIANT' : 'DIVERS'}
                          </button>
                      ))}
                  </div>

                  {/* COFFRE */}
                  <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Caisse de Réception</label>
                      <select className="w-full border border-gray-300 rounded px-2 py-1 text-[10px] font-bold bg-gray-50 outline-none" value={selectedVault} onChange={e => setSelectedVault(e.target.value)}>
                          {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                  </div>

                  {/* RECHERCHE ETUDIANT */}
                  {activeTab === 'ETUDIANT' && (
                      <div className="relative">
                          <label className="flex justify-between text-[9px] font-bold text-gray-400 uppercase mb-1">
                              <span>Matricule / Nom</span>
                              <button onClick={createStudent} className="text-blue-600 hover:underline"><UserPlus size={10}/></button>
                          </label>
                          <div className="relative">
                              <Search className="absolute left-2 top-1.5 text-gray-400" size={12}/>
                              <input className="w-full border border-gray-300 pl-6 p-1 rounded text-[11px] font-bold uppercase focus:border-blue-500 outline-none" 
                                  placeholder="Recherche..." value={matricule} onChange={e => handleSearchInput(e.target.value)} />
                              {matricule && <button onClick={()=>{setMatricule(''); setStudent(null);}} className="absolute right-2 top-1.5 text-gray-400"><X size={12}/></button>}
                          </div>
                          {suggestions.length > 0 && (
                              <ul className="absolute z-50 w-full bg-white border border-gray-300 shadow-lg rounded max-h-32 overflow-y-auto mt-1">
                                  {suggestions.map(s => (
                                      <li key={s.id} onClick={() => selectStudent(s)} className="p-1.5 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between text-[10px]">
                                          <span><b>{s.matricule}</b> - {s.nom}</span>
                                          <span className="bg-gray-100 px-1 rounded">{s.classe}</span>
                                      </li>
                                  ))}
                              </ul>
                          )}
                          {student && (
                              <div className="mt-1 bg-blue-50 border border-blue-200 p-1.5 rounded flex justify-between items-center text-blue-800 text-[10px]">
                                  <span className="font-bold truncate w-2/3">{student.nom}</span>
                                  <span className="bg-white px-1 rounded border border-blue-100">{student.classe}</span>
                              </div>
                          )}
                      </div>
                  )}

                  {/* DETAILS PAIEMENT */}
                  <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Motif</label>
                          <select className="w-full border border-gray-300 rounded px-1 py-1 text-[10px] font-bold" value={motif} onChange={e => setMotif(e.target.value)}>
                              {activeTab === 'ETUDIANT' ? (
                                  <>
                                      <option value="ECOLAGE">ECOLAGE</option><option value="DROIT EXAMEN">DROIT EXAMEN</option>
                                      {(!student || isL1) && <option value="INSCRIPTION">INSCRIPTION</option>}
                                      {(!student || isAncien) && <option value="RE-INSCRIPTION">RE-INSCRIPTION</option>}
                                      <option value="TENUE">TENUE</option><option value="AUTRE">AUTRE</option>
                                  </>
                              ) : (
                                  <><option value="AUTRE">AUTRE</option><option value="VENTE DIVERS">VENTE</option><option value="LOYER">LOYER</option></>
                              )}
                          </select>
                      </div>

                      {/* CHAMPS DYNAMIQUES */}
                      <div className="col-span-2 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px]">
                          {motif === 'ECOLAGE' && (
                              <div className="flex flex-wrap gap-1">
                                  {MONTHS.map(m => (
                                      <button key={m} onClick={() => toggleMonth(m)} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${selectedMonths.includes(m) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500'}`}>{m}</button>
                                  ))}
                              </div>
                          )}
                          {motif === 'DROIT EXAMEN' && (
                              <div className="flex gap-2 text-[10px] font-bold">
                                  {['S1', 'S2', 'RATTRAPAGE'].map(s => (
                                      <label key={s} className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sem" checked={selectedSession === s} onChange={() => setSelectedSession(s)} />{s}</label>
                                  ))}
                              </div>
                          )}
                          {(motif.includes('AUTRE') || motif.includes('VENTE') || motif.includes('LOYER')) && (
                              <input className="w-full border px-2 py-1 rounded text-[10px]" placeholder="Détails..." value={autreDetail} onChange={e => setAutreDetail(e.target.value)} />
                          )}
                          {(motif.includes('INSCRIPTION')) && <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1"><AlertCircle size={10}/> Frais Dossier inclus</div>}
                      </div>

                      <div className="col-span-2">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Montant</label>
                          <input type="number" className="w-full border border-green-300 rounded px-2 py-2 text-right font-mono font-bold text-green-700 text-lg outline-none focus:ring-1 focus:ring-green-500" 
                              placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
                      </div>
                  </div>

                  <button onClick={processPayment} className="mt-auto w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded shadow-sm flex items-center justify-center gap-1 text-[10px] uppercase">
                      <PlusCircle size={12}/> ENCAISSER
                  </button>
              </div>
          </div>

          {/* COLONNE DROITE : JOURNAL (Sage Style) */}
          <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col overflow-hidden">
              <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex justify-between items-center shrink-0">
                  <span className="font-bold text-gray-700 text-[10px] flex items-center gap-1"><History size={12}/> JOURNAL DES ENCAISSEMENTS</span>
                  <span className="text-[9px] text-gray-500 font-mono">{transactions.length} écritures</span>
              </div>
              
              <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-[10px] border-collapse">
                      <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                          <tr>
                              <th className="p-1 border-r border-gray-300 text-left w-16">Heure</th>
                              <th className="p-1 border-r border-gray-300 text-left w-24">Catégorie</th>
                              <th className="p-1 border-r border-gray-300 text-left">Libellé / Client</th>
                              <th className="p-1 border-r border-gray-300 text-left w-20">Caisse</th>
                              <th className="p-1 border-r border-gray-300 text-right w-20">Crédit</th>
                              <th className="p-1 text-center w-8">Doc</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                          {transactions.map((t, i) => (
                              <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                                  <td className="p-1 border-r border-gray-100 text-gray-500">
                                      {new Date(t.created_at).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}
                                  </td>
                                  <td className="p-1 border-r border-gray-100 font-bold text-gray-700 text-[9px]">
                                      {t.category}
                                  </td>
                                  <td className="p-1 border-r border-gray-100 text-gray-800 truncate max-w-[250px]" title={t.description}>
                                      {t.description}
                                  </td>
                                  <td className="p-1 border-r border-gray-100 text-blue-600 text-[9px]">
                                      {t.vaults?.name}
                                  </td>
                                  <td className="p-1 border-r border-gray-100 text-right font-bold text-green-700">
                                      {t.amount.toLocaleString()}
                                  </td>
                                  <td className="p-1 text-center">
                                      <button onClick={() => window.open(`/print/recu?id=${t.id}`, '_blank')} className="text-gray-400 hover:text-blue-600"><Printer size={10}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <div className="bg-gray-100 border-t border-gray-300 p-1 text-right text-[10px] font-bold text-gray-700 font-mono">
                  TOTAL SÉANCE : {transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} Ar
              </div>
          </div>
      </div>
    </div>
  );
}
