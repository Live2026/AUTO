import { expect, test, type Page } from "@playwright/test";
import { eventTypes, realisations, staffUsers, vehicles } from "../lib/mock/catalog";

// Vérification systématique : chaque page publique et chaque page d'admin pour chaque rôle.
// Critères : réponse HTTP 200, aucune erreur JavaScript, un titre de page, pas de débordement horizontal (mobile).

const PUBLIC = [
  "/", "/vehicules", "/vehicules?tab=promotions", "/vehicules?category=suv", "/location", "/location?chauffeur=avec", "/location?duree=longue",
  "/evenementiel", "/evenementiel/prestations", "/evenementiel/creer", "/realisations", "/a-propos", "/contact", "/reprise",
  "/favoris", "/mes-demandes", "/confidentialite", "/mentions-legales", "/hors-ligne", "/devis/demo-devis-mariage",
  ...vehicles.filter((v) => v.isForSale && v.status !== "draft").map((v) => `/vehicules/${v.slug}`),
  ...vehicles.filter((v) => v.isForRent && v.status === "available").map((v) => `/location/${v.slug}`),
  ...eventTypes.map((e) => `/evenementiel/${e.slug}`),
  ...realisations.map((r) => `/realisations/${r.slug}`),
];

const ADMIN = [
  "/admin", "/admin/crm", "/admin/crm/r-1", "/admin/crm/r-3", "/admin/rendez-vous", "/admin/contacts", "/admin/devis", "/admin/devis/q-1",
  "/admin/vehicules", "/admin/vehicules/veh-prado-2023", "/admin/vehicules/nouveau", "/admin/location", "/admin/chauffeurs",
  "/admin/evenementiel", "/admin/calendrier", "/admin/marketing", "/admin/medias", "/admin/analytics", "/admin/utilisateurs",
  "/admin/parametres", "/admin/profil",
];

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource.*(openstreetmap|tile)/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test("site public : toutes les pages", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const problems: string[] = [];
  for (const path of PUBLIC) {
    const res = await page.goto(path);
    if (res?.status() !== 200) problems.push(`${path} → HTTP ${res?.status()}`);
    await page.waitForLoadState("networkidle");
    if ((await page.locator("h1").count()) === 0) problems.push(`${path} → pas de titre h1`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${path} → débordement horizontal de ${overflow}px`);
    if (errors.length) problems.push(...errors.splice(0).map((e) => `${path} → ${e}`));
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("administration : toutes les pages pour chaque rôle", async ({ page }) => {
  test.setTimeout(600_000);
  page.setDefaultTimeout(10_000);
  const errors = watchErrors(page);
  const problems: string[] = [];
  for (const user of staffUsers) {
    await page.goto("/admin/login");
    await page.getByLabel("Utilisateur (démo)").selectOption(user.id);
    await page.getByLabel("Mot de passe").fill("demo");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/admin$/);
    for (const path of ADMIN) {
      const t0 = Date.now();
      const res = await page.goto(path);
      if (res?.status() !== 200) problems.push(`[${user.roleId}] ${path} → HTTP ${res?.status()}`);
      const ok = await page.locator("main").waitFor().then(() => true, () => false);
      if (!ok) {
        problems.push(`[${user.roleId}] ${path} → la page ne s'affiche pas (10 s)`);
        continue;
      }
      if (Date.now() - t0 > 4000) problems.push(`[${user.roleId}] ${path} → lent : ${Date.now() - t0} ms`);
      await page.waitForTimeout(150);
      const text = await page.locator("main").innerText();
      if (!text.trim()) problems.push(`[${user.roleId}] ${path} → page vide`);
      if (errors.length) problems.push(...errors.splice(0).map((e) => `[${user.roleId}] ${path} → ${e}`));
    }
    // Chaque lien du menu de ce rôle doit ouvrir une page autorisée
    const links = await page.locator("aside").first().getByRole("link").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!).filter((h) => h.startsWith("/admin/") && h !== "/admin/profil"));
    for (const href of links) {
      await page.goto(href);
      if (!(await page.locator("main").waitFor().then(() => true, () => false))) {
        problems.push(`[${user.roleId}] menu ${href} → la page ne s'affiche pas`);
        continue;
      }
      await page.waitForTimeout(150);
      if (await page.getByText("Accès non autorisé").isVisible()) problems.push(`[${user.roleId}] le menu propose ${href} mais l'accès est refusé`);
    }
    await page.evaluate(() => localStorage.removeItem("bm-admin-user"));
  }
  expect(problems, problems.join("\n")).toEqual([]);
});
