'use client';
import { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Edit2, Trash2, KeyRound, 
  Ban, CheckCircle, Loader2, ShieldAlert, Users, RefreshCw, Mail 
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

// Type pour nos utilisateurs
type Econome = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
};

export default function GestionUsersPage() {
  const [users, setUsers] = useState<Econome[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Charger la liste
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // 2. Fonction générique pour appeler l'API
  const callApiAction = async (action: string, userId: string, newData: any = {}) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, newData }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: 'success', title: result.message });
      fetchUsers(); // On recharge la liste
    } catch (error: any) {
      Swal.fire('Erreur', error.message, 'error');
    }
  };

  // --- ACTIONS ---

  // A. Supprimer
  const handleDelete = (user: Econome) => {
    Swal.fire({
      title: 'Supprimer définitivement ?',
      text: `Cela effacera ${user.full_name} et son accès.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'SUPPRIMER'
    }).then((result) => {
      if (result.isConfirmed) callApiAction('delete', user.id);
    });
  };

  // B. Activer / Désactiver
  const handleToggleStatus = (user: Econome) => {
    const actionText = user.is_active ? "Désactiver" : "Réactiver";
    const newStatus = !user.is_active;
    
    Swal.fire({
      title: `${actionText} l'accès ?`,
      text: user.is_active ? "L'utilisateur ne pourra plus se connecter." : "L'utilisateur pourra de nouveau accéder au système.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: user.is_active ? '#d33' : '#10b981',
      confirmButtonText: `OUI, ${actionText.toUpperCase()}`
    }).then((result) => {
      if (result.isConfirmed) {
        callApiAction('toggle_status', user.id, { is_active: newStatus });
      }
    });
  };

  // C. Reset Password
  const handleResetPassword = async (user: Econome) => {
    const { value: password } = await Swal.fire({
      title: 'Nouveau mot de passe',
      input: 'text',
      inputLabel: `Pour ${user.full_name}`,
      inputPlaceholder: 'Ex: Ifpt2026!',
      showCancelButton: true,
      confirmButtonText: 'VALIDER'
    });

    if (password) {
      callApiAction('reset_password', user.id, { newPassword: password });
    }
  };

  // D. Modifier Info
  const handleEdit = async (user: Econome) => {
    const { value: formValues } = await Swal.fire({
      title: 'Modifier les informations',
      html:
        `<input id="swal-name" class="swal2-input" placeholder="Nom" value="${user.full_name}" style="font-size:14px">` +
        `<input id="swal-email" class="swal2-input" placeholder="Email" value="${user.email}" style="font-size:14px">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'ENREGISTRER',
      preConfirm: () => {
        return [
          (document.getElementById('swal-name') as HTMLInputElement).value,
          (document.getElementById('swal-email') as HTMLInputElement).value
        ]
      }
    });

    if (formValues) {
      callApiAction('update', user.id, { full_name: formValues[0], email: formValues[1] });
    }
  };

  // Filtrage
  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* BARRE D'OUTILS COMPACTE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Gestion des Économes</span>
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-200">{filteredUsers.length} ACCÈS</span>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="relative">
                  <Search className="absolute left-2 top-1.5 text-gray-400" size={12}/>
                  <input 
                      type="text" 
                      placeholder="Rechercher (Nom, Email)..." 
                      className="pl-7 p-1 w-48 border border-gray-300 rounded text-[10px] h-7 bg-white focus:border-blue-500 outline-none transition-colors font-bold text-gray-700" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>

              <Link href="/dg/users/new" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm flex items-center gap-1 text-[10px] font-bold h-7 transition active:scale-95">
                  <UserPlus size={12}/> NOUVEAU
              </Link>
              
              <button onClick={fetchUsers}><RefreshCw size={14} className={`text-blue-600 hover:rotate-180 transition ${loading ? 'animate-spin' : ''}`}/></button>
          </div>
      </div>

      {/* TABLEAU LISTE (Style Sage) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden">
          <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                      <tr>
                          <th className="p-2 border-r border-gray-300">Nom Complet</th>
                          <th className="p-2 border-r border-gray-300">Identifiant (Email)</th>
                          <th className="p-2 border-r border-gray-300 w-32">ID Système</th>
                          <th className="p-2 border-r border-gray-300 text-center w-24">Statut</th>
                          <th className="p-2 text-center w-32">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                      {loading ? (
                          <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-mono">CHARGEMENT UTILISATEURS...</td></tr>
                      ) : filteredUsers.map((user, i) => (
                          <tr key={user.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors group`}>
                              <td className="p-2 border-r border-gray-100 font-bold text-gray-700">
                                  {user.full_name}
                              </td>
                              <td className="p-2 border-r border-gray-100 text-gray-600 flex items-center gap-2">
                                  <Mail size={10} className="text-gray-400"/>
                                  {user.email}
                              </td>
                              <td className="p-2 border-r border-gray-100 font-mono text-[9px] text-gray-400">
                                  {user.id.substring(0, 12)}...
                              </td>
                              <td className="p-2 border-r border-gray-100 text-center">
                                  {user.is_active ? (
                                      <span className="text-green-600 font-bold text-[9px] flex items-center justify-center gap-1 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 w-fit mx-auto">
                                          <CheckCircle size={10}/> ACTIF
                                      </span>
                                  ) : (
                                      <span className="text-red-600 font-bold text-[9px] flex items-center justify-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 w-fit mx-auto">
                                          <Ban size={10}/> BLOQUÉ
                                      </span>
                                  )}
                              </td>
                              <td className="p-1 text-center flex justify-center gap-1">
                                  {/* Reset Password */}
                                  <button onClick={() => handleResetPassword(user)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition border border-transparent hover:border-blue-200" title="Mot de passe">
                                      <KeyRound size={12} />
                                  </button>
                                  
                                  {/* Modifier */}
                                  <button onClick={() => handleEdit(user)} className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-100 rounded transition border border-transparent hover:border-orange-200" title="Editer">
                                      <Edit2 size={12} />
                                  </button>

                                  {/* Toggle Status */}
                                  <button onClick={() => handleToggleStatus(user)} className={`p-1.5 rounded transition border border-transparent ${user.is_active ? 'text-gray-500 hover:text-red-600 hover:bg-red-100 hover:border-red-200' : 'text-green-600 hover:bg-green-100 hover:border-green-200'}`} title={user.is_active ? "Bloquer" : "Activer"}>
                                      {user.is_active ? <ShieldAlert size={12} /> : <CheckCircle size={12} />}
                                  </button>
                                  
                                  <div className="w-px bg-gray-300 mx-1 h-4 self-center"></div>

                                  {/* Supprimer */}
                                  <button onClick={() => handleDelete(user)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition" title="Supprimer">
                                      <Trash2 size={12} />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {!loading && filteredUsers.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic text-[10px]">Aucun utilisateur trouvé.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 p-1 text-right text-[10px] text-gray-400 pr-2">
              Utilisateurs système : {filteredUsers.length}
          </div>
      </div>
    </div>
  );
}