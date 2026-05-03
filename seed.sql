insert into academy.teams (name, member1_name, member2_name, avatar_emoji)
values
  ('Team Alpha', 'Élève 1', 'Élève 2', '🔥'),
  ('Team Beta', 'Élève 3', 'Élève 4', '⚡'),
  ('Team Gamma', 'Élève 5', 'Élève 6', '🚀'),
  ('Team Delta', 'Élève 7', 'Élève 8', '🌊'),
  ('Team Epsilon', 'Élève 9', 'Élève 10', '🎯'),
  ('Team Zeta', 'Élève 11', 'Élève 12', '💎')
on conflict (name) do nothing;

insert into academy.missions (code, title, description, persona, persona_scenario, prompt_windsurf, display_mode, order_index, is_locked, points_total)
values
  ('F2', 'Fondations produit', 'Comprendre le probleme, cadrer les utilisateurs et poser une premiere structure d app.', 'Mendel', 'Mendel, 45 ans, Lyon. Il cherche a suivre ses demandes sans se perdre dans des outils complexes.', '', 'all_visible', 1, false, 100),
  ('F3', 'Maquette et navigation', 'Construire les parcours principaux avec une navigation simple et fiable.', 'Sarah', 'Sarah, 32 ans, Marseille. Elle veut comprendre rapidement ou cliquer et ce qui a change.', '', 'all_visible', 2, true, 100),
  ('F4', 'Base de donnees', 'Modeliser les donnees essentielles de ChlouhIN dans Supabase.', 'Yossi', 'Yossi, 39 ans, Paris. Il veut des donnees propres, retrouvables et mises a jour en temps reel.', '', 'all_visible', 3, true, 100),
  ('F5', 'Authentification', 'Brancher les acces utilisateur et proteger les ecrans sensibles.', 'Sarah', 'Sarah revient tous les jours et veut retrouver son espace sans friction.', '', 'progressive', 4, true, 100),
  ('F6', 'Workflow metier', 'Transformer les idees en actions produit concretes et mesurables.', 'Mendel', 'Mendel veut voir l etat exact de chaque demande et savoir quoi faire ensuite.', '', 'sections', 5, true, 100),
  ('F7', 'Realtime', 'Ajouter les mises a jour live pour rendre l app collective.', 'Yossi', 'Yossi anime une equipe et veut voir les changements immediatement.', '', 'free', 6, true, 100),
  ('F8', 'Storage et preuves', 'Gerer les fichiers, captures et preuves utilisateur.', 'Mendel', 'Mendel doit partager des documents et retrouver les bonnes versions.', '', 'all_visible', 7, true, 100),
  ('F9', 'Qualite UI', 'Rendre l experience lisible, rapide et agreable sur mobile.', 'Sarah', 'Sarah utilise souvent son telephone et attend une interface nette.', '', 'all_visible', 8, true, 100),
  ('F10', 'Deploiement', 'Preparer Vercel, les variables d environnement et la livraison.', 'Yossi', 'Yossi veut une app stable consultable par toute l equipe.', '', 'all_visible', 9, true, 100),
  ('F11', 'Demo finale', 'Assembler, tester et presenter une version demo convaincante.', 'Mendel', 'Mendel doit comprendre la valeur du produit en moins de deux minutes.', '', 'all_visible', 10, true, 100)
on conflict (code) do nothing;

insert into academy.blocks (mission_id, type, title, content, order_index, points, is_blocking)
select id, 'theory', 'Cadrer la mission', 'Lire la mission, identifier l objectif utilisateur et preparer le plan d execution.', 1, 0, false
from academy.missions
where code in ('F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11')
on conflict do nothing;

insert into academy.blocks (mission_id, type, title, content, order_index, points, is_blocking)
select id, 'screenshot', 'Construire la fonctionnalite', 'Uploader une capture qui prouve que la fonctionnalite existe et fonctionne.', 2, 50, true
from academy.missions
where code in ('F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11')
on conflict do nothing;

insert into academy.blocks (mission_id, type, title, content, order_index, points, is_blocking)
select id, 'text_answer', 'Tester et expliquer', 'Decris en une phrase ce qui a ete teste et pourquoi c est valide.', 3, 20, true
from academy.missions
where code in ('F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11')
on conflict do nothing;
