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

test("connexion : e-mail, erreur, affichage du mot de passe, mot de passe oublié", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByLabel("E-mail professionnel")).toHaveValue("admin@bryan.cg");
  await page.getByLabel("Mot de passe").fill("faux");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou mot de passe incorrect." })).toBeVisible();
  await page.getByRole("button", { name: "Afficher la saisie" }).click();
  await expect(page.getByLabel("Mot de passe")).toHaveAttribute("type", "text");

  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez vos e-mails" })).toBeVisible();
  await page.getByRole("button", { name: "Retour à la connexion" }).click();

  await page.getByLabel("E-mail professionnel").fill("AUTO@bryan.cg");
  await page.getByLabel("Mot de passe").fill("demo");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Christelle Moukala");
});

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

test("utilisateurs : le super admin ajoute un responsable événementiel qui se connecte avec ses droits", async ({ page }) => {
  await login(page);
  await page.locator("aside").first().getByRole("link", { name: "Utilisateurs" }).click();
  await expect(page.getByRole("heading", { name: "Utilisateurs" })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter un utilisateur" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Continuer" }).click();
  await expect(dialog.getByText("Indiquez le nom complet")).toBeVisible();
  await dialog.getByLabel("Nom complet").fill("Nadia Événements");
  await dialog.getByLabel("E-mail (identifiant de connexion)").fill("nadia@bryan.cg");
  await dialog.getByLabel("Téléphone / WhatsApp").fill("06 999 00 11");
  await dialog.getByRole("button", { name: "Continuer" }).click();
  await dialog.getByRole("button", { name: /Responsable événementiel/ }).click();
  await dialog.getByRole("button", { name: "Continuer" }).click();
  await dialog.getByRole("button", { name: "Ajouter l'utilisateur" }).click();
  await expect(dialog.getByRole("heading", { name: "Utilisateur ajouté" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Par WhatsApp/ })).toHaveAttribute("href", /wa\.me\/242069990011/);
  await dialog.getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByText("Nadia Événements")).toBeVisible();

  // e-mail déjà utilisé → refus
  await page.getByRole("button", { name: "Ajouter un utilisateur" }).first().click();
  await dialog.getByLabel("Nom complet").fill("Doublon");
  await dialog.getByLabel("E-mail (identifiant de connexion)").fill("nadia@bryan.cg");
  await dialog.getByRole("button", { name: "Continuer" }).click();
  await dialog.getByRole("button", { name: "Continuer" }).click();
  await dialog.getByRole("button", { name: "Ajouter l'utilisateur" }).click();
  await expect(dialog.getByText("Cet e-mail est déjà utilisé par un autre employé.")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("aside").first().getByRole("button", { name: "Se déconnecter" }).click();
  await page.getByLabel("Utilisateur (démo)").selectOption({ label: "Nadia Événements — Responsable événementiel" });
  await page.getByLabel("Mot de passe").fill("demo");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nadia Événements");
  const nav = page.locator("aside").first();
  await expect(nav.getByRole("link", { name: "Événementiel", exact: true })).toBeVisible();
  await expect(nav.getByText("Véhicules & catégories")).toBeHidden();
  await expect(nav.getByText("Utilisateurs", { exact: true })).toBeHidden();
});

test("utilisateurs : un responsable ne peut pas gérer les utilisateurs", async ({ page }) => {
  await login(page, "u-auto");
  await page.goto("/admin/utilisateurs");
  await expect(page.getByText("Accès non autorisé")).toBeVisible();
});

test("journal d'activité : connexions, échecs et détail des changements (qui a fait quoi)", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Mot de passe").fill("mauvais");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await login(page);

  // Une modification d'utilisateur par le super admin : visible avec l'avant / après
  await page.goto("/admin/utilisateurs");
  await page.getByText("Junior Batchi").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Modifier" }).click();
  await dialog.getByLabel("Fonction").fill("Commercial senior");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog.getByText("Utilisateur enregistré ✓")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/admin/journal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Journal d'activité");
  const today = page.locator("section").filter({ has: page.getByRole("heading", { name: "Aujourd'hui" }) });
  await expect(today.getByText("Connexion de Bryan Nkounkou")).toBeVisible();
  await expect(today.getByText("Tentative de connexion échouée")).toBeVisible();
  const row = today.getByRole("listitem").filter({ hasText: "Utilisateur modifié : Junior Batchi" });
  await row.getByRole("button", { name: /changement/ }).click();
  await expect(row.getByText("Commercial senior")).toBeVisible();

  await page.getByLabel("Type d'action").selectOption("login_failed");
  await expect(page.getByText("Connexion de Bryan Nkounkou")).toHaveCount(0);
  await expect(page.getByText("Tentative de connexion échouée").first()).toBeVisible();
});

test("thème : clair / sombre / auto depuis le menu du profil, mémorisé", async ({ page }) => {
  await login(page);
  const html = page.locator("html");
  await page.getByRole("button", { name: "Menu du profil" }).click();
  await page.getByRole("radio", { name: "Sombre" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.goto("/admin/profil");
  await page.getByRole("radio", { name: "Clair" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  // Le site public reste en clair
  await page.getByRole("radio", { name: "Sombre" }).click();
  await page.goto("/");
  await expect(html).not.toHaveAttribute("data-theme", "dark");
});
