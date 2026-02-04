'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DGLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // SÉCURITÉ : Vérification du rôle DG
    const role = sessionStorage.getItem('role');
    if (role !== 'DG') {
      router.push('/'); // Redirection si pas autorisé
    } else {
      setAuthorized(true);
    }
  }, []);

  // Empêche l'affichage tant que la sécurité n'a pas validé
  if (!authorized) return null;

  return (
    // STYLE SAGE : Ecran complet (h-screen), pas de scroll global (overflow-hidden), police dense (text-xs)
    <div className="flex h-screen w-full bg-gray-100 text-gray-800 font-sans text-xs overflow-hidden">
      
      {/* SIDEBAR : Conteneur fixe à gauche, bordure technique */}
      {/* On utilise Flexbox pour l'alignement, plus de margin-left manuel ou de position fixed */}
      <aside className="w-[220px] flex-shrink-0 h-full border-r border-gray-300 bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
        <Sidebar />
      </aside>

      {/* CONTENU PRINCIPAL : Prend tout l'espace restant */}
      {/* overflow-hidden ici force les pages enfants (Dashboard, Tableaux) à gérer leur propre scroll */}
      <main className="flex-1 h-full flex flex-col overflow-hidden relative bg-[#f0f2f5]">
        {children}
      </main>
    </div>
  );
}