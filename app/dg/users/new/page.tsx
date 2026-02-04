'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Save, ArrowLeft, Loader2, User, Mail, Key, ShieldCheck, Info } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function CreateEconomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // États pour les champs du formulaire
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.fullName || !formData.email || !formData.password) {
        return Swal.fire('Oubli', 'Tous les champs sont requis', 'warning');
    }
    
    setLoading(true);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      // Succès
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      Toast.fire({ icon: 'success', title: 'Économe créé avec succès' });
      router.push('/dg/users');

    } catch (err: any) {
      Swal.fire('Erreur', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* BARRE D'OUTILS COMPACTE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-blue-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Nouveau Collaborateur</span>
          </div>
          <Link href="/dg/users" className="bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded shadow-sm flex items-center gap-1 font-bold text-[10px] h-7 hover:bg-gray-50 transition active:scale-95">
              <ArrowLeft size={12}/> ANNULER & RETOUR
          </Link>
      </div>

      <div className="flex flex-1 gap-2 mt-2 overflow-hidden">
          
          {/* COLONNE GAUCHE : CONTEXTE */}
          <div className="w-1/3 bg-white border border-gray-400 rounded shadow-sm flex flex-col p-0">
              <div className="bg-gray-100 border-b border-gray-300 p-2 px-3">
                  <h3 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-2">
                      <Info size={12}/> Profil du Poste
                  </h3>
              </div>
              <div className="p-6 flex flex-col items-center justify-center flex-1 text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-50 border-2 border-blue-100 rounded-full flex items-center justify-center">
                      <UserPlus size={32} className="text-blue-400"/>
                  </div>
                  <div>
                      <h2 className="text-sm font-bold text-gray-800 uppercase">Économe / Gestionnaire</h2>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] mx-auto leading-tight">
                          Ce compte aura accès à la gestion des caisses, des étudiants, et à la saisie des dépenses courantes.
                      </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-left w-full mt-4">
                      <p className="text-[9px] font-bold text-yellow-800 uppercase mb-1 flex items-center gap-1"><ShieldCheck size={10}/> Sécurité</p>
                      <ul className="text-[9px] text-yellow-700 list-disc pl-3 space-y-1">
                          <li>Accès restreint au module Econome.</li>
                          <li>Les opérations sensibles nécessiteront une validation DG.</li>
                          <li>Mot de passe initial à changer à la première connexion.</li>
                      </ul>
                  </div>
              </div>
          </div>

          {/* COLONNE DROITE : FORMULAIRE */}
          <div className="w-2/3 bg-white border border-gray-400 rounded shadow-sm flex flex-col p-0">
              <div className="bg-gray-100 border-b border-gray-300 p-2 px-3">
                  <h3 className="font-bold text-gray-700 text-[10px] uppercase flex items-center gap-2">
                      <Save size={12}/> Saisie des Informations
                  </h3>
              </div>

              <div className="p-8 flex-1">
                  <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
                      
                      {/* NOM COMPLET */}
                      <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nom Complet & Prénoms</label>
                          <div className="relative">
                              <User className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                              <input 
                                  type="text" 
                                  required 
                                  placeholder="Ex: Jean Rakoto"
                                  className="w-full pl-9 p-2 border border-gray-300 rounded text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors"
                                  value={formData.fullName}
                                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                              />
                          </div>
                      </div>

                      {/* EMAIL */}
                      <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email Professionnel (Identifiant)</label>
                          <div className="relative">
                              <Mail className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                              <input 
                                  type="email" 
                                  required 
                                  placeholder="econome@ifpt.mg"
                                  className="w-full pl-9 p-2 border border-gray-300 rounded text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors font-mono"
                                  value={formData.email}
                                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                              />
                          </div>
                      </div>

                      {/* PASSWORD */}
                      <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mot de passe provisoire</label>
                          <div className="relative">
                              <Key className="absolute left-2.5 top-2 text-gray-400" size={14}/>
                              <input 
                                  type="text" 
                                  required 
                                  minLength={6}
                                  placeholder="Ex: Eco2026!"
                                  className="w-full pl-9 p-2 border border-gray-300 rounded text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors font-mono"
                                  value={formData.password}
                                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                              />
                          </div>
                          <p className="text-[9px] text-gray-400 mt-1 italic">* 6 caractères minimum requis.</p>
                      </div>

                      <div className="pt-6 border-t border-gray-100 flex justify-end">
                          <button 
                              type="submit" 
                              disabled={loading}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded font-bold shadow-md flex items-center gap-2 text-[11px] uppercase tracking-wide transition-transform active:scale-95 disabled:opacity-50"
                          >
                              {loading ? <Loader2 className="animate-spin" size={14} /> : <><Save size={14}/> Créer le Compte</>}
                          </button>
                      </div>

                  </form>
              </div>
          </div>
      </div>
    </div>
  );
}