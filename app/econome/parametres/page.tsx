'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { Settings, Key, User, Shield, Save, Lock, Mail, Activity, CheckCircle, Fingerprint, ShieldCheck } from 'lucide-react';

type UserProfile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  [key: string]: unknown;
};

export default function ParametresEconome() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setUser({ ...authUser, ...profile } as UserProfile);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const handleUpdatePassword = async () => {
    if (!password || !confirm) return Swal.fire('Erreur', 'Veuillez remplir les champs.', 'warning');
    if (password !== confirm) return Swal.fire('Erreur', 'Les mots de passe ne correspondent pas.', 'error');
    if (password.length < 6) return Swal.fire('Sécurité', 'Le mot de passe doit faire 6 caractères minimum.', 'warning');

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
        Swal.fire('Erreur', error.message, 'error');
    } else {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Sécurité : Mot de passe mis à jour' });
        setPassword('');
        setConfirm('');
    }
    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col animate-in-faint">
      
      {/* BARRE D'OUTILS SAGE COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Fingerprint size={16} className="text-blue-900"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Configuration de l&apos;accès utilisateur</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck size={12}/> CONNEXION SÉCURISÉE SSL/AES
          </div>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden">
          
          {/* FICHE PROFIL TECHNIQUE */}
          <div className="w-1/3 bg-white border border-gray-400 rounded shadow-sm flex flex-col overflow-hidden">
              <div className="bg-gray-100 border-b border-gray-300 p-2 px-3">
                  <h3 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-2 tracking-widest">
                      <User size={12}/> Identité Système
                  </h3>
              </div>
              
              <div className="p-6 flex flex-col items-center flex-1 bg-white">
                  <div className="w-20 h-20 bg-slate-50 border-2 border-slate-200 rounded flex items-center justify-center shadow-inner mb-6">
                      <User size={40} className="text-slate-300"/>
                  </div>
                  
                  <div className="w-full space-y-4">
                      <div className="text-center border-b border-slate-100 pb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Nom d&apos;usage</p>
                          <p className="text-sm font-black text-slate-800 uppercase leading-none">{user?.full_name || '...'}</p>
                      </div>
                      
                      <div className="text-center border-b border-slate-100 pb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Identifiant (Email)</p>
                          <p className="text-xs font-bold text-slate-600 font-mono italic">{user?.email || '...'}</p>
                      </div>

                      <div className="text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Privilèges</p>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white rounded-none text-[10px] font-black tracking-widest uppercase shadow-sm">
                              <Shield size={10} className="text-blue-400"/> {user?.role || 'ECONOME'}
                          </span>
                      </div>
                  </div>
              </div>
              
              <div className="bg-slate-50 border-t border-slate-200 p-2 px-3 flex justify-between items-center text-[8px] font-mono text-slate-400 uppercase">
                  <span>Traceur de sécurité :</span>
                  <span>UID_{user?.id?.substring(0, 8)}</span>
              </div>
          </div>

          {/* FORMULAIRE DE SÉCURITÉ */}
          <div className="w-2/3 bg-white border border-gray-400 rounded shadow-sm flex flex-col overflow-hidden">
              <div className="bg-gray-100 border-b border-gray-300 p-2 px-3">
                  <h3 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-2 tracking-widest">
                      <Key size={12}/> Authentification & Chiffrement
                  </h3>
              </div>

              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="max-w-md mx-auto space-y-6">
                      
                      <div className="bg-amber-50 border border-amber-200 p-3 flex gap-3 items-start shadow-sm">
                          <Lock size={16} className="text-amber-600 mt-0.5"/>
                          <div>
                              <h4 className="font-black text-amber-800 text-[10px] uppercase tracking-tighter">Zone de gestion critique</h4>
                              <p className="text-[10px] text-amber-700 leading-snug mt-1 italic">
                                  La mise à jour de la clé d&apos;accès provoquera l&apos;invalidation de tous les jetons actifs (Redirection login automatique).
                              </p>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="group">
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-0.5">Nouveau Secret</label>
                              <input 
                                  type="password" 
                                  className="w-full h-9 border border-slate-300 rounded-none p-2 pl-3 text-xs font-bold outline-none focus:border-blue-600 focus:ring-0 bg-slate-50 focus:bg-white transition-all font-mono"
                                  placeholder="••••••••"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                              />
                          </div>

                          <div className="group">
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-0.5">Vérification de Saisie</label>
                              <div className="relative">
                                  <input 
                                      type="password" 
                                      className={`w-full h-9 border rounded-none p-2 pl-3 text-xs font-bold outline-none focus:ring-0 transition-all font-mono ${
                                        password && confirm && password !== confirm ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600'
                                      }`}
                                      placeholder="••••••••"
                                      value={confirm}
                                      onChange={(e) => setConfirm(e.target.value)}
                                  />
                                  {password && confirm && password === confirm && (
                                      <div className="absolute right-2 top-2 text-emerald-600"><CheckCircle size={18}/></div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end">
                          <button 
                              onClick={handleUpdatePassword} 
                              disabled={loading}
                              className="bg-blue-700 hover:bg-blue-800 text-white px-6 h-9 shadow-[0_2px_0_rgb(29,78,216)] active:translate-y-[1px] active:shadow-none flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                          >
                              {loading ? 'CALCUL DU HASH...' : <><Save size={14}/> Appliquer les protocoles</>}
                          </button>
                      </div>

                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}
