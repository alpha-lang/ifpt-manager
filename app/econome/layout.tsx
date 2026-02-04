'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function EconomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // SÉCURITÉ : Vérification du rôle
    const role = sessionStorage.getItem('role');
    if (role !== 'ECONOME') {
      router.push('/');
    } else {
      setAuthorized(true);
    }
  }, []);

  if (!authorized) return null;

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