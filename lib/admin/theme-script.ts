// Exécuté avant l'affichage de l'espace de gestion : évite un flash clair en mode sombre.
// (Même logique que lib/admin/theme.tsx — clé « bm-theme ».)
export const THEME_INIT_SCRIPT =
  'try{var p=localStorage.getItem("bm-theme");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}';
