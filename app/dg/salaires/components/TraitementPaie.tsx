'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { DollarSign, Calculator, History, ArrowRight, CheckCircle, Clock, Save, RefreshCw, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

type Employee = {
  id: string;
  nom: string;
  base_salary: number;
  contract_type: string;
  [key: string]: unknown;
};

type Attendance = {
  employee_id: string;
  hours?: number | null;
  status?: string | null;
  [key: string]: unknown;
};

type PaymentRequest = {
  beneficiary?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

type PayrollLine = Employee & {
  total_hours: number;
  days_worked: number;
  brut_salary: number;
  prime: number;
  avance: number;
  payment_status: string | null;
};

export default function TraitementPaie() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollLines, setPayrollLines] = useState<PayrollLine[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPayroll = async () => {
    setLoading(true);
    const start = `${month}-01`;
    const end = `${month}-31`;

    // 1. Employés et Pointages
    const { data: emps } = await supabase.from('employees').select('*').eq('status', 'ACTIF').order('nom');
    const { data: att } = await supabase.from('attendance').select('*').gte('date', start).lte('date', end);
    
    // 2. Vérifier les paiements déjà faits pour ce mois
    const { data: payments } = await supabase.from('payment_requests')
        .select('*')
        .ilike('description', `%${month}%`) // Recherche approximative du mois dans la description
        .eq('category', 'SALAIRE');

    if (emps && att) {
        const employeeList = emps as Employee[];
        const attendanceList = att as Attendance[];
        const lines = employeeList.map(e => {
            const myAtt = attendanceList.filter(a => a.employee_id === e.id);
            const totalHours = myAtt.reduce((sum, a) => sum + (a.hours || 0), 0);
            const brut = e.contract_type === 'HORAIRE' ? totalHours * e.base_salary : e.base_salary;
            
            // Vérifier statut
            const existing = (payments as PaymentRequest[] | null)?.find(p => p.beneficiary === e.nom);
            
            return { 
                ...e, 
                total_hours: totalHours, 
                days_worked: myAtt.filter(a => a.status === 'PRESENT').length, 
                brut_salary: brut, 
                prime: 0, 
                avance: 0,
                payment_status: existing ? existing.status : null // 'PENDING', 'PAID' ou null
            };
        });
        setPayrollLines(lines);
    }
    setLoading(false);
  };

  const handleBonus = (idx: number, field: 'prime' | 'avance', val: string) => {
      const newLines = [...payrollLines];
      newLines[idx][field] = parseFloat(val) || 0;
      setPayrollLines(newLines);
  };

  const payEmployee = async (emp: PayrollLine) => {
    if (emp.payment_status) return;

    const net = emp.brut_salary + emp.prime - emp.avance;
    if (net <= 0) {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'warning', title: 'Montant nul' });
        return;
    }

    const { isConfirmed } = await Swal.fire({
        title: `Payer ${emp.nom} ?`,
        html: `
            <div class="text-left bg-gray-50 p-4 border rounded text-xs">
                <p>Salaire de Base: <b>${emp.brut_salary.toLocaleString()}</b></p>
                <p class="text-green-600">Primes: +${emp.prime.toLocaleString()}</p>
                <p class="text-red-600">Avances: -${emp.avance.toLocaleString()}</p>
                <hr class="my-2"/>
                <p class="text-lg font-bold text-blue-800 text-right">NET À PAYER : ${net.toLocaleString()} Ar</p>
            </div>
        `,
        icon: 'question', showCancelButton: true, confirmButtonText: 'VALIDER', confirmButtonColor: '#2563eb'
    });

    if (isConfirmed) {
        const { error } = await supabase.from('payment_requests').insert({
            amount: net, beneficiary: emp.nom, description: `Salaire ${month} (${emp.total_hours}h)`,
            category: 'SALAIRE', status: 'PENDING', requested_by: sessionStorage.getItem('name') || 'DG'
        });
        if (!error) { 
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Envoyé à la caisse' });
            loadPayroll(); 
        }
    }
  };

  useEffect(() => { loadPayroll(); }, [month]);

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CALCUL PAIE EN COURS...</div>;

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Calculator size={16} className="text-green-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Traitement de la Paie</span>
          </div>
          
          <div className="flex items-center gap-3">
              {/* SÉLECTEUR MOIS */}
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded px-2 h-7">
                  <Calendar size={12} className="text-gray-500 mr-2"/>
                  <input 
                      type="month" 
                      value={month} 
                      onChange={e => setMonth(e.target.value)} 
                      className="bg-transparent text-[10px] font-bold outline-none text-gray-700 cursor-pointer"
                  />
              </div>

              {/* LIEN JOURNAL */}
              <Link href="/econome/salaires/journal" className="bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded shadow-sm flex items-center gap-1 font-bold text-[10px] h-7 hover:bg-gray-50 transition">
                  <FileText size={12}/> JOURNAL PAIE
              </Link>
              
              <button onClick={loadPayroll}><RefreshCw size={14} className="text-blue-600 hover:rotate-180 transition"/></button>
          </div>
      </div>

      {/* TABLEAU PAIE (Style Sage Grid) */}
      <div className="flex-1 bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden">
          <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[9px]">
                      <tr>
                          <th className="p-2 border-r border-gray-300">Employé</th>
                          <th className="p-2 border-r border-gray-300 w-20 text-center">Volume</th>
                          <th className="p-2 border-r border-gray-300 w-24 text-right">Base</th>
                          <th className="p-2 border-r border-gray-300 w-24 text-right bg-green-50">Primes (+)</th>
                          <th className="p-2 border-r border-gray-300 w-24 text-right bg-red-50">Avances (-)</th>
                          <th className="p-2 border-r border-gray-300 w-28 text-right bg-blue-50 font-black">NET À PAYER</th>
                          <th className="p-2 text-center w-24">État</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                      {payrollLines.map((line, idx) => {
                          const net = line.brut_salary + line.prime - line.avance;
                          const isLocked = !!line.payment_status; // Si déjà payé/envoyé, on verrouille

                          return (
                              <tr key={line.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                  <td className="p-2 border-r border-gray-100 font-bold text-gray-700">
                                      {line.nom}
                                  </td>
                                  <td className="p-2 border-r border-gray-100 text-center font-mono">
                                      {line.total_hours}h
                                  </td>
                                  <td className="p-2 border-r border-gray-100 text-right text-gray-500 font-mono">
                                      {line.brut_salary.toLocaleString()}
                                  </td>
                                  
                                  {/* PRIMES */}
                                  <td className="p-1 border-r border-gray-100 text-right bg-green-50/20">
                                      <input 
                                          className="w-full text-right bg-transparent outline-none focus:ring-1 focus:ring-green-500 rounded px-1 font-mono text-green-700" 
                                          placeholder="0" 
                                          disabled={isLocked}
                                          onChange={e => handleBonus(idx, 'prime', e.target.value)}
                                      />
                                  </td>

                                  {/* AVANCES */}
                                  <td className="p-1 border-r border-gray-100 text-right bg-red-50/20">
                                      <input 
                                          className="w-full text-right bg-transparent outline-none focus:ring-1 focus:ring-red-500 rounded px-1 font-mono text-red-700" 
                                          placeholder="0" 
                                          disabled={isLocked}
                                          onChange={e => handleBonus(idx, 'avance', e.target.value)}
                                      />
                                  </td>

                                  {/* NET */}
                                  <td className="p-2 border-r border-gray-100 text-right font-bold font-mono text-blue-900 bg-blue-50/20">
                                      {net.toLocaleString()} Ar
                                  </td>

                                  {/* ACTION / STATUT */}
                                  <td className="p-1 text-center">
                                      {line.payment_status === 'PAID' ? (
                                          <span className="text-green-600 flex justify-center gap-1 text-[9px] font-bold uppercase border border-green-200 bg-green-50 px-1 rounded"><CheckCircle size={10}/> Payé</span>
                                      ) : line.payment_status === 'PENDING' ? (
                                          <span className="text-orange-500 flex justify-center gap-1 text-[9px] font-bold uppercase border border-orange-200 bg-orange-50 px-1 rounded"><Clock size={10}/> Attente</span>
                                      ) : (
                                          <button 
                                              onClick={() => payEmployee(line)} 
                                              className="bg-blue-600 text-white px-2 py-1 rounded shadow-sm text-[9px] font-bold hover:bg-blue-700 flex items-center justify-center gap-1 w-full"
                                          >
                                              <DollarSign size={10}/> VALIDER
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          {/* FOOTER TOTAL */}
          <div className="bg-gray-100 font-bold border-t border-gray-300 flex justify-end items-center p-2 px-4 h-10 shrink-0 text-[10px] uppercase text-gray-500">
              Total Masse Salariale (Net) : 
              <span className="ml-2 text-blue-800 text-sm font-mono bg-white px-2 py-0.5 border border-gray-300 rounded shadow-inner">
                  {payrollLines.reduce((acc, l) => acc + (l.brut_salary + l.prime - l.avance), 0).toLocaleString()} Ar
              </span>
          </div>
      </div>
    </div>
  );
}
