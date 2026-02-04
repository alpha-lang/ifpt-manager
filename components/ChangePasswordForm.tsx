'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Save, Eye, EyeOff, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      Swal.fire('Sécurité', 'Le mot de passe doit contenir au moins 6 caractères.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      Swal.fire('Erreur', 'Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
      
      Toast.fire({
        icon: 'success',
        title: 'Mot de passe mis à jour'
      });
      
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Swal.fire('Erreur', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden max-w-lg mx-auto font-sans text-xs">
      {/* HEADER COMPACT STYLE SAGE */}
      <div className="bg-gray-100 border-b border-gray-300 p-2 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-blue-600" />
          <span className="font-bold text-gray-700 uppercase tracking-tight">Sécurité & Authentification</span>
        </div>
        <span className="text-[9px] text-gray-400 font-mono">ID_SECURE_AUTH</span>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* NOUVEAU MOT DE PASSE */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nouveau mot de passe</label>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center border-r border-gray-200 text-gray-400 bg-gray-50 rounded-l">
                <Lock size={14} />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded bg-white focus:border-blue-500 focus:ring-0 outline-none font-bold text-gray-700 transition-all"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          {/* CONFIRMATION */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Confirmer la saisie</label>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center border-r border-gray-200 text-gray-400 bg-gray-50 rounded-l">
                <CheckCircle size={14} />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                required
                className={`w-full pl-10 pr-4 py-2 border rounded outline-none transition-all font-bold text-gray-700 ${
                  confirmPassword && newPassword !== confirmPassword 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-gray-300 bg-white focus:border-blue-500'
                }`}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[9px] text-red-600 mt-1 flex items-center gap-1 font-bold italic animate-pulse">
                <AlertTriangle size={10}/> Les saisies ne correspondent pas
              </p>
            )}
          </div>

          {/* NOTE DE SÉCURITÉ */}
          <div className="bg-blue-50 border border-blue-100 p-2 rounded">
            <p className="text-[9px] text-blue-700 leading-tight">
              <b>Note :</b> Le mot de passe doit comporter au moins 6 caractères techniques. 
              Évitez les suites simples (123456).
            </p>
          </div>

          {/* BOUTON DE VALIDATION */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading || (confirmPassword !== '' && newPassword !== confirmPassword)}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded shadow-[0_2px_0_rgb(29,78,216)] transition-all active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  TRAITEMENT...
                </span>
              ) : (
                <>
                  <Save size={14} /> 
                  Appliquer les modifications
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* FOOTER DISCRET */}
      <div className="bg-gray-50 border-t border-gray-200 p-1.5 text-center">
        <p className="text-[8px] text-gray-400 uppercase font-bold tracking-widest">Protocol Secure_Update_v2</p>
      </div>
    </div>
  );
}
