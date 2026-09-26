"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { signIn } from "@/lib/admin/session";
import { ROLE_LABELS } from "@/lib/labels";
import { staffUsers } from "@/lib/mock/catalog";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(staffUsers[0].id);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  return (
    <div className="grid min-h-dvh place-items-center bg-ink p-4">
      <form
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== "demo") return setError("Mot de passe incorrect (démo : « demo »).");
          signIn(userId);
          router.replace("/admin");
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold font-black text-ink">B</span>
          <div>
            <p className="font-extrabold">Bryan Admin</p>
            <p className="text-xs text-muted">Espace réservé au personnel</p>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Utilisateur (démo)" hint="Chaque profil a des permissions différentes (R12).">
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} — {ROLE_LABELS[u.roleId]}</option>
              ))}
            </select>
          </Field>
          <Field label="Mot de passe" error={error} hint="Démo : demo">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <Button type="submit" size="lg" className="w-full"><LockKeyhole className="size-4" /> Se connecter</Button>
        </div>
        <p className="mt-5 text-center text-xs text-muted">En production : Supabase Auth (e-mail + mot de passe, réinitialisation).</p>
      </form>
    </div>
  );
}
