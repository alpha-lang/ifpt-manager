'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeEconome } from '@/lib/realtime';
import { PlusCircle, History, RefreshCw, X, Search, AlertCircle, Lock, UserPlus, Wallet, CheckCircle, Printer, ChevronDown, Calculator } from 'lucide-react';
import { toVaults, toRegister, toStudents, toTransactions, SafeRegister, SafeVault, SafeStudent, SafeTransaction } from '@/lib/typeValidators';

// --- TYPES BDD ---
type Register = SafeRegister;
type Vault = SafeVault;
type Student = SafeStudent;
type Transaction = SafeTransaction;

export default function POSRecette() {
  // --- ETATS ---
  const [loading, setLoading] = useState(false);
  const [register, setRegister] = useState<Register | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Interface
  const [activeTab, setActiveTab] = useState('ETUDIANT'); 
  const [selectedVault, setSelectedVault] = useState<string>('');
  
  // Recherche Etudiant
  const [matricule, setMatricule] = useState('');
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  
  // Transaction Data
  const [amount, setAmount] = useState('');
  const [motif, setMotif] = useState('ECOLAGE');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState('S1');
  const [autreDetail, setAutreDetail] = useState('');

  // Tools
  const [notif, setNotif] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  const [time, setTime] = useState(new Date());
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');

  const MONTHS = ['OCT', 'NOV', 'DEC', 'JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT'];

  // --- INITIALISATION & TEMPS REEL ---
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    initializePOS();
        // Souscription realtime : mise à jour automatique des coffres, caisse et transactions
        const unsubscribe = subscribeEconome({
            onRegister: (r) => { setRegister(r); if (r) loadTransactions((r as any).id); },
            onVaults: (v) => setVaults(v),
            onTransactions: (t) => { if (register) loadTransactions(register.id); }
        });
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (notif) setTimeout(() => setNotif(null), 3000); }, [notif]);

  useEffect(() => {
    setStudent(null); setMatricule(''); setSuggestions([]); setSelectedMonths([]);
    setSelectedSession('S1'); setAutreDetail(''); setAmount('');
    setMotif(activeTab === 'ETUDIANT' ? 'ECOLAGE' : 'AUTRE');
  }, [activeTab]);

    // Si la liste des coffres change, définir par défaut la caisse physique si aucune sélection
    useEffect(() => {
        if (!selectedVault && vaults.length > 0) {
            const phys = vaults.find(v => (
                (v.name && v.name.toString().toLowerCase().includes('esp')) ||
                (v.name && v.name.toString().toLowerCase().includes('cash')) ||
                (v.type && v.type === 'CASH')
            ));
            if (phys) setSelectedVault(phys.id);
            else setSelectedVault(vaults[0].id);
        }
    }, [vaults]);

  // --- LOGIQUE BDD ---

  // 1. Chargement Initial
  const initializePOS = async () => {
    // Charge les coffres
    const { data: vData, error: vError } = await supabase.from('vaults').select('*').order('name');
    if (vError) console.error("Erreur Coffres:", vError);
    
    if (vData) {
        const validVaults = toVaults(vData);
        setVaults(validVaults);
        const defaultVault = validVaults.find(v => 
            v.name.toUpperCase().includes('ESP') || 
            v.name.toUpperCase().includes('CASH') ||
            v.type === 'CASH'
        );
        if (defaultVault) setSelectedVault(defaultVault.id);
        else if (validVaults.length > 0) setSelectedVault(validVaults[0].id);
    }

    // Vérifie la caisse
    const { data: rData } = await supabase.from('cash_registers')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .maybeSingle(); 
    
    setRegister(toRegister(rData));
    if (rData) loadTransactions(rData.id);
  };

  // 2. Charger le Journal (Version Robuste)
  const loadTransactions = async (regId: string) => {
    // MODIFICATION ICI : On utilise la syntaxe standard
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            vaults!transactions_vault_id_fkey (
                name
            )
        `)
        .eq('register_id', regId)
        .eq('type', 'RECETTE')
        .order('created_at', { ascending: false });
    
    if (error) {
        // Astuce : JSON.stringify permet de voir l'erreur même si elle semble vide
        console.error("ERREUR SQL:", JSON.stringify(error, null, 2));
        setNotif({type:'error', msg: "Erreur de liaison BDD (Voir Console)"});
    } else {
        console.log("Données chargées:", data); // Pour vérifier si on reçoit bien le tableau
        const validTransactions = toTransactions(data ?? []);
        setTransactions(validTransactions);
    }
    
    // Refresh solde coffres
    const { data: vData } = await supabase.from('vaults').select('*').order('name');
    if(vData) setVaults(toVaults(vData));
  };

  // 3. Recherche Étudiant
  const handleSearchInput = async (val: string) => {
    setMatricule(val);
    if (val.length > 1) { 
      const { data } = await supabase.from('students')
        .select('*')
        .or(`matricule.ilike.%${val}%,nom.ilike.%${val}%`)
        .limit(5);
      setSuggestions(toStudents(data ?? []));
    } else { setSuggestions([]); }
  };

  // 4. Validation & Enregistrement
  const processPayment = async () => {
        if (!amount || isNaN(parseFloat(amount))) return setNotif({type:'error', msg: 'Montant invalide'});
        if (!register) return setNotif({type:'error', msg: 'Aucune caisse ouverte'});

        // Si aucune caisse sélectionnée, tenter d'utiliser la caisse physique par défaut
        let vaultToUse = selectedVault;
        if (!vaultToUse) {
            const phys = vaults.find(v => (
                (v.name && v.name.toString().toLowerCase().includes('esp')) ||
                (v.name && v.name.toString().toLowerCase().includes('cash')) ||
                (v.type && v.type === 'CASH')
            ));
            if (phys) { vaultToUse = phys.id; setSelectedVault(phys.id); }
        }
        if (!vaultToUse) return setNotif({type:'error', msg: 'Sélectionnez un coffre'});
    if (activeTab === 'ETUDIANT' && !student) return setNotif({type: 'error', msg: 'Étudiant requis'});
    
    setLoading(true);

    const detailString = motif === 'ECOLAGE' ? `Mois: ${selectedMonths.join(', ')}` : (motif === 'DROIT EXAMEN' ? `Session: ${selectedSession}` : `Détail: ${autreDetail}`);
    const desc = activeTab === 'ETUDIANT' ? `${motif} (${detailString}) - ${student?.nom} (${matricule})` : `${motif} - ${autreDetail || 'CLIENT DIVERS'}`;

    const { data: insertedData, error } = await supabase.from('transactions').insert({
        register_id: register.id,
        vault_id: vaultToUse,
        type: 'RECETTE',
        category: motif,
        amount: parseFloat(amount),
        description: desc,
        author: sessionStorage.getItem('name') || 'ECONOME',
        status: 'VALIDATED',
        created_at: new Date().toISOString()
    })
    .select('*, vaults!transactions_vault_id_fkey(name)')
    .single();

    if (error) {
        console.error("ERREUR ENCAISSEMENT:", error);
        setNotif({ type: 'error', msg: 'Erreur BDD: ' + error.message });
    } else {
        setNotif({ type: 'success', msg: 'Encaissement enregistré !' });
        
        if (insertedData) {
            setTransactions(prev => [insertedData as unknown as Transaction, ...prev]);
            // Mettre à jour le solde du coffre en base
            try {
                const amt = parseFloat(amount);
                const targetVaultId = vaultToUse || selectedVault;
                const current = vaults.find(v => v.id === targetVaultId);
                const newBalance = (current?.balance ?? 0) + amt;
                const { error: upErr } = await supabase.from('vaults').update({ balance: newBalance }).eq('id', targetVaultId);
                if (upErr) console.error('Erreur mise à jour coffre:', upErr);
                else setVaults(prev => prev.map(v => v.id === targetVaultId ? { ...v, balance: newBalance } : v));
            } catch (e) {
                console.error('Erreur mise à jour locale coffre:', e);
            }
        } else {
            loadTransactions(register.id);
        }

        // Reset
        setAmount('');
        if(activeTab === 'ETUDIANT') { 
             setMatricule(''); setStudent(null); setSelectedMonths([]); 
        } else { 
            setAutreDetail(''); 
        }
    }
    setLoading(false);
  };

  // --- LOGIQUE INTERFACE ---
  const isL1 = student && (student.classe.toUpperCase().includes('L1') || student.classe.toUpperCase().includes('1ERE'));
  const isAncien = student && !isL1;

  const selectStudent = (s: Student) => {
    setStudent(s); setMatricule(s.matricule); setSuggestions([]); 
    if (s.classe.toUpperCase().includes('L1') && motif === 'RE-INSCRIPTION') setMotif('INSCRIPTION');
    if (!s.classe.toUpperCase().includes('L1') && motif === 'INSCRIPTION') setMotif('RE-INSCRIPTION');
  };
  
  const toggleMonth = (m: string) => {
    if (selectedMonths.includes(m)) setSelectedMonths(prev => prev.filter(x => x !== m));
    else setSelectedMonths(prev => [...prev, m]);
  };

  const handleCalc = (val: string) => {
    if (val === 'C') setCalcDisplay('');
    else if (val === '=') { try { setCalcDisplay(eval(calcDisplay).toString()); } catch { setCalcDisplay('Err'); } }
    else if (val === 'COPY') { setAmount(calcDisplay); setShowCalc(false); }
    else setCalcDisplay(prev => prev + val);
  };

  if (!register && !loading) return (
      <div className="h-screen flex flex-col items-center justify-center text-slate-400 bg-slate-50">
          <Lock size={48} className="mb-4 text-slate-300"/>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Aucune session de caisse ouverte</p>
          <button onClick={() => window.location.reload()} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded font-bold text-xs"><RefreshCw size={12}/> Réessayer</button>
      </div>
  );

  return (
    <div className="h-[calc(100vh-60px)] bg-slate-100 p-2 text-xs font-sans overflow-hidden flex flex-col relative animate-in-faint">
      
      {/* NOTIFICATIONS */}
      {notif && (
          <div className={`fixed top-4 right-4 z-[9999] px-6 py-3 rounded shadow-2xl text-white font-black text-[11px] flex items-center gap-3 animate-bounce ${notif.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {notif.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>} {notif.msg.toUpperCase()}
          </div>
      )}

      {/* CALCULATRICE */}
      {showCalc && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 p-5 rounded-lg shadow-2xl border-2 border-slate-600 w-80 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white font-mono text-right p-4 mb-4 rounded text-3xl h-20 flex items-center justify-end overflow-hidden border border-slate-700 shadow-inner">
                {calcDisplay || '0'}
            </div>
            <div className="grid grid-cols-4 gap-2">
                {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','C','+'].map(b => (
                    <button key={b} onClick={() => handleCalc(b)} className={`h-14 text-xl font-bold rounded shadow-sm active:scale-95 transition-transform ${['C','/','*','-','+'].includes(b) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-900 hover:bg-white'}`}>{b}</button>
                ))}
                <button onClick={() => handleCalc('=')} className="col-span-2 bg-emerald-600 text-white h-14 rounded font-black text-2xl shadow-sm active:scale-95">=</button>
                <button onClick={() => handleCalc('COPY')} className="col-span-2 bg-slate-600 text-white h-14 rounded font-black text-sm uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2">COPIER</button>
            </div>
            <button onClick={() => setShowCalc(false)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform"><X size={20}/></button>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-slate-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-blue-600"/>
                <span className="font-black text-slate-700 uppercase tracking-tighter text-sm hidden md:inline">Point de Vente</span>
              </div>
              <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-sm text-[8px] font-black tracking-widest shadow-sm">OUVERTE</span>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                  <button onClick={() => setShowCalc(!showCalc)} className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-all border ${showCalc ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'}`}>
                      <Calculator size={14}/> <span className="hidden sm:inline">CALC</span>
                  </button>
                  <div className="bg-slate-800 text-white px-3 py-1 rounded text-[11px] font-mono font-bold tracking-widest shadow-sm border border-slate-600 min-w-[80px] text-center">
                      {time.toLocaleTimeString('fr-FR', { timeZone: 'Indian/Antananarivo' })}
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400">
              <span className="font-mono hidden sm:inline uppercase">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
              <button onClick={() => loadTransactions(register?.id || '')} className="hover:text-blue-600 transition-colors"><RefreshCw size={14}/></button>
          </div>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden">
          
          {/* GAUCHE : FORMULAIRE */}
          <div className="w-80 flex flex-col gap-2 shrink-0">
              <div className="bg-white border border-slate-300 rounded shadow-sm p-4 flex flex-col gap-4 h-full overflow-y-auto">
                  
                  {/* TABS */}
                  <div className="flex bg-slate-100 p-1 rounded-sm">
                      {['ETUDIANT', 'AUTRE'].map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 text-[9px] font-black py-1.5 transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                              {tab === 'ETUDIANT' ? 'SCOLARITÉ' : 'DIVERS'}
                          </button>
                      ))}
                  </div>

                  {/* SELECT COFFRE */}
                  <div className="relative group">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-0.5">Compte de Réception</label>
                      <div className="relative flex items-center">
                          <select
                              value={selectedVault}
                              onChange={(e) => setSelectedVault(e.target.value)}
                              className="w-full h-9 pl-2 pr-10 border-2 border-slate-200 rounded-none bg-slate-50 text-[11px] font-black text-slate-700 uppercase outline-none focus:border-blue-600 focus:bg-white appearance-none cursor-pointer transition-all shadow-sm"
                          >
                              <option value="" disabled>CHOISIR...</option>
                              {vaults.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.name.toUpperCase()} {v.balance != null ? `— [ ${Number(v.balance).toLocaleString()} AR ]` : ''}
                                </option>
                              ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-blue-600 border-l-2 border-slate-200 bg-slate-100 group-hover:bg-blue-50">
                              <ChevronDown size={14} />
                          </div>
                      </div>
                  </div>

                  {/* RECHERCHE ETUDIANT */}
                  {activeTab === 'ETUDIANT' && (
                      <div className="relative">
                          <label className="flex justify-between text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-0.5">
                              <span>Matricule / Nom</span>
                              <button className="text-blue-600 hover:text-blue-800"><UserPlus size={12}/></button>
                          </label>
                          <div className="relative">
                              <Search className="absolute left-2 top-2.5 text-slate-400" size={14}/>
                              <input className="w-full h-9 border border-slate-300 pl-8 p-1 rounded-none text-[11px] font-black uppercase focus:border-blue-600 outline-none bg-slate-50 focus:bg-white transition-all" 
                                  placeholder="RECHERCHE..." value={matricule} onChange={e => handleSearchInput(e.target.value)} />
                          </div>
                          {suggestions.length > 0 && (
                              <ul className="absolute z-50 w-full bg-white border-2 border-slate-200 shadow-2xl mt-1 max-h-40 overflow-y-auto">
                                  {suggestions.map(s => (
                                      <li key={s.id} onClick={() => selectStudent(s)} className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b last:border-0 flex justify-between text-[10px] font-bold">
                                          <span>{s.matricule} - {s.nom}</span>
                                          <span className="bg-slate-100 text-slate-600 px-1 rounded text-[8px]">{s.classe}</span>
                                      </li>
                                  ))}
                              </ul>
                          )}
                          {student && (
                              <div className="mt-2 bg-blue-50 border-l-4 border-blue-600 p-2 text-blue-900 text-[10px] font-black flex flex-col shadow-sm">
                                  <span className="uppercase">{student.nom}</span>
                                  <span className="text-[8px] font-bold opacity-70">Classe : {student.classe}</span>
                              </div>
                          )}
                      </div>
                  )}

                  {/* DETAILS PAIEMENT */}
                  <div className="space-y-4">
                      <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-0.5">Motif</label>
                          <select className="w-full h-8 border border-slate-300 rounded-none px-2 text-[10px] font-black uppercase bg-slate-50 focus:bg-white outline-none focus:border-blue-600 transition-all" value={motif} onChange={e => setMotif(e.target.value)}>
                              {activeTab === 'ETUDIANT' ? (
                                  <>
                                      <option value="ECOLAGE">ECOLAGE MENSUEL</option><option value="DROIT EXAMEN">DROIT EXAMEN</option>
                                      {(!student || isL1) && <option value="INSCRIPTION">INSCRIPTION</option>}
                                      {(!student || isAncien) && <option value="RE-INSCRIPTION">RE-INSCRIPTION</option>}
                                      <option value="TENUE">TENUE / UNIFORME</option><option value="AUTRE">AUTRE FRAIS</option>
                                  </>
                              ) : (
                                  <><option value="AUTRE">DIVERS</option><option value="VENTE DIVERS">VENTE FOURNITURES</option><option value="LOYER">LOYER / LOCATION</option></>
                              )}
                          </select>
                      </div>

                      <div className="p-2 bg-slate-50 border border-slate-200 min-h-[50px]">
                          {motif === 'ECOLAGE' && (
                              <div className="grid grid-cols-4 gap-1">
                                  {MONTHS.map(m => (
                                      <button key={m} onClick={() => toggleMonth(m)} className={`py-1 rounded-none text-[8px] font-black border transition-all ${selectedMonths.includes(m) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`}>{m}</button>
                                  ))}
                              </div>
                          )}
                          {motif === 'DROIT EXAMEN' && (
                              <div className="flex gap-4 text-[9px] font-black uppercase">
                                  {['S1', 'S2', 'RATTRAPAGE'].map(s => (
                                      <label key={s} className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sem" className="w-3 h-3" checked={selectedSession === s} onChange={() => setSelectedSession(s)} />{s}</label>
                                  ))}
                              </div>
                          )}
                          {(motif.includes('AUTRE') || motif.includes('VENTE') || motif.includes('LOYER')) && (
                              <input className="w-full border border-slate-300 h-8 px-2 text-[10px] font-bold outline-none" placeholder="PRÉCISEZ..." value={autreDetail} onChange={e => setAutreDetail(e.target.value)} />
                          )}
                      </div>

                      <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-0.5">Montant (Ar)</label>
                          <input type="number" className="w-full h-12 border-2 border-emerald-500 bg-emerald-50 text-right font-mono font-black text-emerald-800 text-xl px-3 outline-none focus:bg-white focus:border-blue-600 transition-all shadow-inner" 
                              placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
                      </div>
                  </div>

                  <button onClick={processPayment} disabled={loading} className="mt-auto w-full bg-slate-800 hover:bg-black text-white font-black h-12 shadow-xl flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] transition-transform active:scale-95 disabled:opacity-50">
                      {loading ? 'TRAITEMENT...' : <><PlusCircle size={16}/> VALIDER ENCAISSEMENT</>}
                  </button>
              </div>
          </div>

          {/* DROITE : JOURNAL */}
          <div className="flex-1 bg-white border border-slate-300 rounded shadow-sm flex flex-col overflow-hidden">
              <div className="bg-slate-800 px-3 py-2 flex justify-between items-center shrink-0">
                  <span className="font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2"><History size={14} className="text-blue-400"/> Grand Livre Recettes</span>
                  <span className="text-[9px] text-slate-400 font-mono italic">Session: {transactions.length} lignes</span>
              </div>
              <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                  <table className="w-full text-[10px] border-collapse">
                      <thead className="bg-slate-100 text-slate-500 font-black uppercase sticky top-0 z-10 shadow-sm text-[8px] tracking-tighter">
                          <tr>
                              <th className="p-2 border-b border-r border-slate-200 text-left w-16">Heure</th>
                              <th className="p-2 border-b border-r border-slate-200 text-left w-24">Nature</th>
                              <th className="p-2 border-b border-r border-slate-200 text-left">Désignation</th>
                              <th className="p-2 border-b border-r border-slate-200 text-left w-24">Caisse</th>
                              <th className="p-2 border-b border-r border-slate-200 text-right w-24">Crédit</th>
                              <th className="p-2 border-b text-center w-10">Doc</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                          {transactions.map((t, i) => (
                              <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50 transition-colors`}>
                                  <td className="p-2 border-r border-slate-100 text-slate-400 font-bold">{new Date(t.created_at).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</td>
                                  <td className="p-2 border-r border-slate-100"><span className="text-[8px] font-black bg-slate-200 px-1 py-0.5 rounded-sm">{t.category}</span></td>
                                  <td className="p-2 border-r border-slate-100 text-slate-800 font-sans font-bold uppercase text-[9px] truncate max-w-[300px]">{t.description}</td>
                                  <td className="p-2 border-r border-slate-100 text-blue-600 font-black text-[9px] uppercase italic">
                                    {t.vaults?.name || '-'}
                                  </td>
                                  <td className="p-2 border-r border-slate-100 text-right font-black text-slate-900 bg-slate-50/30">{t.amount.toLocaleString()}</td>
                                  <td className="p-2 text-center"><button onClick={() => window.open(`/print/recu?id=${t.id}`, '_blank')} className="text-slate-300 hover:text-blue-600 transition-transform hover:scale-125"><Printer size={12}/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <div className="bg-slate-900 border-t border-slate-800 p-3 text-right flex justify-end gap-10">
                  <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cumul Séance</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">{transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} Ar</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}