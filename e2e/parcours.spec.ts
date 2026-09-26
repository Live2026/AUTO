import { expect, test, type Page } from "@playwright/test";

// Parcours clés (docs/06 — recette) sur mobile, avec les données de démonstration.

function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fillContact(page: Page, scope = page.locator("body")) {
  await scope.getByLabel("Nom et prénom").fill("Test Client");
  await scope.getByLabel("Téléphone").fill("06 555 44 33");
  await scope.getByText("J'accepte que BRYAN MULTISERVICES").click();
}

async function login(page: Page, user = "admin") {
  await page.goto("/admin/login");
  if (user !== "admin") await page.getByLabel("Utilisateur (démo)").selectOption(user);
  await page.getByLabel("Mot de passe").fill("demo");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("accueil : identité et 3 actions principales", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("BRYAN");
  for (const label of ["Acheter un véhicule", "Louer un véhicule", "Organiser un événement"]) {
    await expect(page.getByRole("link", { name: new RegExp(label) })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Nous écrire sur WhatsApp" })).toHaveAttribute("href", /wa\.me\/242/);
});

test("demande d'intérêt véhicule → référence SALE → visible dans le CRM", async ({ page }) => {
  await page.goto("/vehicules/toyota-rav4-2022");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Toyota RAV4 2022");
  await page.getByRole("button", { name: "Je suis intéressé" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(dialog.getByText("Indiquez votre nom")).toBeVisible();
  await fillContact(page, dialog);
  await dialog.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(dialog.getByText("Demande enregistrée")).toBeVisible();
  const reference = (await dialog.locator(".font-mono").first().textContent())!.trim();
  expect(reference).toMatch(/^SALE-\d{4}-\d{5}$/);

  await login(page);
  await page.goto("/admin/crm");
  await page.getByPlaceholder("Référence, nom, téléphone, véhicule…").fill(reference);
  await page.getByRole("link", { name: reference }).first().click();
  await expect(page.getByRole("heading", { name: reference })).toBeVisible();
  await expect(page.getByText("Test Client").first()).toBeVisible();
});

test("location : disponibilité par dates et estimation (R3/R5)", async ({ page }) => {
  await page.goto("/location/toyota-land-cruiser-prado-2023");
  const form = page.locator("form").filter({ hasText: "Estimation indicative" });
  await form.getByLabel("Départ").fill(day(1));
  await form.getByLabel("Retour").fill(day(2));
  await expect(form.getByText("Indisponible")).toBeVisible();
  await form.getByLabel("Départ").fill(day(20));
  await form.getByLabel("Retour").fill(day(29));
  await expect(form.getByText("Disponible", { exact: true })).toBeVisible();
  await expect(form.getByText("1 semaine")).toBeVisible();
});

test("assistant « Créer mon événement » → référence EVENT", async ({ page }) => {
  await page.goto("/evenementiel/creer");
  await page.getByRole("button", { name: "Mariage" }).click();
  await page.getByLabel("Date de l'événement").fill(day(40));
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Ville").selectOption("Pointe-Noire");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "150", exact: true }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: /^Voiture des mariés/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Je ne sais pas encore" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await fillContact(page);
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("✓ Voiture des mariés")).toBeVisible();
  await page.getByRole("button", { name: "Demander mon devis" }).click();
  await expect(page.getByText("Demande enregistrée")).toBeVisible();
  await expect(page.locator(".font-mono").first()).toHaveText(/^EVENT-\d{4}-\d{5}$/);
});

test("devis sans compte : acceptation en ligne (R7)", async ({ page }) => {
  await page.goto("/devis/demo-devis-mariage");
  await expect(page.getByText(/QUOTE-\d{4}-\d{5}/).first()).toBeVisible();
  await page.getByRole("button", { name: "Accepter le devis" }).click();
  await page.getByLabel("Votre nom complet").fill("Marie Mabiala");
  await page.getByText(/J'accepte le devis/).click();
  await page.getByRole("button", { name: "Confirmer l'acceptation" }).click();
  await expect(page.getByText("Devis accepté")).toBeVisible();
});

test("admin : double réservation refusée (anti-chevauchement)", async ({ page }) => {
  await login(page);
  await page.goto("/admin/calendrier");
  await page.getByRole("button", { name: "Nouvelle occupation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Véhicule").selectOption({ label: "Toyota Land Cruiser Prado 2023 — BM-V-1031" });
  await dialog.getByLabel("Début").fill(`${day(1)}T09:00`);
  await dialog.getByLabel("Fin").fill(`${day(2)}T18:00`);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog.getByText("Ce véhicule est déjà occupé sur cette période.")).toBeVisible();
});

test("permissions : un commercial n'accède pas à la gestion des véhicules", async ({ page }) => {
  await login(page, "u-sales");
  await page.goto("/admin/vehicules");
  await expect(page.getByText("Accès non autorisé")).toBeVisible();
});

test("CRM : changement de statut et note mis à jour en direct (historique R6)", async ({ page }) => {
  await login(page);
  await page.goto("/admin/crm");
  await page.getByRole("link", { name: /SALE-\d{4}-00001/ }).first().click();
  await page.getByRole("button", { name: "Contactée", exact: true }).click();
  await expect(page.getByText("Statut : Nouvelle → Contactée")).toBeVisible();
  await page.getByPlaceholder("Ajouter une note…").fill("Client rappelé, visite samedi");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Client rappelé, visite samedi")).toBeVisible();
});
