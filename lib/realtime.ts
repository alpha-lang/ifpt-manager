import { supabase } from './supabase';
import { SafeRegister, SafeVault, SafeTransaction, toRegister, toTransactions, toVaults } from './typeValidators';

type Handlers = {
  onRegister?: (r: SafeRegister | null) => void;
  onVaults?: (v: SafeVault[]) => void;
  onTransactions?: (t: SafeTransaction[] | SafeTransaction) => void;
};

export function subscribeEconome(handlers: Handlers) {
  const channel = supabase
    .channel('realtime-econome')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_registers' }, (payload) => {
      if (handlers.onRegister) {
        // Fetch latest open register to keep consistent
        supabase.from('cash_registers').select('*').eq('status', 'OPEN').order('created_at', { ascending: false }).maybeSingle()
          .then(({ data }) => handlers.onRegister ? handlers.onRegister(toRegister(data)) : null)
          .catch(() => null);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vaults' }, (payload) => {
      if (handlers.onVaults) {
        supabase.from('vaults').select('*').order('name')
          .then(({ data }) => handlers.onVaults ? handlers.onVaults(toVaults(data ?? [])) : null)
          .catch(() => null);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
      if (handlers.onTransactions) {
        // If payload contains new row, pass it, otherwise fetch recent for safety
        const ev = payload.eventType;
        const newRow = payload.new;
        if (newRow) {
          const t = toTransactions([newRow]);
          handlers.onTransactions(t[0]);
        } else {
          // best-effort: fetch latest transactions for a register is caller's responsibility
          handlers.onTransactions([] as SafeTransaction[]);
        }
      }
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
