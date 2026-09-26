import { expect, test, type Page } from "@playwright/test";

// Administration — écran d'ordinateur.
test.use({ viewport: { width: 1366, height: 860 }, isMobile: false, hasTouch: false });

/** Date locale (yyyy-mm-dd) dans le fuseau du navigateur de test (Africa/Brazzaville), à J+offset. */
function day(offset: number) {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Brazzaville", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

async function login(page: Page, user?: string) {
  await page.goto("/admin/login");
  if (user) await page.getByLabel("Utilisateur (démo)").selectOption(user);
  await page.getByLabel("Mot de passe").fill("demo");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("tableau de bord : nom et rôle de l'administrateur en haut, boîte de réception", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bryan Nkounkou");
  await expect(page.getByText("Super administrateur").first()).toBeVisible();
  await expect(page.getByText("Boîte de réception — dernières demandes reçues")).toBeVisible();
});

test("le super administrateur reçoit en direct une demande envoyée depuis le site", async ({ page, context }) => {
  await login(page);
  const client = await context.newPage();
  await client.goto("/vehicules/hyundai-tucson-2023");
  await client.getByRole("button", { name: "Je suis intéressé" }).click();
  const dialog = client.getByRole("dialog");
  await dialog.getByLabel("Nom et prénom").fill("Client Direct");
  await dialog.getByLabel("Téléphone").fill("06 777 88 99");
  await dialog.getByText("J'accepte que BRYAN MULTISERVICES").click();
  await dialog.getByRole("button", { name: "Envoyer ma demande" }).click();
  const ref = (await dialog.locator(".font-mono").first().textContent())!.trim();
  await page.bringToFront();
  const toast = page.locator("[aria-live=assertive]");
  await expect(toast.getByText(`Nouvelle demande ${ref}`)).toBeVisible({ timeout: 10_000 });
  await expect(toast.getByText("Client : Client Direct")).toBeVisible();
  await expect(page.getByRole("link", { name: /Demandes \(\d+\)|Demandes/ }).first()).toBeVisible();
});

test("barre latérale repliable, menu profil et gros bouton de déconnexion", async ({ page }) => {
  await login(page);
  const sidebar = page.locator("aside").first();
  await expect(sidebar.getByText("Tableau de bord")).toBeVisible();
  await sidebar.getByRole("button", { name: "Replier la barre latérale" }).click();
  await expect(sidebar.getByText("Tableau de bord")).toBeHidden();
  await expect(sidebar.getByRole("link", { name: "Tableau de bord" })).toBeVisible();
  await page.reload();
  await expect(page.locator("aside").first().getByText("Tableau de bord")).toBeHidden();
  await page.locator("aside").first().getByRole("button", { name: "Déplier la barre latérale" }).click();

  await page.getByRole("button", { name: "Menu du profil" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText("admin@bryan.cg")).toBeVisible();
  await menu.getByRole("menuitem", { name: /Mon profil/ }).click();
  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible();

  await page.locator("aside").first().getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("rendez-vous : un essai planifié bloque le véhicule, les conflits sont refusés", async ({ page, context }) => {
  const client = await context.newPage();
  await client.goto("/vehicules/hyundai-tucson-2023");
  await client.getByRole("button", { name: "Essai" }).click();
  const dialog = client.getByRole("dialog");
  await dialog.getByLabel("Nom et prénom").fill("Essai Client");
  await dialog.getByLabel("Téléphone").fill("06 111 22 33");
  await dialog.getByText("J'accepte que BRYAN MULTISERVICES").click();
  await dialog.getByRole("button", { name: "Demander un essai" }).click();
  await expect(dialog.getByText("Demande enregistrée")).toBeVisible();
  await client.close();

  await login(page);
  await page.goto("/admin/rendez-vous");
  await page.locator("div.card > div").filter({ hasText: "Essai Client" }).getByRole("button", { name: "Planifier", exact: true }).click();
  const plan = page.getByRole("dialog");
  // Créneau déjà pris par l'essai de démonstration (demain 10h–11h) → refus
  await plan.getByLabel("Date et heure").fill(`${day(1)}T10:30`);
  await plan.getByRole("button", { name: "Confirmer le rendez-vous" }).click();
  await expect(plan.getByText("Ce véhicule est déjà occupé sur cette période.")).toBeVisible();
  await plan.getByLabel("Date et heure").fill(`${day(2)}T15:00`);
  await plan.getByRole("button", { name: "Confirmer le rendez-vous" }).click();
  await expect(plan).toBeHidden();
  await page.getByRole("button", { name: /À venir/ }).click();
  await expect(page.getByText("Essai Client").first()).toBeVisible();
});

test("marketing : une bannière créée apparaît sur l'accueil", async ({ page }) => {
  await login(page);
  await page.goto("/admin/marketing");
  await page.getByRole("button", { name: /Bannières/ }).click();
  await page.getByRole("button", { name: "Nouvelle bannière" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Titre", { exact: true }).fill("Offre spéciale Toussaint");
  await dialog.getByLabel("Lien").fill("/vehicules");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Offre spéciale Toussaint")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Offre spéciale Toussaint")).toBeVisible();
});

test("paramètres : inviter un employé puis se connecter avec son compte", async ({ page }) => {
  await login(page);
  await page.goto("/admin/parametres");
  await page.getByRole("button", { name: /Utilisateurs/ }).click();
  await page.getByRole("button", { name: "Inviter un employé" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom complet").fill("Nadia Commerciale");
  await dialog.getByLabel("E-mail (identifiant de connexion)").fill("nadia@bryan.cg");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Nadia Commerciale")).toBeVisible();
  await page.locator("aside").first().getByRole("button", { name: "Se déconnecter" }).click();
  await page.getByLabel("Utilisateur (démo)").selectOption({ label: "Nadia Commerciale — Commercial" });
  await page.getByLabel("Mot de passe").fill("demo");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nadia Commerciale");
  await expect(page.locator("aside").first().getByText("Véhicules & catégories")).toBeHidden();
});
