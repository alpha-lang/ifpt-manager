'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { Lock, AlertTriangle, CheckCircle, Calculator, Save, Coins } from 'lucide-react';

type Register = {
  id: string;
  created_at: string;
  [key: string]: unknown;
};

type AuditRow = {
  id: string;
  name: string;
  icon?: string | null;
  systemBalance: number;
  realBalance: number;
  ecart: number;
  billetage: Record<string, number> | null;
};

export default function ClotureAudit() {
  const [register, setRegister] = useState<Register | null>(null);
  const [auditData, setAuditData] = useState<AuditRow[]>([]); 
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const { data: reg } = await supabase.from('cash_registers').select('*').eq('status', 'OPEN').maybeSingle();
    
    if (reg) {
      setRegister(reg as Register);
      const { data: vaults } = await supabase.from('vaults').select('*').order('name');
      
      if (vaults) {
        setAuditData((vaults as Array<{ id: string; name: string; icon?: string | null; balance: number }>).map(v => ({
            id: v.id, 
            name: v.name, 
            icon: v.icon,
            systemBalance: v.balance, 
            realBalance: 0, // Audit Strict : on part de 0
            ecart: 0 - v.balance, // Tout est en écart au début
            billetage: null 
        })));
      }
    }
    setLoading(false);
  };

  const updateRealBalance = (id: string, val: string) => {
    const v = val === '' ? 0 : parseFloat(val);
    setAuditData(prev => prev.map(i => i.id === id ? { ...i, realBalance: v, ecart: v - i.systemBalance } : i));
  };

  // --- FENÊTRE DE BILLETAGE ---
  const openBilletage = async (row: AuditRow) => {
    const current = row.billetage || { '20000':0, '10000':0, '5000':0, '2000':0, '1000':0, '500':0, '200':0, '100':0 };
    
    const inputs = [20000, 10000, 5000, 2000, 1000, 500, 200, 100].map(val => `
      <div class="flex items-center justify-between mb-1 text-xs">
        <span class="w-16 text-right font-bold text-gray-600 font-mono">${val.toLocaleString()}</span>
        <span class="text-gray-400 mx-1">x</span>
        <input type="number" id="bill-${val}" value="${current[val] || ''}" class="border border-gray-300 p-1 rounded w-16 text-center font-bold text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0" min="0">
      </div>
    `).join('');

    const { value: formValues } = await Swal.fire({
      title: `Billetage : ${row.name}`,
      html: `<div class="bg-gray-50 p-3 rounded border border-gray-200 grid grid-cols-2 gap-x-4">${inputs}</div>`,
      confirmButtonText: 'VALIDER COMPTAGE',
      confirmButtonColor: '#2563eb',
      showCancelButton: true,
      width: '450px',
      preConfirm: () => {
        const result: Record<string, number> = {};
        let total = 0;
        [20000, 10000, 5000, 2000, 1000, 500, 200, 100].forEach(val => {
          const el = document.getElementById(`bill-${val}`) as HTMLInputElement;
          const count = el.value ? parseInt(el.value) : 0;
          result[val] = count;
          total += count * val;
        });
        return { details: result, total };
      }
    });

    if (formValues) {
      setAuditData(prev => prev.map(i => i.id === row.id ? { 
          ...i, 
          realBalance: formValues.total, 
          ecart: formValues.total - i.systemBalance,
          billetage: formValues.details 
      } : i));
    }
  };

  const handleClose = async () => {
    const totalEcart = auditData.reduce((acc, i) => acc + Math.abs(i.ecart), 0);
    const totalPhysique = auditData.reduce((acc, i) => acc + i.realBalance, 0);

    const { isConfirmed } = await Swal.fire({
      title: 'Clôturer la Caisse ?',
      html: `
         <div class="text-left text-sm p-4 bg-gray-50 border rounded mb-2">
            <div class="flex justify-between mb-2"><span>Total Physique :</span> <b>${totalPhysique.toLocaleString()} Ar</b></div>
            <div class="flex justify-between ${totalEcart!==0?'text-red-600 font-bold':''}"><span>Écart Global :</span> <b>${totalEcart.toLocaleString()} Ar</b></div>
         </div>
         <p class="text-xs text-gray-500">Cette action fermera la session et archivera les soldes.</p>
      `,
      icon: totalEcart > 0 ? 'warning' : 'info', 
      showCancelButton: true, confirmButtonText: 'CLÔTURER DÉFINITIVEMENT', confirmButtonColor: '#d33'
    });

    if (isConfirmed && register) {
      const { error } = await supabase.from('cash_registers').update({
        status: 'CLOSED', closing_balance_global: totalPhysique, details_billetage: auditData, closing_date: new Date()
      }).eq('id', register.id);
      if (!error) {
        try {
          // debug: log dispatch action in browser console
          // eslint-disable-next-line no-console
          console.debug('[Cloture] dispatch econome:db-change (closeSession)');
          window.dispatchEvent(new CustomEvent('econome:db-change', { detail: { source: 'closeSession', table: 'cash_registers' } }));
        } catch (e) {
          // ignore in non-browser environments
        }
      }
      Swal.fire('Succès', 'Session clôturée avec succès.', 'success');
      setRegister(null);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="p-10 text-center text-xs text-gray-400 font-mono">CHARGEMENT DONNÉES...</div>;
  if (!register) return <div className="h-[calc(100vh-60px)] flex flex-col items-center justify-center text-gray-400 gap-2"><Lock size={32} className="opacity-20"/><p className="text-xs font-bold uppercase">Aucune session ouverte</p></div>;

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-100 p-2 text-xs font-sans overflow-hidden flex flex-col">
      
      {/* BARRE D'OUTILS COMPACTE */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-10 shrink-0">
          <div className="flex items-center gap-2">
              <Lock size={16} className="text-red-600"/>
              <span className="font-bold text-gray-700 uppercase tracking-tight">Audit de Clôture</span>
              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-green-200">SESSION #{register.id.substring(0,6).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
              <span>Ouvert le: {new Date(register.created_at).toLocaleDateString()}</span>
          </div>
      </div>

      {/* TABLEAU D'AUDIT (Sage Style) */}
      <div className="bg-white border border-gray-400 rounded shadow-sm flex flex-col mt-2 overflow-hidden flex-1 max-w-5xl mx-auto w-full">
          <div className="bg-gray-100 border-b border-gray-300 px-3 py-1.5 flex justify-between items-center shrink-0">
              <span className="font-bold text-gray-700 text-[10px] flex items-center gap-1"><Coins size={12}/> CONTRÔLE DES CAISSES</span>
          </div>
          
          <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-[11px] border-collapse">
                  <thead className="bg-gray-200 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm text-[10px]">
                      <tr>
                          <th className="p-2 border-r border-gray-300 text-left w-64">Compte / Caisse</th>
                          <th className="p-2 border-r border-gray-300 text-right w-32">Solde Système</th>
                          <th className="p-2 border-r border-gray-300 text-right w-40 bg-yellow-50">Solde Physique</th>
                          <th className="p-2 border-r border-gray-300 text-right w-32">Écart</th>
                          <th className="p-2 text-center w-10">État</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                      {auditData.map((r, i) => {
                          const isEspece = r.name.toLowerCase().includes('esp') || r.name.toLowerCase().includes('caisse');
                          return (
                              <tr key={r.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                  <td className="p-2 border-r border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                                      <span className="text-lg">{r.icon}</span> {r.name}
                                  </td>
                                  
                                  <td className="p-2 border-r border-gray-100 text-right text-gray-600 bg-gray-50/50">
                                      {r.systemBalance.toLocaleString()}
                                  </td>
                                  
                                  <td className="p-1 border-r border-gray-100 text-right bg-yellow-50/30">
                                      {isEspece ? (
                                          <div className="relative w-full">
                                              <input 
                                                  type="text" readOnly 
                                                  onClick={() => openBilletage(r)}
                                                  className="w-full border border-blue-200 rounded p-1 text-right font-bold text-blue-800 bg-white cursor-pointer hover:bg-blue-50 focus:ring-1 focus:ring-blue-400 h-7 text-[11px]"
                                                  value={r.realBalance.toLocaleString()} 
                                              />
                                              <button onClick={() => openBilletage(r)} className="absolute left-1 top-1 text-blue-400 hover:text-blue-600" title="Ouvrir Billetage">
                                                  <Calculator size={12}/>
                                              </button>
                                          </div>
                                      ) : (
                                          <input 
                                              type="number" 
                                              className={`w-full border rounded p-1 text-right font-bold h-7 text-[11px] outline-none focus:ring-1 focus:ring-blue-400 ${r.ecart !== 0 ? 'bg-white border-yellow-400 text-orange-700' : 'bg-white border-gray-300'}`}
                                              value={r.realBalance} 
                                              onChange={e => updateRealBalance(r.id, e.target.value)} 
                                          />
                                      )}
                                  </td>
                                  
                                  <td className={`p-2 border-r border-gray-100 text-right font-bold ${r.ecart === 0 ? 'text-gray-300' : (r.ecart < 0 ? 'text-red-600' : 'text-blue-600')}`}>
                                      {r.ecart > 0 ? '+' : ''}{r.ecart.toLocaleString()}
                                  </td>
                                  
                                  <td className="p-2 text-center">
                                      {r.ecart === 0 ? <CheckCircle size={14} className="text-green-500 mx-auto"/> : <AlertTriangle size={14} className="text-red-500 mx-auto animate-pulse"/>}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold border-t border-gray-300 text-[10px] uppercase">
                      <tr>
                          <td className="p-2 text-gray-600 text-right border-r border-gray-300">TOTAUX GÉNÉRAUX</td>
                          <td className="p-2 text-right text-gray-800 border-r border-gray-300">{auditData.reduce((a,b)=>a+b.systemBalance, 0).toLocaleString()} Ar</td>
                          <td className="p-2 text-right text-blue-800 border-r border-gray-300 bg-yellow-50">{auditData.reduce((a,b)=>a+b.realBalance, 0).toLocaleString()} Ar</td>
                          <td className={`p-2 text-right border-r border-gray-300 ${auditData.reduce((a,b)=>a+b.ecart, 0) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {auditData.reduce((a,b)=>a+b.ecart, 0).toLocaleString()} Ar
                          </td>
                          <td></td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      </div>

      <div className="mt-4 flex justify-end">
          <button onClick={handleClose} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded font-bold shadow flex items-center gap-2 text-[11px] uppercase tracking-wide transition-transform active:scale-95">
              <Save size={14}/> Valider et Clôturer la Session
          </button>
      </div>
    </div>
  );
}
