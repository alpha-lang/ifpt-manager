import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// On initialise le client Admin pour contourner les sécurités RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// --- 1. LISTER LES UTILISATEURS (Méthode GET) ---
export async function GET() {
  try {
    // A. Récupérer les profils ECONOME
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'ECONOME')
      .order('full_name', { ascending: true });

    if (profileError) throw new Error("Erreur Profils: " + profileError.message);

    // B. Récupérer les données Auth (pour savoir si banni)
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) throw new Error("Erreur Auth: " + authError.message);

    // C. Fusionner les données (Profil + Statut Actif/Banni)
    const combinedData = profiles.map(profile => {
      const authUser = users.find(u => u.id === profile.id);
      // Si banned_until est null ou dépassé, l'utilisateur est actif
      const isActive = !authUser?.banned_until || new Date(authUser.banned_until) < new Date();
      
      return {
        ...profile,
        is_active: isActive
      };
    });

    return NextResponse.json(combinedData);

  } catch (err: any) {
    console.error("Erreur API Users:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- 2. ACTIONS CRUD (Méthode POST) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, newData } = body; 

    if (!userId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    let message = "";

    switch (action) {
      // CAS A : ACTIVER / DÉSACTIVER
      case 'toggle_status':
        if (newData.is_active) {
          // Débannir
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
          message = "Utilisateur réactivé.";
        } else {
          // Bannir (100 ans)
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
          message = "Utilisateur bloqué.";
        }
        break;

      // CAS B : RESET PASSWORD
      case 'reset_password':
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: newData.newPassword });
        message = "Mot de passe modifié.";
        break;

      // CAS C : MODIFIER INFOS
      case 'update':
        // Update Auth (Email)
        await supabaseAdmin.auth.admin.updateUserById(userId, { email: newData.email });
        // Update Profile
        await supabaseAdmin.from('profiles')
          .update({ full_name: newData.full_name, email: newData.email })
          .eq('id', userId);
        message = "Informations mises à jour.";
        break;

      // CAS D : SUPPRIMER
      case 'delete':
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        message = "Utilisateur supprimé.";
        break;

      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message });

  } catch (err: any) {
    console.error("Erreur API Action:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}