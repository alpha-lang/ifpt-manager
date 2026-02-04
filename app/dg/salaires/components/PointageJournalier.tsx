'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Save, Clock, CheckCheck, User, RefreshCw, Briefcase } from 'lucide-react';
import Swal from 'sweetalert2';

type Employee = {
  id: string;
  nom: string;
  contract_type: string;
  [key: string]: unknown;
};

type AttendanceEntry = {
  hours: number | string;
  status: string;
};

type AttendanceMap = Record<string, AttendanceEntry>;

export default function PointageJournalier() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceMap>({});
  const [loading, setLoading] = useState(false);

  const loadDayData = async () => {
    setLoading(true);
    const { data: emps } = await supabase.from('employees').select('*').eq('status', 'ACTIF').order('nom');
    const { data: att } = await supabase.from('attendance').select('*').eq('date', date);

    if (emps) {
        const employeesList = emps as Employee[];
        setEmployees(employeesList);
        const map: AttendanceMap = {};
        employeesList.forEach(e => {
            const record = (att ?? []).find(a => a.employee_id === e.id);
            map[e.id] = {
                hours: record ? record.hours : (e.contract_type === 'HORAIRE' ? 0 : 8),
                status: record ? record.status : 'PRESENT'
            };
        });
        setAttendanceData(map);
    }
    setLoading(false);
  };

  const handleChange = (id: string, field: keyof AttendanceEntry, val: string | number) => {
    setAttendanceData((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const markAllPresent = () => {
    const map: AttendanceMap = { ...attendanceData };
    employees.forEach(e => {
        if(e.contract_type === 'MENSUEL') map[e.id] = { hours: 8, status: 'PRESENT' };
    });
    setAttendanceData(map);
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    Toast.fire({ icon: 'success', title: 'Réinitialisé : Présent 8h' });
  };

  const saveAttendance = async () => {
    setLoading(true);
    const updates = employees.map(e => ({
        employee_id: e.id, date: date,
        hours: parseFloat(String(attendanceData[e.id]?.hours ?? '0')) || 0,
        status: attendanceData[e.id].status
    }));
    const { error } = await supabase.from('attendance').upsert(updates, { onConflict: 'employee_id, date' });
    setLoading(false);
    if (!error) {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'success', title: 'Pointage enregistré' });
    }
  };

  useEffect(() => { loadDayData(); }, [date]);

  // Calcul Total
  const totalHours: number = Object.values(attendanceData).reduce((acc, val) => acc + (parseFloat(String(val.hours ?? '0')) || 0), 0);

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Saisie des Heures</span>
          </div>
          
          <div className="flex items-center gap-3">
              {/* SÉLECTEUR DATE */}
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
                  <Calendar size={12} className="text-gray-500 mr-2"/>
                  <input 
                      type="date" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      className="bg-transparent text-[10px] font-bold outline-none text-gray-700 cursor-pointer"
                  />
              </div>

              {/* ACTIONS RAPIDES */}
              <button onClick={markAllPresent} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded shadow-sm flex items-center gap-1 font-bold text-[10px] h-7 hover:bg-blue-100 transition">
                  <CheckCheck size={12}/> TOUT PRÉSENT
              </button>
              
              <button onClick={loadDayData}><RefreshCw size={14} className={`text-gray-500 hover:rotate-180 transition ${loading ? 'animate-spin' : ''}`}/></button>
          </div>
      </div>

      {/* TABLEAU DE SAISIE (Style Sage Grid) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden">
          <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                      <tr>
                          <th className="p-2 border-r border-gray-300 w-64">Employé</th>
                          <th className="p-2 border-r border-gray-300 w-32">Contrat</th>
                          <th className="p-2 border-r border-gray-300 w-24 text-center">Heures</th>
                          <th className="p-2 border-r border-gray-300 w-32 text-center">Statut</th>
                          <th className="p-2">Observation Système</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                      {employees.map((e, i) => {
                          const currentStatus = attendanceData[e.id]?.status;
                          return (
                              <tr key={e.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                  
                                  {/* NOM */}
                                  <td className="p-2 border-r border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                                      <User size={12} className="text-gray-400"/>
                                      {e.nom}
                                  </td>

                                  {/* CONTRAT */}
                                  <td className="p-2 border-r border-gray-100">
                                      {e.contract_type === 'MENSUEL' ? (
                                          <span className="flex items-center gap-1 text-[9px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-100 w-fit">
                                              <Briefcase size={8}/> MENSUEL
                                          </span>
                                      ) : (
                                          <span className="flex items-center gap-1 text-[9px] text-purple-600 bg-purple-50 px-1 rounded border border-purple-100 w-fit">
                                              <Clock size={8}/> VACATAIRE
                                          </span>
                                      )}
                                  </td>

                                  {/* INPUT HEURES */}
                                  <td className="p-1 border-r border-gray-100 text-center bg-yellow-50/30">
                                      <input 
                                          type="number" 
                                          value={attendanceData[e.id]?.hours} 
                                          onChange={(ev) => handleChange(e.id, 'hours', ev.target.value)}
                                          className={`w-full text-center font-mono font-bold bg-transparent outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 ${e.contract_type==='HORAIRE' ? 'text-purple-700' : 'text-gray-700'}`}
                                      />
                                  </td>

                                  {/* SELECT STATUT */}
                                  <td className="p-1 border-r border-gray-100 text-center">
                                      <select 
                                          value={currentStatus} 
                                          onChange={(ev) => handleChange(e.id, 'status', ev.target.value)} 
                                          className={`w-full text-[10px] font-bold border-none outline-none bg-transparent cursor-pointer text-center
                                              ${currentStatus==='PRESENT'?'text-green-700':''}
                                              ${currentStatus==='ABSENT'?'text-red-600':''}
                                              ${currentStatus==='CONGE'?'text-orange-600':''}
                                          `}
                                      >
                                          <option value="PRESENT">PRÉSENT</option>
                                          <option value="ABSENT">ABSENT</option>
                                          <option value="CONGE">CONGÉ</option>
                                      </select>
                                  </td>

                                  {/* OBSERVATION */}
                                  <td className="p-2 text-gray-400 italic text-[9px]">
                                      {currentStatus === 'ABSENT' ? 'Non rémunéré (sauf motif)' : '-'}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          {/* FOOTER TOTAL & SAVE */}
          <div className="bg-gray-100 font-bold border-t border-gray-300 flex justify-between items-center p-2 px-4 h-12 shrink-0">
              <div className="flex gap-4 items-center">
                  <span className="text-[10px] uppercase text-gray-500">Cumul Heures Journée :</span>
                  <span className="text-lg font-mono text-blue-800 bg-white px-2 py-0.5 rounded border border-gray-300 shadow-inner">
                      {totalHours.toLocaleString()} H
                  </span>
              </div>

              <button 
                  onClick={saveAttendance} 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-bold shadow flex items-center gap-2 text-[11px] uppercase tracking-wide transition active:scale-95 disabled:opacity-50"
              >
                  {loading ? 'Enregistrement...' : <><Save size={14}/> Valider le Pointage</>}
              </button>
          </div>
      </div>
    </div>
  );
}
