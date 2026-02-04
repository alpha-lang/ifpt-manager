'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { Settings, Key, User, Shield, Save, Lock, Mail, Globe, CheckCircle } from 'lucide-react';

export default function ParametresDG() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Formulaire Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    // On récupère les infos de session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // On récupère le profil
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUser({ ...user, ...profile });
    }
  };

  const handleUpdatePassword = async () => {
    if (!password || !confirm) return Swal.fire('Erreur', 'Veuillez remplir tous les champs.', 'warning');
    if (password !== confirm) return Swal.fire('Erreur', 'Les mots de passe ne correspondent pas.', 'error');
    if (password.length < 6) return Swal.fire('Sécurité', 'Le mot de passe est trop court (6 min).', 'warning');

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
        Swal.fire('Erreur', error.message, 'error');
    } else {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Sécurité mise à jour' });
        setPassword('');
        setConfirm('');
    }
    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* BARRE D'OUTILS COMPACTE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Configuration Administrateur</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <Shield size={12} className="text-red-600"/>
              <span className="font-bold text-red-800">ACCÈS DIRECTION GÉNÉRALE</span>
          </div>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden">
          
          {/* COLONNE GAUCHE : FICHE PROFIL */}
          <div className="w-1/3 bg-white border border-gray-400 rounded shadow-sm p-0 flex flex-col">
              <div className="bg-gray-100 border-b border-gray-300 p-2 px-3">
                  <h3 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-2">
                      <User size={12}/> Identité Numérique
                  </h3>
              </div>
              
              <div className="p-4 flex flex-col items-center gap-4 flex-1 justify-center bg-white">
                  <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100 shadow-inner">
                      <Shield size={48} className="text-red-400"/>
                  </div>
                  
                  <div className="text-center w-full space-y-4">
                      <div className="border-b border-gray-100 pb-2">
                          <p className="text-[9px] text-gray-400 uppercase font-bold">Administrateur</p>
                          <p className="text-base font-bold text-gray-800">{user?.full_name || 'Directeur Général'}</p>
                      </div>
                      
                      <div className="border-b border-gray-100 pb-2">
                          <p className="text-[9px] text-gray-400 uppercase font-bold flex items-center justify-center gap-1"><Mail size={10}/> Identifiant</p>
                          <p className="text-xs font-mono text-gray-600">{user?.email || '...'}</p>
                      </div>

                      <div>
                          <p className="text-[9px] text-gray-400 uppercase font-bold flex items-center justify-center gap-1"><Globe size={10}/> Niveau d'Accès</p>
                          <span className="inline-block mt-1 bg-red-600 text-white px-3 py-0.5 rounded text-[10px] font-bold shadow-sm uppercase tracking-wider">
                              SUPER ADMIN
                          </span>
                      </div>
                  </div>
              </div>
              
              <div className="bg-gray-50 p-2 text-center text-[9px] text-gray-400 border-t border-gray-200">
                  UUID: {user?.id}
              </div>
          </div>

          {/* COLONNE DROITE : SÉCURITÉ */}
          <div className="w-2/3 bg-white border border-gray-400 rounded shadow-sm p-0 flex flex-col">
              <div className="bg-gray-100 border-b border-gray-300 p-2 px-3">
                  <h3 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-2">
                      <Key size={12}/> Gestion des Accès
                  </h3>
              </div>

              <div className="p-6 flex-1">
                  <div className="max-w-md mx-auto space-y-6">
                      
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded shadow-sm flex gap-3 items-start">
                          <Lock size={16} className="text-orange-600 mt-0.5"/>
                          <div>
                              <h4 className="font-bold text-orange-800 text-[11px] uppercase">Avertissement de Sécurité</h4>
                              <p className="text-[10px] text-orange-800 leading-tight mt-1">
                                  En tant qu'administrateur, votre mot de passe permet d'accéder à l'ensemble des données financières et comptables. 
                                  Assurez-vous de sa complexité.
                              </p>
                          </div>
                      </div>

                      <div className="space-y-4 pt-4">
                          <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nouveau Mot de Passe</label>
                              <div className="relative">
                                  <input 
                                      type="password" 
                                      className="w-full border border-gray-300 rounded p-2 pl-3 text-xs font-bold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 bg-gray-50 focus:bg-white transition-colors"
                                      placeholder="••••••••"
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Confirmer Mot de Passe</label>
                              <div className="relative">
                                  <input 
                                      type="password" 
                                      className="w-full border border-gray-300 rounded p-2 pl-3 text-xs font-bold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 bg-gray-50 focus:bg-white transition-colors"
                                      placeholder="••••••••"
                                      value={confirm}
                                      onChange={(e) => setConfirm(e.target.value)}
                                  />
                                  {password && confirm && password === confirm && (
                                      <div className="absolute right-2 top-2 text-green-600"><CheckCircle size={16}/></div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 border-t border-gray-100 flex justify-end">
                          <button 
                              onClick={handleUpdatePassword} 
                              disabled={loading}
                              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold shadow-md flex items-center gap-2 text-[11px] uppercase tracking-wide transition-transform active:scale-95 disabled:opacity-50"
                          >
                              {loading ? 'Mise à jour...' : <><Save size={14}/> Mettre à jour l'accès</>}
                          </button>
                      </div>

                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}