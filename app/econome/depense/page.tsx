'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2'; 
import { 
  Printer, Plus, FileText, CheckCircle, XCircle, Clock, 
  AlertTriangle, Info, Wallet, User, Banknote, History, RefreshCw 
} from 'lucide-react';

export default function DepensePage() {
  // --- ÉTATS ---
  const [register, setRegister] = useState<any>(null);
  const [vaults, setVaults] = useState<any[]>([]);
  
  // Listes de données
  const [todoExpenses, setTodoExpenses] = useState<any[]>([]); // Dépenses autorisées par DG
  const [todoSalaries, setTodoSalaries] = useState<any[]>([]); // Salaires validés par RH
  const [historyLog, setHistoryLog] = useState<any[]>([]);     // Journal global (Sage view)

  // Formulaire Compact
  const [reqAmount, setReqAmount] = useState('');
  const [reqMotif, setReqMotif] = useState('DIVERS');
  const [reqDesc, setReqDesc] = useState('');
  const [reqUser, setReqUser] = useState('');

  // Impression
  const [voucher, setVoucher] = useState<any>(null);

  // Notification Maison (No Button)
  const [notif, setNotif] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  useEffect(() => { if (notif) setTimeout(() => setNotif(null), 3000); }, [notif]);

  // Suivi Temps Réel
  const lastId = useRef<string | null>(null);
  const isFirst = useRef(true);

  // --- CHARGEMENT ---
  useEffect(() => {
      setReqUser(sessionStorage.getItem('name') || '');
      loadData();
      const interval = setInterval(loadData, 5000); // Polling 5s
      return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
      // 1. Caisse & Coffres
      const { data: rData } = await supabase.from('cash_registers').select('*').eq('status', 'OPEN').maybeSingle();
      setRegister(rData);
      const { data: vData } = await supabase.from('vaults').select('id, name').order('name');
      setVaults(vData || []);

      if (rData) {
          // 2. Dépenses Autorisées par DG (Status: AUTHORIZED)
          const { data: authExp } = await supabase.from('transactions')
              .select('*').eq('status', 'AUTHORIZED').order('created_at');
          setTodoExpenses(authExp || []);

          // 3. Salaires RH en attente (Status: PENDING dans payment_requests)
          const { data: authSal } = await supabase.from('payment_requests')
              .select('*').eq('status', 'PENDING').order('created_at');
          setTodoSalaries(authSal || []);

          // 4. Journal Global (Tout type, Tout statut pour la vue "Log")
          // On exclut les brouillons (si existants) et on prend les 50 derniers
          const { data: logs } = await supabase.from('transactions')
              .select('*, vaults(name)')
              .in('type', ['DEPENSE', 'TRANSFERT'])
              .order('created_at', { ascending: false })
              .limit(50);
          setHistoryLog(logs || []);

          // 5. Check Notification (Sur le Log Global)
          if (logs && logs.length > 0) {
              const latest = logs[0];
              if (latest.id !== lastId.current) {
                  if (!isFirst.current) {
                      if (latest.status === 'AUTHORIZED') setNotif({ type: 'success', msg: `DG: Accord pour "${latest.category}"` });
                      if (latest.status === 'REJECTED') setNotif({ type: 'error', msg: `DG: Refus pour "${latest.category}"` });
                  }
                  lastId.current = latest.id;
              }
              isFirst.current = false;
          }
      }
  };

  // --- ACTIONS ---

  // 1. Soumettre une demande (Impression Bordereau)
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reqAmount || !reqDesc) return setNotif({type: 'error', msg: 'Données manquantes'});

      const { data, error } = await supabase.from('transactions').insert({
          type: 'DEPENSE', category: reqMotif, amount: parseFloat(reqAmount),
          description: reqDesc, author: reqUser, requester_name: reqUser,
          status: 'PENDING', vault_id: null // Pas de coffre au stade demande
      }).select().single();

      if (!error && data) {
          setReqAmount(''); setReqDesc('');
          setNotif({ type: 'info', msg: 'Demande enregistrée. Impression...' });
          setVoucher(data);
          setTimeout(() => window.print(), 500);
          loadData();
      }
  };

  // 2. Payer une Dépense (Autorisée par DG)
  const handlePayExpense = async (tx: any) => {
      if (!register) return;
      const { value: vaultId } = await Swal.fire({
          title: 'Sortie de Caisse',
          html: `<div class="text-left text-xs"><b>Ref:</b> ${tx.category}<br/><b>Montant:</b> ${tx.amount.toLocaleString()} Ar</div>`,
          input: 'select', inputOptions: vaults.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}),
          showCancelButton: true, confirmButtonText: 'DÉCAISSER', confirmButtonColor: '#10b981'
      });

      if (vaultId) {
          await supabase.from('transactions').update({
              status: 'VALIDATED', vault_id: vaultId, register_id: register.id, updated_at: new Date().toISOString()
          }).eq('id', tx.id);
          setNotif({ type: 'success', msg: 'Sortie effectuée.' });
          loadData();
      }
  };

  // 3. Payer un Salaire (Autorisé par RH)
  const handlePaySalary = async (req: any) => {
      if (!register) return;
      const { value: vaultId } = await Swal.fire({
          title: 'Paiement Salaire',
          html: `<div class="text-left text-xs"><b>Bénéficiaire:</b> ${req.beneficiary}<br/><b>Net à Payer:</b> ${req.amount.toLocaleString()} Ar</div>`,
          input: 'select', inputOptions: vaults.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}),
          showCancelButton: true, confirmButtonText: 'PAYER', confirmButtonColor: '#2563eb'
      });

      if (vaultId) {
          const { error } = await supabase.from('transactions').insert({
              register_id: register.id, vault_id: vaultId, type: 'DEPENSE', category: 'SALAIRE',
              amount: req.amount, description: `Paie: ${req.beneficiary} - ${req.description}`,
              author: sessionStorage.getItem('name'), status: 'VALIDATED'
          });
          if (!error) {
              await supabase.from('payment_requests').update({ status: 'PAID' }).eq('id', req.id);
              setNotif({ type: 'success', msg: 'Salaire payé.' });
              loadData();
          }
      }
  };

  if (!register) return <div className="p-10 text-center text-xs text-gray-500 font-mono">SESSION CAISSE FERMÉE. VEUILLEZ OUVRIR LA CAISSE.</div>;

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

      {/* ZONE IMPRESSION BORDEREAU (Hidden) */}
      <div className="hidden print:block p-8 bg-white fixed inset-0 z-[10000]">
          {voucher && (
              <div className="border border-black p-6 max-w-xl mx-auto font-serif">
                  <div className="text-center border-b border-black pb-2 mb-4">
                      <h1 className="text-xl font-bold uppercase">Bordereau de Demande</h1>
                      <p className="text-[10px]">REF: {voucher.id.split('-')[0].toUpperCase()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div><p><strong>Demandeur:</strong> {voucher.requester_name}</p><p><strong>Date:</strong> {new Date().toLocaleDateString()}</p></div>
                      <div className="text-right"><p><strong>Montant:</strong> {voucher.amount.toLocaleString()} Ar</p><p><strong>Type:</strong> {voucher.category}</p></div>
                  </div>
                  <div className="border border-black p-2 min-h-[60px] mb-8 text-sm"><p className="underline font-bold text-xs">Motif:</p>{voucher.description}</div>
                  <div className="flex justify-between text-[10px] uppercase font-bold pt-8">
                      <div className="w-1/3 border-t border-black pt-1 text-center">Demandeur</div>
                      <div className="w-1/3 border-t border-black pt-1 text-center">Direction (Visa)</div>
                      <div className="w-1/3 border-t border-black pt-1 text-center">Caisse (Acquit)</div>
                  </div>
              </div>
          )}
      </div>

      {/* --- INTERFACE PRINCIPALE --- */}
      
      {/* 1. TOP BAR COMPACTE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 print:hidden">
          <div className="flex items-center gap-2">
              <Wallet size={16} className="text-gray-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Console de Décaissement</span>
              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-green-200">CAISSE OUVERTE</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
              <span>{new Date().toLocaleDateString()}</span>
              <button onClick={() => loadData()}><RefreshCw size={12} className="hover:rotate-180 transition"/></button>
          </div>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden print:hidden">
          
          {/* COLONNE GAUCHE : SAISIE (Fixe) */}
          <div className="w-64 flex flex-col gap-2">
              <div className="bg-white border border-gray-300 rounded shadow-sm p-3">
                  <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2 flex items-center gap-1">
                      <Plus size={12}/> NOUVELLE DEMANDE
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-2">
                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">Demandeur</label>
                          <input className="w-full border border-gray-300 rounded px-2 py-1 text-[11px] font-bold bg-gray-50" value={reqUser} onChange={e => setReqUser(e.target.value)} required />
                      </div>
                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">Motif</label>
                          <select className="w-full border border-gray-300 rounded px-1 py-1 text-[10px] bg-white" value={reqMotif} onChange={e => setReqMotif(e.target.value)}>
                              <option value="DIVERS">DIVERS / ACHAT</option>
                              <option value="TRANSPORT">TRANSPORT</option>
                              <option value="FACTURE">FACTURE</option>
                              <option value="SALAIRE">SALAIRE</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">Montant</label>
                          <input type="number" className="w-full border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold text-blue-600" placeholder="0.00" value={reqAmount} onChange={e => setReqAmount(e.target.value)} required />
                      </div>
                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">Détails</label>
                          <textarea className="w-full border border-gray-300 rounded px-2 py-1 text-[10px]" rows={2} placeholder="..." value={reqDesc} onChange={e => setReqDesc(e.target.value)} required />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded shadow-sm flex items-center justify-center gap-1 text-[10px] mt-2">
                          <Printer size={12}/> ENREGISTRER
                      </button>
                  </form>
              </div>
              
              <div className="bg-gray-200 border border-gray-300 rounded p-2 text-center text-[10px] text-gray-500 italic flex-1">
                  Zone de notes ou stats rapides...
              </div>
          </div>

          {/* COLONNE CENTRE : À TRAITER (Queue) */}
          <div className="w-1/3 flex flex-col gap-2">
              
              {/* 1. SALAIRES RH (Priorité Haute) */}
              <div className="bg-white border border-blue-200 rounded shadow-sm flex-1 flex flex-col overflow-hidden">
                  <div className="bg-blue-50 px-2 py-1.5 border-b border-blue-200 flex justify-between items-center">
                      <span className="font-bold text-blue-800 text-[10px] flex items-center gap-1"><User size={12}/> SALAIRES (RH)</span>
                      <span className="bg-white px-1.5 rounded text-[9px] font-bold border border-blue-100">{todoSalaries.length}</span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-1 space-y-1">
                      {todoSalaries.length === 0 && <p className="text-center text-gray-300 italic py-4 text-[10px]">Rien à payer</p>}
                      {todoSalaries.map(s => (
                          <div key={s.id} className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-1.5 rounded hover:bg-white transition group">
                              <div className="overflow-hidden">
                                  <div className="font-bold text-gray-700 truncate">{s.beneficiary}</div>
                                  <div className="text-[9px] text-gray-400 truncate">{s.description}</div>
                              </div>
                              <button onClick={() => handlePaySalary(s)} className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold hover:bg-blue-700 shadow-sm flex-shrink-0">
                                  {s.amount.toLocaleString()} Ar
                              </button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* 2. DÉPENSES DG (Priorité Moyenne) */}
              <div className="bg-white border border-green-200 rounded shadow-sm flex-1 flex flex-col overflow-hidden">
                  <div className="bg-green-50 px-2 py-1.5 border-b border-green-200 flex justify-between items-center">
                      <span className="font-bold text-green-800 text-[10px] flex items-center gap-1"><CheckCircle size={12}/> AUTORISÉS (DG)</span>
                      <span className="bg-white px-1.5 rounded text-[9px] font-bold border border-green-100">{todoExpenses.length}</span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-1 space-y-1">
                      {todoExpenses.length === 0 && <p className="text-center text-gray-300 italic py-4 text-[10px]">Aucune autorisation</p>}
                      {todoExpenses.map(ex => (
                          <div key={ex.id} className="flex justify-between items-center bg-green-50/50 border border-green-100 p-1.5 rounded hover:bg-white transition">
                              <div className="overflow-hidden">
                                  <div className="font-bold text-gray-700 truncate">{ex.category}</div>
                                  <div className="text-[9px] text-gray-400 truncate italic">"{ex.description}"</div>
                              </div>
                              <button onClick={() => handlePayExpense(ex)} className="bg-green-600 text-white px-2 py-1 rounded text-[9px] font-bold hover:bg-green-700 shadow-sm flex-shrink-0">
                                  {ex.amount.toLocaleString()} Ar
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* COLONNE DROITE : LE LOG "SAGE" (Historique dense) */}
          <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col overflow-hidden">
              <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex justify-between items-center">
                  <span className="font-bold text-gray-700 text-[10px] flex items-center gap-1"><History size={12}/> JOURNAL DES MOUVEMENTS</span>
                  <span className="text-[9px] text-gray-500 font-mono">Derniers 50</span>
              </div>
              
              <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-[10px] border-collapse">
                      <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm">
                          <tr>
                              <th className="p-1 border-r border-gray-300 text-left w-12">Heure</th>
                              <th className="p-1 border-r border-gray-300 text-left w-20">Type</th>
                              <th className="p-1 border-r border-gray-300 text-left">Description / Tiers</th>
                              <th className="p-1 border-r border-gray-300 text-right w-20">Montant</th>
                              <th className="p-1 text-center w-16">Statut</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                          {historyLog.map((log, i) => (
                              <tr key={log.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                  <td className="p-1 border-r border-gray-100 text-gray-500">
                                      {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                  </td>
                                  <td className="p-1 border-r border-gray-100">
                                      <span className={`px-1 rounded-[2px] text-[9px] ${log.type === 'TRANSFERT' ? 'bg-purple-100 text-purple-800' : 'text-gray-700'}`}>
                                          {log.category.substring(0,10)}
                                      </span>
                                  </td>
                                  <td className="p-1 border-r border-gray-100 text-gray-800 truncate max-w-[150px]" title={log.description}>
                                      {log.description}
                                  </td>
                                  <td className={`p-1 border-r border-gray-100 text-right font-bold ${log.status === 'REJECTED' ? 'text-gray-300 line-through' : 'text-red-600'}`}>
                                      {log.amount.toLocaleString()}
                                  </td>
                                  <td className="p-1 text-center">
                                      {log.status === 'PENDING' && <span className="bg-orange-100 text-orange-600 px-1 rounded text-[9px]">ATT</span>}
                                      {log.status === 'AUTHORIZED' && <span className="bg-blue-100 text-blue-600 px-1 rounded text-[9px] font-bold">AUTO</span>}
                                      {log.status === 'VALIDATED' && <span className="bg-green-100 text-green-600 px-1 rounded text-[9px] font-bold">OK</span>}
                                      {log.status === 'REJECTED' && <span className="bg-red-100 text-red-600 px-1 rounded text-[9px]">NON</span>}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <div className="bg-gray-100 border-t border-gray-300 p-1 text-right text-[9px] text-gray-500">
                  Total Affiché: {historyLog.reduce((sum, t) => t.status === 'VALIDATED' ? sum + t.amount : sum, 0).toLocaleString()} Ar
              </div>
          </div>

      </div>
    </div>
  );
}