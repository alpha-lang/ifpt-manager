'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, User, FileText, ArrowRight, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import Swal from 'sweetalert2';

type Vault = {
  id: string;
  name: string;
};

type PendingRequest = {
  id: string;
  created_at: string;
  type: string;
  amount: number;
  requester_name?: string | null;
  author?: string | null;
  category?: string | null;
  description?: string | null;
  destination_vault_id?: string | null;
  vaults?: { name?: string | null } | null;
};

export default function PendingValidations() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]); // Pour mapper les IDs de destination

  const fetchVaults = async () => {
    const { data } = await supabase.from('vaults').select('id, name');
    setVaults((data ?? []) as Vault[]);
  };

  const fetchPending = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, vaults!transactions_vault_id_fkey(name)') // On récupère le nom du coffre source
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    setRequests((data ?? []) as PendingRequest[]);
  };

  const getVaultName = (id: string) => vaults.find(v => v.id === id)?.name || 'Caisse Inconnue';

  const handleDecision = async (req: PendingRequest, decision: 'AUTHORIZED' | 'REJECTED') => {
    const { error } = await supabase
      .from('transactions')
      .update({ 
          status: decision,
          updated_at: new Date().toISOString()
      })
      .eq('id', req.id);

    if (!error) {
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      Toast.fire({
        icon: decision === 'AUTHORIZED' ? 'success' : 'info',
        title: decision === 'AUTHORIZED' ? 'Validé (Envoyé Caisse)' : 'Rejeté'
      });
      fetchPending();
    }
  };

  useEffect(() => {
    fetchVaults();
    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, []);

  if (requests.length === 0) return (
    <div className="bg-white rounded shadow-sm border border-gray-300 p-4 mb-4 flex items-center justify-center gap-2 text-gray-400 text-xs italic h-24">
        <CheckCircle size={16} className="opacity-50"/> Aucune demande en attente.
    </div>
  );

  return (
    <div className="bg-white rounded shadow-sm border border-orange-300 mb-4 overflow-hidden animate-in slide-in-from-top-2">
      
      {/* HEADER COMPACT */}
      <div className="bg-orange-50 border-b border-orange-200 p-2 px-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <ShieldAlert className="text-orange-600 animate-pulse" size={16} />
            <h3 className="text-xs font-bold text-orange-900 uppercase tracking-tight">Validations Requises</h3>
        </div>
        <span className="bg-white text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 text-[10px] font-bold">
            {requests.length} en attente
        </span>
      </div>

      {/* LISTE DENSE */}
      <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
        {requests.map((req) => (
          <div key={req.id} className="p-2 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 group">
            
            {/* GAUCHE : INFO DATE & TYPE */}
            <div className="w-24 shrink-0 border-r border-gray-100 pr-2">
                <div className="text-[10px] font-mono text-gray-500">
                    {new Date(req.created_at).toLocaleDateString()}
                </div>
                <div className="text-[9px] text-gray-400 font-mono">
                    {new Date(req.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </div>
                <div className="mt-1">
                    {req.type === 'TRANSFERT' ? (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-100 flex w-fit items-center gap-1">
                            <ArrowRightLeft size={8}/> VIREMENT
                        </span>
                    ) : (
                        <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1 rounded border border-gray-200 flex w-fit items-center gap-1">
                            <FileText size={8}/> DÉCAISSE
                        </span>
                    )}
                </div>
            </div>

            {/* CENTRE : DETAILS OPERATION */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-bold text-gray-800 font-mono">
                        {Math.abs(req.amount).toLocaleString()} Ar
                    </span>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase">
                        <User size={10}/> {req.requester_name || req.author}
                    </div>
                </div>
                
                <div className="text-[10px] text-gray-600 truncate leading-tight">
                    {req.type === 'TRANSFERT' ? (
                        <div className="flex items-center gap-1 text-blue-800 bg-blue-50/50 p-0.5 rounded -ml-0.5">
                            <span className="font-bold">{req.vaults?.name}</span>
                            <ArrowRight size={10} className="text-blue-400"/>
                            <span className="font-bold">{getVaultName(req.destination_vault_id)}</span>
                        </div>
                    ) : (
                        <span title={req.description}>{req.category} - {req.description}</span>
                    )}
                </div>
            </div>

            {/* DROITE : ACTIONS */}
            <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-gray-100">
                <button 
                    onClick={() => handleDecision(req, 'REJECTED')}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Refuser"
                >
                    <XCircle size={16}/>
                </button>
                <button 
                    onClick={() => handleDecision(req, 'AUTHORIZED')}
                    className="bg-blue-600 text-white px-2 py-1.5 rounded shadow-sm text-[10px] font-bold hover:bg-blue-700 flex items-center gap-1 transition active:scale-95"
                    title="Autoriser pour Caisse"
                >
                    <CheckCircle size={12}/> OK
                </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
