'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, User, Loader2, ShieldCheck, XCircle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // État pour notre notification maison (Message + Type)
  const [notif, setNotif] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Nettoyage session au démarrage
  useEffect(() => { 
    sessionStorage.clear(); 
    supabase.auth.signOut();
  }, []);

  // Timer pour faire disparaître la notif tout seul
  useEffect(() => {
    if (notif) {
      const timer = setTimeout(() => setNotif(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notif]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotif(null);

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (authError) {
            if (authError.message.includes("Invalid login credentials")) throw new Error("Identifiants incorrects.");
            if (authError.message.includes("Email not confirmed")) throw new Error("Email non confirmé.");
            throw new Error("Erreur de connexion serveur.");
        }

        if (authData.user) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', authData.user.id)
                .single();

            if (profileError || !profile) {
                 await supabase.auth.signOut();
                 throw new Error("Profil utilisateur introuvable.");
            }

            const role = profile.role || 'ECONOME';
            const name = profile.full_name || email.split('@')[0];

            sessionStorage.setItem('role', role);
            sessionStorage.setItem('name', name);

            setNotif({ msg: `Accès autorisé : ${name}`, type: 'success' });

            setTimeout(() => {
                if (role === 'DG') router.push('/dg');
                else router.push('/econome');
            }, 800);
        }

    } catch (err: any) {
        setNotif({ msg: err.message, type: 'error' });
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] font-sans text-xs relative">
      
      {/* --- NOTIFICATION COMPACTE (Style ERP) --- */}
      {notif && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded border shadow-lg flex items-center gap-3 text-white font-bold animate-in slide-in-from-right-5 duration-300 ${
              notif.type === 'success' ? 'bg-emerald-600 border-emerald-700' : 'bg-red-600 border-red-700'
          }`}>
              {notif.type === 'success' ? <CheckCircle size={18}/> : <ShieldAlert size={18}/>}
              <p className="tracking-tight uppercase text-[10px]">{notif.msg}</p>
          </div>
      )}

      <div className="w-full max-w-[350px] bg-white border border-gray-300 shadow-2xl overflow-hidden rounded-md">
        
        {/* HEADER SAGE COMPACT */}
        <div className="bg-[#1e293b] p-6 text-center border-b border-gray-700 relative">
            <div className="mx-auto bg-blue-500/20 w-12 h-12 rounded flex items-center justify-center border border-blue-400/30 mb-3 shadow-inner">
                <ShieldCheck size={24} className="text-blue-400"/>
            </div>
            <h1 className="text-lg font-black text-white tracking-[0.2em] font-mono uppercase">IFPT Manager</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
                <span className="h-px w-8 bg-gray-600"></span>
                <p className="text-gray-400 text-[9px] uppercase font-bold tracking-widest">Auth Service v2.0</p>
                <span className="h-px w-8 bg-gray-600"></span>
            </div>
        </div>

        {/* FORMULAIRE DENSE */}
        <div className="p-6 bg-white">
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5 tracking-tighter">Identifiant (Email)</label>
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center border-r border-gray-200 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                            <User size={14}/>
                        </div>
                        <input type="email" required
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-0 outline-none font-bold text-gray-700 transition-all text-xs"
                            placeholder="nom@ifpt.mg"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5 tracking-tighter">Mot de passe</label>
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center border-r border-gray-200 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                            <Lock size={14}/>
                        </div>
                        <input type="password" required
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-0 outline-none font-bold text-gray-700 transition-all text-xs"
                            placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button type="submit" disabled={loading}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-2.5 rounded shadow-[0_2px_0_rgb(29,78,216)] transition-all active:translate-y-[1px] active:shadow-none flex justify-center items-center gap-2 mt-6 uppercase tracking-wider text-[10px]"
                >
                    {loading ? <Loader2 className="animate-spin" size={14}/> : 'Ouvrir la session'}
                </button>
            </form>

            {/* FOOTER TECHNIQUE */}
            <div className="mt-8 pt-4 border-t border-dotted border-gray-200 text-center">
                <p className="text-[8px] text-gray-400 uppercase font-bold tracking-tight mb-1">© 2026 Institut de Formation Professionnelle et Technique</p>
                <div className="flex justify-center items-center gap-1 opacity-40">
                    <Lock size={8} className="text-gray-500" />
                    <p className="text-[8px] text-gray-500 font-mono">ENCRYPTED_DATA_TRANSMISSION</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}