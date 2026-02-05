'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { 
  Search, Pencil, PlusCircle, CheckCircle, RefreshCw, 
  Eye, Save, X, Printer, FileSpreadsheet, Stethoscope, Calendar, Filter
} from 'lucide-react';

type Student = {
  id: string;
  matricule: string;
  nom: string;
  prenom?: string | null;
  classe: string; // Contient "PARCOURS + NIVEAU" combinés
  contact?: string | null;
  adresse?: string | null;
  created_at: string; // Assure-toi que Supabase renvoie cette colonne
  [key: string]: unknown;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // FILTRES
  const [search, setSearch] = useState('');
  const [filterParcours, setFilterParcours] = useState('TOUS');
  const [filterNiveau, setFilterNiveau] = useState('TOUS');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  const PARCOURS_LIST = ['INFIRMIER(E)', 'SAGE FEMME', 'TECHNICIEN LABO', 'KINÉSITHÉRAPEUTE', 'AUXILIAIRE', 'AUTRE'];
  const NIVEAUX_LIST = ['L1', 'L2', 'L3', 'M1', 'M2'];

  const loadStudents = async () => {
    setLoading(true);
    // On sélectionne aussi created_at pour le filtre date
    const { data } = await supabase.from('students').select('*').order('nom');
    setStudents((data ?? []) as Student[]);
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  // --- LOGIQUE DE FILTRAGE AVANCÉE ---
  useEffect(() => {
    let res = students;

    // 1. Recherche Textuelle
    if (search) {
        res = res.filter(s => 
            s.nom.toLowerCase().includes(search.toLowerCase()) || 
            s.matricule.toLowerCase().includes(search.toLowerCase())
        );
    }

    // 2. Filtre Parcours (Basé sur la colonne combinée 'classe')
    if (filterParcours !== 'TOUS') {
        res = res.filter(s => s.classe.includes(filterParcours)); 
    }

    // 3. Filtre Niveau (On vérifie si la 'classe' termine par le niveau ou le contient)
    if (filterNiveau !== 'TOUS') {
        res = res.filter(s => s.classe.includes(filterNiveau));
    }

    // 4. Filtre Date Début
    if (dateDebut) {
        res = res.filter(s => new Date(s.created_at) >= new Date(dateDebut));
    }

    // 5. Filtre Date Fin (On met la fin de journée pour inclure le jour même)
    if (dateFin) {
        const d = new Date(dateFin);
        d.setHours(23, 59, 59);
        res = res.filter(s => new Date(s.created_at) <= d);
    }

    setFiltered(res);
  }, [search, filterParcours, filterNiveau, dateDebut, dateFin, students]);

  // --- UTILITAIRES D'AFFICHAGE ---
  // Fonction pour extraire proprement le niveau de la chaine "PARCOURS NIVEAU"
  const getNiveauDisplay = (classeStr: string) => {
    const parts = classeStr.split(' ');
    const potentialNiveau = parts[parts.length - 1]; // Le dernier mot est souvent le niveau (L1, L2...)
    return NIVEAUX_LIST.includes(potentialNiveau) ? potentialNiveau : '-';
  };

  const getParcoursDisplay = (classeStr: string) => {
    const parts = classeStr.split(' ');
    const potentialNiveau = parts[parts.length - 1];
    if (NIVEAUX_LIST.includes(potentialNiveau)) {
        return classeStr.replace(potentialNiveau, '').trim();
    }
    return classeStr;
  };

  // --- ACTIONS ---

  const createStudent = async () => {
    const optionsParcours = PARCOURS_LIST.map(p => `<option value="${p}">${p}</option>`).join('');
    const optionsNiveaux = NIVEAUX_LIST.map(n => `<option value="${n}">${n}</option>`).join('');

    const { value: form } = await Swal.fire({
        title: 'NOUVEAU DOSSIER',
        html: `
            <div class="flex flex-col gap-2 text-left text-xs font-sans">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="font-bold text-gray-500 uppercase text-[9px]">Matricule</label>
                        <input id="swal-mat" class="swal2-input h-7 text-xs w-full m-0 border-gray-300" placeholder="Ex: PM-2024-001">
                    </div>
                    <div>
                         <label class="font-bold text-gray-500 uppercase text-[9px]">Contact</label>
                         <input id="swal-contact" class="swal2-input h-7 text-xs w-full m-0" placeholder="034...">
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 bg-slate-50 p-2 border border-slate-200">
                    <div class="col-span-2">
                         <label class="font-bold text-blue-800 uppercase text-[9px]">Parcours</label>
                         <select id="swal-parcours" class="swal2-select h-7 text-xs w-full m-0 border-blue-300 font-bold text-blue-900">${optionsParcours}</select>
                    </div>
                    <div>
                         <label class="font-bold text-blue-800 uppercase text-[9px]">Niveau</label>
                         <select id="swal-niveau" class="swal2-select h-7 text-xs w-full m-0 border-blue-300 font-black text-blue-900">${optionsNiveaux}</select>
                    </div>
                </div>
                <div>
                    <label class="font-bold text-gray-500 uppercase text-[9px]">Identité</label>
                    <div class="flex gap-2 mt-1">
                        <input id="swal-nom" class="swal2-input h-7 text-xs w-1/2 m-0 uppercase font-bold" placeholder="NOM">
                        <input id="swal-prenom" class="swal2-input h-7 text-xs w-1/2 m-0 capitalize" placeholder="Prénom">
                    </div>
                </div>
                <div>
                    <label class="font-bold text-gray-500 uppercase text-[9px]">Adresse</label>
                    <input id="swal-adresse" class="swal2-input h-7 text-xs w-full m-0" placeholder="Lot...">
                </div>
            </div>
        `,
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'ENREGISTRER', confirmButtonColor: '#16a34a', width: '400px',
        preConfirm: () => {
            const mat = (document.getElementById('swal-mat') as HTMLInputElement).value;
            const nom = (document.getElementById('swal-nom') as HTMLInputElement).value;
            const prenom = (document.getElementById('swal-prenom') as HTMLInputElement).value;
            const parcours = (document.getElementById('swal-parcours') as HTMLSelectElement).value;
            const niveau = (document.getElementById('swal-niveau') as HTMLSelectElement).value;
            const contact = (document.getElementById('swal-contact') as HTMLInputElement).value;
            const adresse = (document.getElementById('swal-adresse') as HTMLInputElement).value;

            if (!mat || !nom) return Swal.showValidationMessage('Matricule et Nom requis');
            return { matricule: mat, nom, prenom, classe: `${parcours} ${niveau}`, contact, adresse };
        }
    });

    if (form) {
        const { error } = await supabase.from('students').insert(form);
        if (error) Swal.fire('Erreur', error.message, 'error');
        else {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            Toast.fire({ icon: 'success', title: 'Succès' });
            loadStudents();
        }
    }
  };

  const startEdit = (student: Student) => {
    setEditingId(student.id);
    setEditForm({ ...student });
  };

  const saveEdit = async () => {
    const { error } = await supabase.from('students').update({
        nom: editForm.nom, prenom: editForm.prenom, matricule: editForm.matricule, classe: editForm.classe, contact: editForm.contact, adresse: editForm.adresse
    }).eq('id', editingId);

    if (error) Swal.fire('Erreur', error.message, 'error');
    else { loadStudents(); setEditingId(null); }
  };

  const viewDetails = (s: Student) => {
    Swal.fire({
        title: `<span class="text-sm font-black uppercase">${s.matricule}</span>`,
        html: `
            <div class="text-left bg-slate-50 p-4 border border-slate-200 text-xs">
                <div class="mb-2"><strong class="text-slate-400 text-[9px] uppercase">Nom:</strong><br/><span class="text-sm font-black text-slate-800 uppercase">${s.nom} ${s.prenom || ''}</span></div>
                <div class="mb-2"><strong class="text-slate-400 text-[9px] uppercase">Formation:</strong><br/><span class="bg-blue-600 text-white px-2 py-0.5 font-bold">${s.classe}</span></div>
                <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                    <div><strong class="text-slate-400 text-[9px] uppercase">Tel:</strong><br/>${s.contact || '-'}</div>
                    <div><strong class="text-slate-400 text-[9px] uppercase">Ville:</strong><br/>${s.adresse || '-'}</div>
                </div>
                 <div class="mt-2 text-[9px] text-slate-400 text-right">Inscrit le: ${new Date(s.created_at).toLocaleDateString()}</div>
            </div>
        `,
        confirmButtonText: 'OK', confirmButtonColor: '#334155'
    });
  };

  const exportExcel = () => {
    if (filtered.length === 0) {
        Swal.fire('Info', 'Aucune donnée à exporter', 'info');
        return;
    }
    const dataToExport = filtered.map(s => ({
        "MATRICULE": s.matricule,
        "NOM": s.nom,
        "PRENOM": s.prenom || '',
        "PARCOURS": getParcoursDisplay(s.classe),
        "NIVEAU": getNiveauDisplay(s.classe),
        "TELEPHONE": s.contact || '',
        "ADRESSE": s.adresse || '',
        "DATE INSCRIPTION": new Date(s.created_at).toLocaleDateString()
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [{wch:15}, {wch:20}, {wch:20}, {wch:25}, {wch:10}, {wch:15}, {wch:20}, {wch:15}];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Liste Etudiants");
    XLSX.writeFile(wb, `Export_Etudiants_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
    <style jsx global>{`
        @media print {
            @page { size: landscape; margin: 10mm; }
            body { background-color: white !important; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .custom-scrollbar::-webkit-scrollbar { display: none; }
            * { box-shadow: none !important; }
            select { appearance: none; border: none; background: transparent; font-weight: bold; }
        }
    `}</style>

    <div className="h-[calc(100vh-60px)] bg-slate-200 p-2 text-xs font-sans overflow-hidden flex flex-col animate-in-faint print:h-auto print:bg-white print:p-0">
      
      {/* HEADER TOOLS */}
      <div className="no-print bg-white border border-slate-400 p-2 flex justify-between items-center shadow-sm h-12 shrink-0 mb-1">
          <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-1.5 border border-blue-200"><Stethoscope size={16} className="text-blue-800"/></div>
              <div>
                <h1 className="font-black text-slate-700 uppercase tracking-tighter leading-none text-sm">Annuaire Paramédical</h1>
                <span className="text-[9px] font-bold text-slate-400">{filtered.length} / {students.length} AFFICHÉS</span>
              </div>
          </div>
          
          <div className="flex items-center gap-2">
              
              {/* FILTRES DATE */}
              <div className="flex items-center bg-white border border-slate-400 h-7 px-1 gap-1 shadow-inner">
                  <Calendar size={12} className="text-slate-500"/>
                  <input type="date" className="h-full bg-transparent outline-none text-[9px] w-20 uppercase font-bold text-slate-600" 
                    value={dateDebut} onChange={e => setDateDebut(e.target.value)} title="Date Début" />
                  <span className="text-slate-300">-</span>
                  <input type="date" className="h-full bg-transparent outline-none text-[9px] w-20 uppercase font-bold text-slate-600" 
                    value={dateFin} onChange={e => setDateFin(e.target.value)} title="Date Fin" />
                   {(dateDebut || dateFin) && <button onClick={() => {setDateDebut(''); setDateFin('')}} className="text-red-500"><X size={12}/></button>}
              </div>

              {/* RECHERCHE */}
              <div className="flex items-center bg-white border border-slate-400 h-7 w-40 shadow-inner relative">
                  <div className="bg-slate-200 h-full w-8 flex items-center justify-center border-r border-slate-400"><Search size={10} className="text-slate-600"/></div>
                  <input className="w-full px-2 text-[10px] h-full outline-none font-bold uppercase placeholder:text-slate-300" 
                      placeholder="RECHERCHE..." value={search} onChange={e => setSearch(e.target.value)} />
                  {search && <button onClick={() => setSearch('')} className="absolute right-1 text-slate-400 hover:text-red-500"><X size={12}/></button>}
              </div>

              <div className="h-6 w-[1px] bg-slate-300 mx-1"></div>

              <button onClick={handlePrint} className="h-7 w-7 bg-white border border-slate-400 flex items-center justify-center hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition">
                <Printer size={14} />
              </button>
              <button onClick={exportExcel} className="h-7 w-7 bg-white border border-slate-400 flex items-center justify-center hover:bg-slate-100 text-slate-700 hover:text-green-600 transition">
                <FileSpreadsheet size={14} />
              </button>

              <div className="h-6 w-[1px] bg-slate-300 mx-1"></div>

              <button onClick={createStudent} className="bg-slate-700 hover:bg-slate-800 text-white px-3 h-7 border border-black shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-wide transition active:translate-y-[1px]">
                  <PlusCircle size={12}/> AJOUT
              </button>
              <button onClick={loadStudents} className="h-7 w-7 bg-white border border-slate-400 flex items-center justify-center hover:bg-slate-100 text-blue-700"><RefreshCw size={12} className={loading ? 'animate-spin' : ''}/></button>
          </div>
      </div>

      <div className="hidden print:block mb-4 text-center">
        <h1 className="text-xl font-bold uppercase">Liste des Étudiants</h1>
        <p className="text-sm">Période: {dateDebut || 'Début'} au {dateFin || 'Ce jour'}</p>
      </div>

      {/* TABLEAU */}
      <div className="flex-1 bg-white border border-slate-500 flex flex-col overflow-hidden relative shadow-md print:border-none print:shadow-none print:overflow-visible">
          <div className="flex-1 overflow-auto custom-scrollbar print:overflow-visible">
              <table className="w-full text-left border-collapse print:text-[9px]">
                  
                  {/* EN-TÊTE AVEC FILTRES INTÉGRÉS */}
                  <thead className="bg-[#e2e8f0] text-[#1e293b] font-bold text-[9px] uppercase sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)] print:static print:bg-slate-200">
                      <tr>
                          <th className="p-1 pl-2 border-r border-b border-slate-400 w-24 print:border-slate-800">Matricule</th>
                          <th className="p-1 pl-2 border-r border-b border-slate-400 print:border-slate-800">Identité Complète</th>
                          
                          {/* COLONNE PARCOURS AVEC FILTRE */}
                          <th className="p-0 border-r border-b border-slate-400 w-40 print:border-slate-800 bg-blue-50 relative group hover:bg-blue-100 transition-colors">
                              <div className="flex items-center h-full w-full px-2">
                                  <span className="flex-1">Parcours</span>
                                  <Filter size={8} className="text-slate-400 absolute right-1 top-1"/>
                                  <select 
                                    value={filterParcours} 
                                    onChange={e => setFilterParcours(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[9px]" 
                                    title="Filtrer par Parcours">
                                      <option value="TOUS">TOUS</option>
                                      {PARCOURS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                  {filterParcours !== 'TOUS' && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 absolute right-1 bottom-1"></div>}
                              </div>
                          </th>

                          {/* COLONNE NIVEAU AVEC FILTRE */}
                          <th className="p-0 border-r border-b border-slate-400 w-16 print:border-slate-800 bg-blue-50 relative group hover:bg-blue-100 transition-colors">
                              <div className="flex items-center h-full w-full px-2">
                                  <span className="flex-1">Niv.</span>
                                  <select 
                                    value={filterNiveau} 
                                    onChange={e => setFilterNiveau(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[9px]"
                                    title="Filtrer par Niveau">
                                      <option value="TOUS">TOUS</option>
                                      {NIVEAUX_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                  {filterNiveau !== 'TOUS' && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 absolute right-1 bottom-1"></div>}
                              </div>
                          </th>

                          <th className="p-1 pl-2 border-r border-b border-slate-400 w-48 print:border-slate-800">Coordonnées</th>
                          <th className="p-1 text-center border-b border-slate-400 w-20 no-print">Actions</th>
                      </tr>
                  </thead>
                  
                  <tbody className="font-sans text-[10px] text-slate-700">
                      {loading ? (
                          <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-black animate-pulse">CHARGEMENT...</td></tr>
                      ) : filtered.length === 0 ? (
                          <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">Aucun étudiant trouvé pour ces critères.</td></tr>
                      ) : filtered.map((s, i) => (
                          <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} hover:bg-[#e0f2fe] transition-colors border-b border-slate-200 h-8 print:border-slate-300 break-inside-avoid`}>
                              
                              {editingId === s.id ? (
                                  // --- MODE ÉDITION ---
                                  <>
                                      <td className="p-0 border-r border-slate-300">
                                          <input className="w-full h-8 px-2 bg-yellow-50 text-[10px] font-mono font-bold outline-none ring-inset focus:ring-2 ring-blue-500 uppercase" 
                                              value={editForm.matricule} onChange={e => setEditForm({...editForm, matricule: e.target.value})} />
                                      </td>
                                      <td className="p-0 border-r border-slate-300 flex">
                                          <input className="w-2/3 h-8 px-2 bg-yellow-50 text-[10px] font-bold outline-none focus:ring-1 ring-blue-500 uppercase border-r border-slate-200" 
                                              value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} />
                                          <input className="w-1/3 h-8 px-2 bg-yellow-50 text-[10px] outline-none focus:ring-1 ring-blue-500" 
                                              value={editForm.prenom || ''} onChange={e => setEditForm({...editForm, prenom: e.target.value})} />
                                      </td>
                                      <td colSpan={2} className="p-0 border-r border-slate-300">
                                          <input className="w-full h-8 px-2 bg-yellow-50 text-[10px] font-bold outline-none focus:ring-1 ring-blue-500 uppercase"
                                              value={editForm.classe} onChange={e => setEditForm({...editForm, classe: e.target.value})} 
                                              placeholder="Ex: INFIRMIER L1"/>
                                      </td>
                                      <td className="p-0 border-r border-slate-300">
                                          <input className="w-full h-8 px-2 bg-yellow-50 text-[10px] outline-none focus:ring-1 ring-blue-500" 
                                              value={editForm.contact || ''} onChange={e => setEditForm({...editForm, contact: e.target.value})} />
                                      </td>
                                      <td className="p-0 text-center bg-yellow-100 flex items-center justify-center h-8 gap-2">
                                          <button onClick={saveEdit} className="text-green-600 hover:scale-110"><Save size={14}/></button>
                                          <button onClick={() => setEditingId(null)} className="text-red-500 hover:scale-110"><X size={14}/></button>
                                      </td>
                                  </>
                              ) : (
                                  // --- MODE LECTURE ---
                                  <>
                                      <td className="px-2 border-r border-slate-300 font-mono font-bold text-slate-600 print:border-slate-300">{s.matricule}</td>
                                      <td className="px-2 border-r border-slate-300 print:border-slate-300">
                                          <span className="font-black uppercase">{s.nom}</span> <span className="capitalize text-slate-500 print:text-slate-700">{s.prenom}</span>
                                      </td>
                                      
                                      {/* COLONNE PARCOURS SÉPARÉE */}
                                      <td className="px-2 border-r border-slate-300 font-bold text-blue-800 truncate print:text-black print:border-slate-300">
                                          {getParcoursDisplay(s.classe)}
                                      </td>

                                      {/* COLONNE NIVEAU SÉPARÉE */}
                                      <td className="px-2 border-r border-slate-300 font-bold text-center text-slate-600 print:text-black print:border-slate-300">
                                          {getNiveauDisplay(s.classe)}
                                      </td>

                                      <td className="px-2 border-r border-slate-300 truncate text-slate-500 print:text-black print:border-slate-300">{s.contact} {s.adresse ? `— ${s.adresse}` : ''}</td>
                                      <td className="text-center flex justify-center items-center h-8 gap-3 no-print">
                                          <button onClick={() => viewDetails(s)} className="text-slate-400 hover:text-blue-600"><Eye size={14}/></button>
                                          <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-green-600"><Pencil size={14}/></button>
                                      </td>
                                  </>
                              )}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          
          <div className="no-print bg-[#e2e8f0] border-t border-slate-400 p-1 px-3 flex justify-between items-center text-[9px] font-bold text-slate-500 font-mono">
             <span>BDD: students (public)</span>
             <span className="flex items-center gap-1 text-emerald-700"><CheckCircle size={10}/> CONNECTÉ</span>
          </div>
      </div>
    </div>
    </>
  );
}