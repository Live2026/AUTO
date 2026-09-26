-- =============================================================================
-- Données de référence indispensables (rôles, permissions, paramètres par défaut)
-- Les contenus réels (véhicules, services, textes) seront saisis via l'admin.
-- =============================================================================

insert into public.permissions (code, description) values
  ('*',                          'Accès total (administrateur)'),
  ('vehicles.write',             'Créer / modifier les véhicules, catégories, photos'),
  ('vehicles.internal',          'Voir / modifier les données internes (prix d''achat, VIN, immatriculation)'),
  ('rentals.write',              'Gérer tarifs, options et réservations de location'),
  ('drivers.write',              'Gérer les chauffeurs et leurs affectations'),
  ('events.write',               'Gérer types d''événements, services, packages, dossiers, réalisations'),
  ('quotes.read',                'Consulter tous les devis'),
  ('quotes.write',               'Créer, modifier et envoyer des devis'),
  ('crm.read_all',               'Voir toutes les demandes et contacts'),
  ('crm.write_all',              'Modifier toutes les demandes (affectation, statut)'),
  ('crm.write_own',              'Modifier les demandes qui me sont affectées'),
  ('appointments.write',         'Gérer les rendez-vous et essais'),
  ('marketing.write',            'Gérer promotions, bannières, QR codes'),
  ('media.write',                'Gérer la médiathèque'),
  ('analytics.read',             'Consulter les statistiques et le tableau de bord'),
  ('finance.read',               'Consulter chiffres d''affaires et exports'),
  ('settings.write',             'Modifier les paramètres de l''entreprise'),
  ('users.manage',               'Gérer les utilisateurs, rôles et permissions'),
  ('audit.read',                 'Consulter le journal d''audit'),
  ('notifications.new_requests', 'Recevoir les alertes de nouvelles demandes non affectées');

insert into public.roles (id, label, is_system) values
  ('admin',           'Administrateur',            true),
  ('manager_auto',    'Responsable automobile',    true),
  ('manager_rental',  'Responsable location',      true),
  ('manager_events',  'Responsable événementiel',  true),
  ('sales',           'Commercial',                true),
  ('accountant',      'Comptable',                 true),
  ('driver',          'Chauffeur',                 true);

insert into public.role_permissions (role_id, permission_code) values
  ('admin', '*'),

  ('manager_auto', 'vehicles.write'), ('manager_auto', 'vehicles.internal'),
  ('manager_auto', 'crm.read_all'),   ('manager_auto', 'crm.write_all'),
  ('manager_auto', 'appointments.write'), ('manager_auto', 'marketing.write'),
  ('manager_auto', 'media.write'),    ('manager_auto', 'quotes.write'),
  ('manager_auto', 'analytics.read'), ('manager_auto', 'notifications.new_requests'),

  ('manager_rental', 'rentals.write'), ('manager_rental', 'drivers.write'),
  ('manager_rental', 'crm.read_all'),  ('manager_rental', 'crm.write_all'),
  ('manager_rental', 'quotes.write'),  ('manager_rental', 'media.write'),
  ('manager_rental', 'analytics.read'), ('manager_rental', 'notifications.new_requests'),

  ('manager_events', 'events.write'),  ('manager_events', 'quotes.write'),
  ('manager_events', 'crm.read_all'),  ('manager_events', 'crm.write_all'),
  ('manager_events', 'drivers.write'), ('manager_events', 'media.write'),
  ('manager_events', 'marketing.write'), ('manager_events', 'analytics.read'),
  ('manager_events', 'notifications.new_requests'),

  ('sales', 'crm.write_own'), ('sales', 'appointments.write'),

  ('accountant', 'quotes.read'), ('accountant', 'finance.read'), ('accountant', 'analytics.read');
  -- 'driver' : aucune permission en MVP (accès planning en Phase 2)

insert into public.business_settings (key, value, is_public) values
  ('company',              '{"name": "BRYAN MULTISERVICES", "tagline": "Automobile • Location • Événementiel"}', true),
  ('contact_phones',       '{"default": "+242000000000", "sale": null, "rental": null, "event": null}', true),
  ('whatsapp_numbers',     '{"default": "+242000000000", "sale": null, "rental": null, "event": null}', true),
  ('social_links',         '{"facebook": null, "instagram": null, "tiktok": null}', true),
  ('whatsapp_templates',   '{
      "sale":   "Bonjour BRYAN MULTISERVICES, je suis intéressé par le véhicule {vehicule}, référence {reference}. Je souhaiterais avoir plus d''informations. {url}",
      "rental": "Bonjour BRYAN MULTISERVICES, je souhaite louer le véhicule {vehicule} pour la période du {date_debut} au {date_fin}.",
      "event":  "Bonjour BRYAN MULTISERVICES, je souhaite organiser un {type_evenement} et je voudrais obtenir un devis.",
      "request":"Bonjour BRYAN MULTISERVICES, je vous contacte au sujet de ma demande {reference}."
    }', true),
  ('rental_buffer_hours',  '2',  false),
  ('hold_duration_hours',  '24', false),
  ('quote_validity_days',  '15', false),
  ('quote_tax_rate',       '0',  false),
  ('sla_new_request_minutes', '30', false),
  ('default_assignees',    '{}', false),
  ('lost_reasons',         '["Prix", "Acheté ailleurs", "Injoignable", "Véhicule indisponible", "Autre"]', false);
