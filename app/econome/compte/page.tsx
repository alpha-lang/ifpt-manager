'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, RefreshCw, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Vault = {
  id: string;
  name: string;
  balance: number;
  icon?: string | null;
  [key: string]: unknown;
};

export default function MultiComptePage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVaults = async () => {
    setLoading(true);
    const { data } = await supabase.from('vaults').select('*').order('name');
    setVaults((data ?? []) as Vault[]);
    setLoading(false);
  };

  useEffect(() => {
    loadVaults();
  }, []);

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-gray-600" />
          <span className="font-bold text-gray-700 uppercase tracking-tight">Gestion Multicompte</span>
        </div>
        <button onClick={loadVaults}>
          <RefreshCw size={12} className="text-blue-500 hover:rotate-180 transition" />
        </button>
      </div>

      <div className="flex-1 overflow-auto mt-2">
        {loading ? (
          <div className="p-6 text-center text-[10px] text-gray-400 font-mono">Chargement des comptes...</div>
        ) : (
          <div className="bg-white border border-gray-300 rounded shadow-sm divide-y divide-gray-100">
            {vaults.length === 0 ? (
              <div className="p-6 text-center text-[10px] text-gray-400 font-mono">Aucun compte disponible.</div>
            ) : (
              vaults.map((vault) => (
                <Link
                  key={vault.id}
                  href={`/econome/compte/${vault.id}`}
                  className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{vault.icon}</span>
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 uppercase">{vault.name}</p>
                      <p className="text-[9px] text-gray-400 font-mono">ID: {vault.id.split('-')[0]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono font-bold text-blue-800">
                      {(vault.balance ?? 0).toLocaleString()} Ar
                    </span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
