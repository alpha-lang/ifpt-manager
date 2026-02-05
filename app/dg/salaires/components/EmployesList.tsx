'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { UserPlus, Search, Briefcase, Clock, Trash2, UserCheck, Filter, Users, RefreshCw, CreditCard } from 'lucide-react';

type Employee = {
  id: string;
  nom: string;
  poste: string;
  contract_type: string;
  base_salary?: number | null;
  status: string;
  [key: string]: unknown;
};

export default function EmployesList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('TOUS');
  const [loading, setLoading] = useState(true);

  // --- NOUVEL ÉTAT CAISSE ---
  const [caisse, setCaisse] = useState<{ id?: string; opening_amount?: number | null; status?: string } | null>(null);
  const [caisseLoading, setCaisseLoading] = useState(true);

  // Filtrage dynamique
  useEffect(() => {
    let res = employees;
    if (search) {
        res = res.filter(e => e.nom.toLowerCase().includes(search.toLowerCase()) || e.poste.toLowerCase().includes(search.toLowerCase()));
    }
    if (filterType !== 'TOUS') {
        res = res.filter(e => e.contract_type === filterType);
    }
    setFiltered(res);
  }, [search, filterType, employees]);

  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').order('status').order('nom');
    setEmployees((data ?? []) as Employee[]);
    setLoading(false);
  };

  // --- NOUVELLES FONCTIONS CAISSE ---
  const loadCaisse = async () => {
    setCaisseLoading(true);
    // Adapter le nom de table/colonnes si besoin (ex: 'caisses', 'caisse_sessions', etc.)
    const { data, error } = await supabase.from('caisses').select('*').eq('status', 'OUVERTE').limit(1).single();
    if (!error && data) setCaisse(data);
    else setCaisse(null);
    setCaisseLoading(false);
  };

  const ouvrirCaisse = async () => {
    const { value: amount } = await Swal.fire({
      title: 'Ouvrir la caisse',
      input: 'number',
      inputLabel: "Montant d'ouverture (Ar)",
      inputValue: 0,
      showCancelButton: true,
      confirmButtonText: 'Ouvrir',
      preConfirm: (val) => {
        if (val === '' || val === null) Swal.showValidationMessage('Montant requis');
        return parseFloat(String(val)) || 0;
      }
    });

    if (amount !== undefined) {
      const payload = { opening_amount: amount, status: 'OUVERTE', opened_at: new Date().toISOString() };
      const { error } = await supabase.from('caisses').insert(payload);
      if (!error) {
        await loadCaisse();
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'success', title: 'Caisse ouverte' });
      } else {
        Swal.fire('Erreur', error.message, 'error');
      }
    }
  };

  // --- ACTIONS ---
  const addEmployee = async () => {
    const { value: form } = await Swal.fire({
        title: 'Nouveau Contrat',
        html: `
            <div class="flex flex-col gap-2 text-left text-xs">
                <label class="font-bold text-gray-500 uppercase">Identité</label>
                <input id="swal-nom" class="swal2-input h-8 text-sm" placeholder="Nom Complet" style="margin:0">
                
                <label class="font-bold text-gray-500 uppercase mt-2">Poste & Fonction</label>
                <input id="swal-poste" class="swal2-input h-8 text-sm" placeholder="ex: Sécurité, Jardinier..." style="margin:0">
                
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <div>
                        <label class="font-bold text-gray-500 uppercase">Type Contrat</label>
                        <select id="swal-type" class="swal2-input h-8 text-sm" style="margin:0; padding-top:0; padding-bottom:0">
                            <option value="MENSUEL">Mensuel</option>
                            <option value="HORAIRE">Vacataire</option>
                        </select>
                    </div>
                    <div>
                        <label class="font-bold text-gray-500 uppercase">Base (Ar)</label>
                        <input id="swal-base" type="number" class="swal2-input h-8 text-sm text-right" placeholder="0" style="margin:0">
                    </div>
                </div>
            </div>`,
        focusConfirm: false, 
        showCancelButton: true, 
        confirmButtonText: 'ENREGISTRER',
        confirmButtonColor: '#2563eb',
        width: '400px',
        preConfirm: () => {
            const nom = (document.getElementById('swal-nom') as HTMLInputElement).value;
            const poste = (document.getElementById('swal-poste') as HTMLInputElement).value;
            const type = (document.getElementById('swal-type') as HTMLSelectElement).value;
            const base = (document.getElementById('swal-base') as HTMLInputElement).value;
            if (!nom) return Swal.showValidationMessage('Nom requis');
            return { nom, poste, contract_type: type, base_salary: parseFloat(base) || 0, status: 'ACTIF' };
        }
    });

    if (form) {
        const { error } = await supabase.from('employees').insert(form);
        if (!error) {
            loadEmployees();
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Employé ajouté' });
        } else {
            Swal.fire('Erreur', error.message, 'error');
        }
    }
  };

  const toggleStatus = async (emp: Employee) => {
     const newStatus = emp.status === 'ACTIF' ? 'INACTIF' : 'ACTIF';
     const actionName = emp.status === 'ACTIF' ? 'Archiver' : 'Réactiver';
     
     const { isConfirmed } = await Swal.fire({ 
         title: `${actionName} ?`, 
         text: `Changer le statut de ${emp.nom} ?`, 
         icon: 'warning', 
         showCancelButton: true,
         confirmButtonColor: emp.status === 'ACTIF' ? '#d33' : '#10b981',
         confirmButtonText: 'OUI'
     });

     if(isConfirmed) { 
         const { error } = await supabase.from('employees').update({status: newStatus}).eq('id', emp.id);
         if(!error) {
             loadEmployees();
             const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
             Toast.fire({ icon: 'success', title: 'Statut mis à jour' });
         }
     }
  };

  useEffect(() => { loadEmployees(); loadCaisse(); }, []);

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Gestion du Personnel</span>
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-200">{employees.filter(e=>e.status==='ACTIF').length} ACTIFS</span>
          </div>
          
          <div className="flex items-center gap-3">
              {/* FILTRES */}
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
                  <Filter size={12} className="text-gray-400 mr-2"/>
                  <select 
                      className="bg-transparent text-[10px] font-bold text-gray-700 outline-none w-24 cursor-pointer"
                      value={filterType} 
                      onChange={e => setFilterType(e.target.value)}
                  >
                      <option value="TOUS">Tous types</option>
                      <option value="MENSUEL">Mensuels</option>
                      <option value="HORAIRE">Vacataires</option>
                  </select>
              </div>

              <div className="relative">
                  <Search className="absolute left-2 top-1.5 text-gray-400" size={12}/>
                  <input 
                      className="pl-7 p-1 w-40 border border-gray-300 rounded text-[10px] h-7 bg-white focus:border-blue-500 outline-none transition-colors" 
                      placeholder="Nom, Poste..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)}
                  />
              </div>

              <button onClick={addEmployee} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm flex items-center gap-1 text-[10px] font-bold h-7 transition active:scale-95">
                  <UserPlus size={12}/> NOUVEAU
              </button>
              
              <button onClick={loadEmployees}><RefreshCw size={14} className={`text-blue-600 hover:rotate-180 transition ${loading ? 'animate-spin' : ''}`}/></button>

              {/* BOUTON CAISSE */}
              {!caisseLoading && caisse && caisse.status === 'OUVERTE' ? (
                <button className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-[10px] font-bold h-7 border border-yellow-100 flex items-center gap-2">
                  <CreditCard size={12}/> Caisse: {(caisse.opening_amount || 0).toLocaleString()} Ar
                </button>
              ) : (
                <button onClick={ouvrirCaisse} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow-sm flex items-center gap-1 text-[10px] font-bold h-7 transition active:scale-95">
                  <CreditCard size={12}/> OUVRIR CAISSE
                </button>
              )}
          </div>
      </div>

      {/* TABLEAU LISTE (Style Sage) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden">
          <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                      <tr>
                          <th className="p-2 border-r border-gray-300">Employé / Identité</th>
                          <th className="p-2 border-r border-gray-300 w-48">Poste</th>
                          <th className="p-2 border-r border-gray-300 w-32">Type Contrat</th>
                          <th className="p-2 border-r border-gray-300 text-right w-32">Base Salaire</th>
                          <th className="p-2 border-r border-gray-300 text-center w-24">État</th>
                          <th className="p-2 text-center w-16">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                      {loading ? (
                          <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-mono">CHARGEMENT PERSONNEL...</td></tr>
                      ) : filtered.map(e => (
                          <tr key={e.id} className={`hover:bg-blue-50 transition-colors group ${e.status==='INACTIF' ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}>
                              <td className="p-2 border-r border-gray-100 font-bold text-gray-700">
                                  {e.nom}
                              </td>
                              <td className="p-2 border-r border-gray-100 text-gray-600">
                                  {e.poste}
                              </td>
                              <td className="p-2 border-r border-gray-100">
                                  {e.contract_type === 'MENSUEL' ? (
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit">
                                          <Briefcase size={10}/> MENSUEL
                                      </span>
                                  ) : (
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit">
                                          <Clock size={10}/> VACATAIRE
                                      </span>
                                  )}
                              </td>
                              <td className="p-2 border-r border-gray-100 text-right font-mono font-bold text-gray-800">
                                  {(e.base_salary || 0).toLocaleString()} Ar
                              </td>
                              <td className="p-2 border-r border-gray-100 text-center">
                                  {e.status === 'ACTIF' ? (
                                      <span className="text-green-600 font-bold text-[9px] flex items-center justify-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> ACTIF
                                      </span>
                                  ) : (
                                      <span className="text-gray-400 font-bold text-[9px] uppercase border border-gray-200 px-1 rounded">
                                          ARCHIVÉ
                                      </span>
                                  )}
                              </td>
                              <td className="p-1 text-center">
                                  <button 
                                      onClick={() => toggleStatus(e)} 
                                      className={`p-1.5 rounded transition ${e.status === 'ACTIF' ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                      title={e.status === 'ACTIF' ? 'Archiver' : 'Réactiver'}
                                  >
                                      {e.status === 'ACTIF' ? <Trash2 size={14}/> : <UserCheck size={14}/>}
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {!loading && filtered.length === 0 && (
                          <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic text-[10px]">Aucun employé trouvé.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 p-1 text-right text-[10px] text-gray-400 pr-2">
              Total Personnel: {employees.length}
          </div>
      </div>
    </div>
  );
}
