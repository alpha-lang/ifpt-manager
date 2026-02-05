'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function EconomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = typeof window !== 'undefined' ? sessionStorage.getItem('role') : null;
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean | null>(null);

  useEffect(() => {
    // SÉCURITÉ : Vérification du rôle
    if (role !== 'ECONOME') {
      router.push('/');
    }
  }, [role, router]);

  useEffect(() => {
    if (role !== 'ECONOME') return;
    let isMounted = true;

    const loadRegisterStatus = async () => {
      const { data } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('status', 'OPEN')
        .maybeSingle();
      if (isMounted) {
        setIsRegisterOpen(Boolean(data));
      }
    };

    loadRegisterStatus();
    return () => {
      isMounted = false;
    };
  }, [role, pathname]);

  if (role !== 'ECONOME') return null;

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
        {isRegisterOpen === false && (
          <Link
            href="/econome/recette"
            className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-[10px] font-bold uppercase text-white shadow-lg transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 animate-pulse"
          >
            <AlertCircle size={14} />
            Ouvrir la caisse
          </Link>
        )}
      </main>
    </div>
  );
}
