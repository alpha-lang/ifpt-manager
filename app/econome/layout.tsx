"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { subscribeEconome } from '@/lib/realtime';

export default function EconomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const storedRole = sessionStorage.getItem('role');
    setRole(storedRole);
    setIsCheckingRole(false);
  }, []);

  useEffect(() => {
    // SÉCURITÉ : Vérification du rôle
    if (!isCheckingRole && role !== 'ECONOME') {
      router.push('/');
    }
  }, [isCheckingRole, role, router]);

  // Central Realtime subscription for the Econome area.
  // The effect is declared unconditionally to preserve Hook order,
  // but the subscription only runs once the role is verified.
  useEffect(() => {
    if (isCheckingRole || role !== 'ECONOME') return;
    try {
      const enabled = (process.env.NEXT_PUBLIC_REALTIME_ENABLED ?? 'true') !== 'false';

      let lastDispatched = 0;
      const minInterval = 2000; // ms - simple rate limit to avoid exceeding realtime usage

      const dispatchSafe = (detail: any, evName = 'econome:db-change') => {
        const now = Date.now();
        if (now - lastDispatched < minInterval) return;
        lastDispatched = now;
        window.dispatchEvent(new CustomEvent(evName, { detail }));
      };

      if (!enabled) {
        // Polling fallback when realtime is disabled to stay on free tier
        const pollMs = parseInt(process.env.NEXT_PUBLIC_REALTIME_POLL_MS ?? '10000', 10) || 10000;
        const id = window.setInterval(() => dispatchSafe({ source: 'poll' }, 'econome:db-poll'), pollMs);
        // dispatch an immediate poll
        dispatchSafe({ source: 'poll' }, 'econome:db-poll');
        return () => clearInterval(id);
      }

      const unsub = subscribeEconome({
        onRegister: () => dispatchSafe({ table: 'cash_registers' }, 'econome:db-change'),
        onVaults: () => dispatchSafe({ table: 'vaults' }, 'econome:db-change'),
        onTransactions: () => dispatchSafe({ table: 'transactions' }, 'econome:db-change')
      });

      return () => { if (unsub) unsub(); };
    } catch (e) {
      return undefined;
    }
  }, [isCheckingRole, role]);

  if (isCheckingRole || role !== 'ECONOME') return null;

  return (
    // STYLE SAGE : Ecran complet (h-screen), pas de scroll global (overflow-hidden), police dense (text-xs)
    <div className="flex h-screen w-full bg-gray-100 text-gray-800 font-sans text-xs overflow-hidden">
      
      {/* SIDEBAR : Conteneur fixe à gauche, bordure technique */}
      {/* On retire le positionnement absolu/fixed pour utiliser Flexbox proprement */}
      <aside className="w-[220px] flex-shrink-0 h-full border-r border-gray-300 bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
        <Sidebar />
      </aside>

      {/* CONTENU PRINCIPAL : Prend tout l'espace restant */}
      {/* overflow-hidden ici force les pages enfants à gérer leur propre scroll (ex: tableaux) */}
      <main className="flex-1 h-full flex flex-col overflow-hidden relative bg-[#f0f2f5]">
        {children}
      </main>
    </div>
  );
}
