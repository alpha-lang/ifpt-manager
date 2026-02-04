'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { Search, Filter, Pencil, Trash2, User, GraduationCap, Save, X, PlusCircle, CheckCircle, RefreshCw } from 'lucide-react';

type Student = {
  id: string;
  matricule: string;
  nom: string;
  prenom?: string | null;
  classe: string;
  [key: string]: unknown;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('TOUS');

  // Edition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').order('nom');
    setStudents((data ?? []) as Student[]);
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  // Filtrage dynamique
  useEffect(() => {
    let res = students;
    if (search) res = res.filter(s => 
        s.nom.toLowerCase().includes(search.toLowerCase()) || 
        s.matricule.toLowerCase().includes(search.toLowerCase())
    );
    if (filterClass !== 'TOUS') res = res.filter(s => s.classe === filterClass);
    setFiltered(res);
  }, [search, filterClass, students]);

  // --- ACTIONS ---

  // 1. CRÉER UN ÉTUDIANT (NOUVEAU)
  const createStudent = async () => {
    const { value: form } = await Swal.fire({
        title: 'Nouveau Dossier Étudiant',
        html: `
            <div class="flex flex-col gap-2 text-left text-xs">
                <label class="font-bold text-gray-500 uppercase">Matricule</label>
                <input id="swal-mat" class="swal2-input h-8 text-sm" placeholder="Ex: IFPT-2024-001" style="margin:0">
                
                <label class="font-bold text-gray-500 uppercase mt-2">Identité</label>
                <div class="flex gap-2">
                    <input id="swal-nom" class="swal2-input h-8 text-sm w-1/2" placeholder="Nom" style="margin:0">
                    <input id="swal-prenom" class="swal2-input h-8 text-sm w-1/2" placeholder="Prénoms" style="margin:0">
                </div>
                
                <label class="font-bold text-gray-500 uppercase mt-2">Classe / Niveau</label>
                <input id="swal-classe" class="swal2-input h-8 text-sm" placeholder="Ex: L1 GESTION" style="margin:0">
            </div>
        `,
        focusConfirm: false, 
        showCancelButton: true, 
        confirmButtonText: 'ENREGISTRER',
        confirmButtonColor: '#2563eb',
        width: '400px',
        preConfirm: () => {
            const mat = (document.getElementById('swal-mat') as HTMLInputElement).value;
            const nom = (document.getElementById('swal-nom') as HTMLInputElement).value;
            const prenom = (document.getElementById('swal-prenom') as HTMLInputElement).value;
            const classe = (document.getElementById('swal-classe') as HTMLInputElement).value;
            if (!mat || !nom || !classe) return Swal.showValidationMessage('Données incomplètes');
            return { matricule: mat, nom, prenom, classe };
        }
    });

    if (form) {
        const { error } = await supabase.from('students').insert(form);
        if (error) {
            Swal.fire('Erreur', error.message, 'error');
        } else {
            // Toast maison (sans bouton) peut être utilisé ici si dispo, sinon Swal toast
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            Toast.fire({ icon: 'success', title: 'Étudiant ajouté' });
            loadStudents();
        }
    }
  };

  // 2. MODIFIER
  const startEdit = (student: Student) => {
    setEditingId(student.id);
    setEditForm({ ...student });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    const { error } = await supabase.from('students').update({
        nom: editForm.nom,
        prenom: editForm.prenom,
        matricule: editForm.matricule,
        classe: editForm.classe
    }).eq('id', editingId);

    if (error) {
        Swal.fire('Erreur', error.message, 'error');
    } else {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'success', title: 'Modification enregistrée' });
        loadStudents();
        setEditingId(null);
    }
  };

  // 3. SUPPRIMER (Sécurisé)
  const deleteStudent = async (id: string) => {
    // Sécurité : Vérifier s'il a des paiements
    const { count } = await supabase.from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('student_matricule', students.find(s => s.id === id)?.matricule);

    if (count && count > 0) {
        Swal.fire('Opération Bloquée', 'Cet étudiant possède un historique comptable. Impossible de le supprimer.', 'warning');
        return;
    }

    const { isConfirmed } = await Swal.fire({
        title: 'Supprimer ce dossier ?',
        text: "Cette action est irréversible.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'SUPPRIMER'
    });

    if (isConfirmed) {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (!error) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Dossier supprimé' });
            loadStudents();
        } else {
            Swal.fire('Erreur', error.message, 'error');
        }
    }
  };

  // Liste unique des classes pour le select
  const classes = ['TOUS', ...Array.from(new Set(students.map(s => s.classe)))];

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* BARRE D'OUTILS COMPACTE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-blue-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Annuaire Étudiants</span>
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-200">{students.length} INSCRITS</span>
          </div>
          
          <div className="flex items-center gap-3">
              {/* FILTRES */}
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
                  <Filter size={12} className="text-gray-400 mr-2"/>
                  <select 
                      className="bg-transparent text-[10px] font-bold text-gray-700 outline-none w-32 cursor-pointer"
                      value={filterClass}
                      onChange={e => setFilterClass(e.target.value)}
                  >
                      {classes.map(c => <option key={c} value={c}>{c === 'TOUS' ? 'TOUTES CLASSES' : c}</option>)}
                  </select>
              </div>

              <div className="relative">
                  <Search className="absolute left-2 top-1.5 text-gray-400" size={12}/>
                  <input 
                      className="pl-7 p-1 w-48 border border-gray-300 rounded text-[10px] h-7 bg-white focus:border-blue-500 outline-none transition-colors font-bold text-gray-700" 
                      placeholder="Recherche (Nom, Matricule)..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)}
                  />
                  {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1.5 text-gray-400 hover:text-red-500"><X size={12}/></button>}
              </div>

              <button onClick={createStudent} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm flex items-center gap-1 text-[10px] font-bold h-7 transition active:scale-95">
                  <PlusCircle size={12}/> NOUVEAU
              </button>
              
              <button onClick={loadStudents}><RefreshCw size={14} className={`text-blue-600 hover:rotate-180 transition ${loading ? 'animate-spin' : ''}`}/></button>
          </div>
      </div>

      {/* TABLEAU LISTE (Style Sage) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden">
          <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                      <tr>
                          <th className="p-2 border-r border-gray-300 w-32">Matricule</th>
                          <th className="p-2 border-r border-gray-300">Nom & Prénom</th>
                          <th className="p-2 border-r border-gray-300 w-48">Classe / Niveau</th>
                          <th className="p-2 border-r border-gray-300 text-center w-24">Statut</th>
                          <th className="p-2 text-center w-20">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                      {loading ? (
                          <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-mono">CHARGEMENT ANNUAIRE...</td></tr>
                      ) : filtered.map((s, i) => (
                          <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors group`}>
                              
                              {editingId === s.id ? (
                                  // --- MODE ÉDITION EN LIGNE ---
                                  <>
                                      <td className="p-1 border-r border-gray-100">
                                          <input className="w-full border border-blue-300 rounded p-1 text-[10px] font-mono font-bold bg-white focus:ring-1 focus:ring-blue-500 outline-none uppercase" 
                                              value={editForm.matricule} onChange={e => setEditForm({...editForm, matricule: e.target.value})} />
                                      </td>
                                      <td className="p-1 border-r border-gray-100 flex gap-1">
                                          <input className="w-1/2 border border-blue-300 rounded p-1 text-[10px] bg-white focus:ring-1 focus:ring-blue-500 outline-none" 
                                              placeholder="Nom" value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} />
                                          <input className="w-1/2 border border-blue-300 rounded p-1 text-[10px] bg-white focus:ring-1 focus:ring-blue-500 outline-none" 
                                              placeholder="Prénom" value={editForm.prenom} onChange={e => setEditForm({...editForm, prenom: e.target.value})} />
                                      </td>
                                      <td className="p-1 border-r border-gray-100">
                                          <input className="w-full border border-blue-300 rounded p-1 text-[10px] font-bold bg-white focus:ring-1 focus:ring-blue-500 outline-none uppercase" 
                                              value={editForm.classe} onChange={e => setEditForm({...editForm, classe: e.target.value})} />
                                      </td>
                                      <td className="p-1 border-r border-gray-100 text-center">
                                          <span className="text-[9px] text-gray-400 italic">Édition...</span>
                                      </td>
                                      <td className="p-1 text-center flex justify-center gap-1">
                                          <button onClick={saveEdit} className="bg-green-600 text-white p-1 rounded hover:bg-green-700 shadow-sm" title="Sauvegarder"><CheckCircle size={14}/></button>
                                          <button onClick={cancelEdit} className="bg-gray-400 text-white p-1 rounded hover:bg-gray-500 shadow-sm" title="Annuler"><X size={14}/></button>
                                      </td>
                                  </>
                              ) : (
                                  // --- MODE LECTURE ---
                                  <>
                                      <td className="p-2 border-r border-gray-100 font-mono text-gray-500 font-bold">
                                          {s.matricule}
                                      </td>
                                      <td className="p-2 border-r border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                                          <User size={12} className="text-blue-300"/>
                                          {s.nom} <span className="font-normal text-gray-500">{s.prenom}</span>
                                      </td>
                                      <td className="p-2 border-r border-gray-100">
                                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 text-[9px] font-bold">
                                              {s.classe}
                                          </span>
                                      </td>
                                      <td className="p-2 border-r border-gray-100 text-center">
                                          <span className="text-green-600 font-bold text-[9px] flex items-center justify-center gap-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> ACTIF
                                          </span>
                                      </td>
                                      <td className="p-1 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => startEdit(s)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="Modifier">
                                              <Pencil size={14}/>
                                          </button>
                                          <button onClick={() => deleteStudent(s.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition" title="Supprimer">
                                              <Trash2 size={14}/>
                                          </button>
                                      </td>
                                  </>
                              )}
                          </tr>
                      ))}
                      {!loading && filtered.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic text-[10px]">Aucun étudiant correspondant.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 p-1 text-right text-[10px] text-gray-400 pr-2">
              Double-cliquez pour éditer (futur) ou utilisez le crayon.
          </div>
      </div>
    </div>
  );
}
