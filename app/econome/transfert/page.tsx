'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { ArrowRightLeft, Building2, Wallet, Send, Hash, Calendar, Search, Printer, History, RefreshCw, Clock, CheckCircle, Lock } from 'lucide-react';

export default function TransfertPage() {
  const [vaults, setVaults] = useState<any[]>([]);
  
  // Listes
  const [authorizedTransfers, setAuthorizedTransfers] = useState<any[]>([]); // Validés par DG, à exécuter
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]); // En attente DG
  const [history, setHistory] = useState<any[]>([]); // Journal exécuté

  // Formulaire
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [motif, setMotif] = useState('');

  // Impression
  const [voucher, setVoucher] = useState<any>(null);

  // Notification Maison
  const [notif, setNotif] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  useEffect(() => { if (notif) setTimeout(() => setNotif(null), 3000); }, [notif]);

  // Suivi Temps Réel
  const lastId = useRef<string | null>(null);
  const isFirst = useRef(true);

  // Filtres Journal
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [dateStart, setDateStart] = useState(firstDay);
  const [dateEnd, setDateEnd] = useState(today);

  useEffect(() => { 
    loadData(); 
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [dateStart, dateEnd]);

  // --- LOGIQUE DE NOTIFICATION (Retour DG) ---
  useEffect(() => {
      // On surveille la liste des demandes en cours/autorisées pour voir si un statut a changé
      const allRequests = [...pendingTransfers, ...authorizedTransfers];
      if (allRequests.length > 0) {
          // Logique simplifiée : si une demande passe dans "authorized", on notifie
          // Pour faire simple ici, on check juste le chargement
      }
  }, [authorizedTransfers]);

  const loadData = async () => {
    // 1. Coffres
    const { data: vData } = await supabase.from('vaults').select('*').order('name');
    if (vData) setVaults(vData);

    // 2. Demandes en Attente (PENDING)
    const { data: pend } = await supabase.from('transactions')
        .select('*, vaults(name)')
        .eq('type', 'TRANSFERT')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
    setPendingTransfers(pend || []);

    // 3. Demandes Autorisées (AUTHORIZED)
    const { data: auth } = await supabase.from('transactions')
        .select('*, vaults(name)')
        .eq('type', 'TRANSFERT')
        .eq('status', 'AUTHORIZED')
        .order('created_at', { ascending: false });
    setAuthorizedTransfers(auth || []);

    // 4. Journal Exécuté (VALIDATED)
    const { data: hist } = await supabase.from('transactions')
        .select('*, vaults(name)')
        .eq('type', 'TRANSFERT')
        .eq('status', 'VALIDATED')
        .gte('created_at', `${dateStart}T00:00:00`)
        .lte('created_at', `${dateEnd}T23:59:59`)
        .order('created_at', { ascending: false });
    setHistory(hist || []);
  };

  const getVaultName = (id: string) => vaults.find(v => v.id === id)?.name || '...';

  // --- 1. CRÉATION DE LA DEMANDE ---
  const handleRequest = async () => {
    if (!sourceId || !destId || !amount) return setNotif({type: 'error', msg: 'Données incomplètes'});
    if (sourceId === destId) return setNotif({type: 'error', msg: 'Source = Destination'});

    const val = parseFloat(amount);
    const refText = reference ? `(Réf: ${reference})` : '';
    const destName = getVaultName(destId);

    // On crée UNE seule ligne "En attente" liée au compte source
    const { data, error } = await supabase.from('transactions').insert({
        register_id: null, // Pas encore lié à une caisse spécifique ou prendre celle ouverte
        vault_id: sourceId, // Compte à débiter
        destination_vault_id: destId, // Cible (stockée pour plus tard)
        type: 'TRANSFERT',
        category: 'VIREMENT INTERNE',
        amount: -val, // Montant négatif (sortie prévue)
        description: `Vers ${destName} ${refText} - ${motif}`,
        author: sessionStorage.getItem('name'),
        status: 'PENDING' // Attente DG
    }).select().single();

    if (!error && data) {
        setAmount(''); setMotif(''); setReference('');
        setNotif({ type: 'info', msg: 'Demande transférée au DG. Impression...' });
        setVoucher(data);
        setTimeout(() => window.print(), 500);
        loadData();
    } else {
        setNotif({ type: 'error', msg: 'Erreur création demande' });
    }
  };

  // --- 2. EXÉCUTION DU TRANSFERT (Après Accord DG) ---
  const handleExecute = async (tx: any) => {
      const destName = getVaultName(tx.destination_vault_id);
      const sourceName = getVaultName(tx.vault_id); // Nom du compte source (déjà dans tx.vaults normalement)
      
      const { isConfirmed } = await Swal.fire({
          title: 'Exécuter le Virement ?',
          html: `
            <div class="text-left text-xs bg-blue-50 p-2 rounded border border-blue-200">
                <p>Source: <b>${tx.vaults?.name}</b></p>
                <p>Cible: <b>${destName}</b></p>
                <p class="mt-1 text-lg font-bold text-blue-800">${Math.abs(tx.amount).toLocaleString()} Ar</p>
            </div>
            <p class="text-[10px] text-gray-500 mt-2">Cela débitera la source et créditera la destination immédiatement.</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'CONFIRMER & IMPRIMER',
          confirmButtonColor: '#2563eb'
      });

      if (isConfirmed) {
          // A. Valider la ligne source (Débit)
          const { error: err1 } = await supabase.from('transactions')
            .update({ status: 'VALIDATED', updated_at: new Date().toISOString() })
            .eq('id', tx.id);

          // B. Créer la ligne destination (Crédit)
          const { error: err2 } = await supabase.from('transactions').insert({
              vault_id: tx.destination_vault_id,
              type: 'TRANSFERT',
              category: 'VIREMENT INTERNE',
              amount: Math.abs(tx.amount), // Positif
              description: `De ${tx.vaults?.name} - ${tx.description}`,
              author: sessionStorage.getItem('name'),
              status: 'VALIDATED',
              created_at: new Date().toISOString() // Synchro
          });

          if (!err1 && !err2) {
              setNotif({ type: 'success', msg: 'Transfert exécuté avec succès.' });
              loadData();
              // Impression du ticket de transfert final (optionnel, on réutilise l'ID source pour l'instant)
              window.open(`/print/transfert?id=${tx.id}`, '_blank');
          } else {
              setNotif({ type: 'error', msg: 'Erreur technique lors du mouvement.' });
          }
      }
  };

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col relative">
      
      {/* NOTIF MAISON */}
      {notif && (
          <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg text-white font-bold text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
              notif.type === 'success' ? 'bg-emerald-600' : notif.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
              {notif.type === 'success' ? <CheckCircle size={14}/> : <Clock size={14}/>} {notif.msg}
          </div>
      )}

      {/* ZONE IMPRESSION DEMANDE (Hidden) */}
      <div className="hidden print:block p-8 bg-white fixed inset-0 z-[10000]">
          {voucher && (
              <div className="border border-black p-6 max-w-xl mx-auto font-serif">
                  <div className="text-center border-b border-black pb-2 mb-4">
                      <h1 className="text-xl font-bold uppercase">Demande de Transfert de Fonds</h1>
                      <p className="text-[10px]">REF: {voucher.id.split('-')[0].toUpperCase()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                      <div className="border p-2">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Source (Débit)</p>
                          <p className="font-bold">{getVaultName(voucher.vault_id)}</p>
                      </div>
                      <div className="border p-2">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Destination (Crédit)</p>
                          <p className="font-bold">{getVaultName(voucher.destination_vault_id)}</p>
                      </div>
                  </div>
                  <div className="text-center mb-6">
                      <p className="text-[10px] uppercase font-bold text-gray-500">Montant à Transférer</p>
                      <p className="text-3xl font-bold">{Math.abs(voucher.amount).toLocaleString()} Ar</p>
                  </div>
                  <div className="border-t border-black pt-8 flex justify-between text-[10px] uppercase font-bold">
                      <div className="w-1/3 text-center">Demandeur</div>
                      <div className="w-1/3 text-center">Accord Direction</div>
                  </div>
              </div>
          )}
      </div>

      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0 no-print">
          <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-blue-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Mouvements Internes</span>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded px-2 py-0.5 border border-gray-200">
                  <Calendar size={12} className="text-gray-500 mr-2"/>
                  <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none"/>
                  <span className="mx-1 text-gray-400">-</span>
                  <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-[10px] font-bold w-20 outline-none"/>
              </div>
              <button onClick={() => loadData()}><RefreshCw size={14} className="text-blue-600 hover:rotate-180 transition"/></button>
          </div>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden no-print">
          
          {/* COLONNE GAUCHE : SAISIE DEMANDE (Fixe) */}
          <div className="w-64 flex flex-col gap-2 shrink-0">
              <div className="bg-white border border-gray-300 rounded shadow-sm p-3">
                  <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-3 flex items-center gap-1 text-[10px] uppercase">
                      <Send size={12}/> Nouvelle Demande
                  </h3>
                  
                  <div className="space-y-2">
                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Source (Débit)</label>
                          <div className="relative">
                              <Wallet className="absolute left-2 top-1.5 text-red-400" size={12}/>
                              <select className="w-full border border-red-200 bg-red-50 rounded pl-6 pr-1 py-1 text-[10px] font-bold text-gray-700 outline-none focus:border-red-400" 
                                  value={sourceId} onChange={e => setSourceId(e.target.value)}>
                                  <option value="">-- Choisir --</option>
                                  {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="flex justify-center -my-1">
                          <ArrowRightLeft size={14} className="text-gray-300 rotate-90"/>
                      </div>

                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Destination (Crédit)</label>
                          <div className="relative">
                              <Building2 className="absolute left-2 top-1.5 text-green-400" size={12}/>
                              <select className="w-full border border-green-200 bg-green-50 rounded pl-6 pr-1 py-1 text-[10px] font-bold text-gray-700 outline-none focus:border-green-400"
                                  value={destId} onChange={e => setDestId(e.target.value)}>
                                  <option value="">-- Choisir --</option>
                                  {vaults.map(v => <option key={v.id} value={v.id} disabled={v.id === sourceId}>{v.name}</option>)}
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Montant (Ar)</label>
                          <input type="number" className="w-full border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold text-blue-700 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                      </div>

                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Référence</label>
                          <input type="text" className="w-full border border-gray-300 rounded px-2 py-1 text-[10px] font-mono uppercase"
                              placeholder="CHQ-XXX" value={reference} onChange={e => setReference(e.target.value)} />
                      </div>

                      <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Motif</label>
                          <input type="text" className="w-full border border-gray-300 rounded px-2 py-1 text-[10px]"
                              placeholder="Optionnel..." value={motif} onChange={e => setMotif(e.target.value)} />
                      </div>

                      <button onClick={handleRequest} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded shadow-sm flex items-center justify-center gap-1 text-[10px] mt-2 transition active:scale-95">
                          <Printer size={12}/> DEMANDER
                      </button>
                  </div>
              </div>
          </div>

          {/* COLONNE CENTRE : FILES D'ATTENTE */}
          <div className="w-1/3 flex flex-col gap-2">
              
              {/* 1. PRÊTS À EXÉCUTER (Autorisés) */}
              <div className="bg-white border border-green-300 rounded shadow-sm flex-1 flex flex-col overflow-hidden">
                  <div className="bg-green-50 px-2 py-1 border-b border-green-200 flex justify-between items-center">
                      <span className="font-bold text-green-800 text-[10px] flex items-center gap-1"><CheckCircle size={12}/> À EXÉCUTER (Accord DG)</span>
                      <span className="bg-white px-1.5 rounded text-[9px] font-bold border border-green-100">{authorizedTransfers.length}</span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-1 space-y-1">
                      {authorizedTransfers.length === 0 && <p className="text-center text-gray-300 italic py-4 text-[10px]">Aucun transfert autorisé</p>}
                      {authorizedTransfers.map(tx => (
                          <div key={tx.id} className="flex flex-col bg-green-50/50 border border-green-100 p-2 rounded hover:bg-white transition group">
                              <div className="flex justify-between items-start mb-1">
                                  <div className="text-[10px] font-bold text-gray-700">{Math.abs(tx.amount).toLocaleString()} Ar</div>
                                  <button onClick={() => handleExecute(tx)} className="bg-green-600 text-white px-2 py-0.5 rounded text-[9px] font-bold hover:bg-green-700 shadow-sm animate-pulse">
                                      VALIDER
                                  </button>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-gray-500">
                                  <span className="truncate">{tx.vaults?.name}</span>
                                  <ArrowRightLeft size={8}/>
                                  <span className="font-bold text-gray-700">{getVaultName(tx.destination_vault_id)}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* 2. EN ATTENTE (Pending) */}
              <div className="bg-white border border-orange-200 rounded shadow-sm flex-1 flex flex-col overflow-hidden opacity-80 hover:opacity-100 transition">
                  <div className="bg-orange-50 px-2 py-1 border-b border-orange-200 flex justify-between items-center">
                      <span className="font-bold text-orange-800 text-[10px] flex items-center gap-1"><Clock size={12}/> EN ATTENTE DG</span>
                      <span className="bg-white px-1.5 rounded text-[9px] font-bold border border-orange-100">{pendingTransfers.length}</span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-1 space-y-1">
                      {pendingTransfers.length === 0 && <p className="text-center text-gray-300 italic py-4 text-[10px]">Aucune demande</p>}
                      {pendingTransfers.map(tx => (
                          <div key={tx.id} className="flex justify-between items-center bg-orange-50/30 border border-orange-100 p-1.5 rounded">
                              <div className="text-[9px] text-gray-600">
                                  <span className="font-bold">{Math.abs(tx.amount).toLocaleString()}</span> <span className="text-gray-400">vers</span> {getVaultName(tx.destination_vault_id)}
                              </div>
                              <Clock size={10} className="text-orange-400"/>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* COLONNE DROITE : JOURNAL SAGE */}
          <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col overflow-hidden">
              <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex justify-between items-center shrink-0">
                  <span className="font-bold text-gray-700 text-[10px] flex items-center gap-1"><History size={12}/> JOURNAL EXÉCUTÉ</span>
              </div>
              
              <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-[10px] border-collapse">
                      <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                          <tr>
                              <th className="p-1 border-r border-gray-300 text-left w-20">Date</th>
                              <th className="p-1 border-r border-gray-300 text-left w-24">Compte</th>
                              <th className="p-1 border-r border-gray-300 text-left">Libellé</th>
                              <th className="p-1 border-r border-gray-300 text-right w-20">Mvmt</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                          {history.map((t, i) => (
                              <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                                  <td className="p-1 border-r border-gray-100 text-gray-500">
                                      {new Date(t.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="p-1 border-r border-gray-100 font-bold text-gray-700 text-[9px]">
                                      {t.vaults?.name}
                                  </td>
                                  <td className="p-1 border-r border-gray-100 text-gray-800 truncate max-w-[150px]" title={t.description}>
                                      {t.description}
                                  </td>
                                  <td className={`p-1 border-r border-gray-100 text-right font-bold ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
}