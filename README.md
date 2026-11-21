# Synapse

Application de révision pour les études de médecine. On dépose un cours (PDF, photo de polycopié, notes) et l'app prépare un kit de révision : flashcards, QCM au format EDN et fiches de synthèse, puis planifie les révisions avec la répétition espacée.

## Ce que fait le MVP

- **Dépôt de cours** : PDF, images, texte. Rangement par UE et semestre. Le texte est extrait pour la recherche.
- **Génération IA** (API Claude) : chapitres, fiches de synthèse, points à retenir, mnémotechniques, flashcards (question ou texte à trous) et QCM QRU/QRM avec correction. Chaque élément cite la page du cours d'origine, et l'IA a pour consigne de ne rien ajouter qui ne figure pas dans le cours.
- **Vérification avant activation** : on relit, corrige, met de côté ou supprime les cartes avant qu'elles entrent dans les sessions.
- **Session du jour** : cartes dues puis nouvelles cartes, sujets mélangés, algorithme FSRS (le même qu'Anki), note de confiance avant la réponse, QCM corrigés proposition par proposition, lien « voir dans le cours ».
- **Sprint QCM** : 10 questions au hasard, sans modifier le planning.
- **Fiches** : lecture, impression ou export PDF depuis le navigateur.
- **Recherche** dans tous les cours et toutes les cartes.
- **Progression et gamification** : série de jours avec jokers, XP, grades (Carabin, Externe, Interne…), maîtrise par UE, calendrier, badges, mots d'encouragement, compte à rebours avant l'examen.
- **Hors connexion** : toutes les données restent sur l'appareil (IndexedDB). Installable sur l'écran d'accueil (PWA). Sauvegarde et restauration en JSON dans les réglages.

Sans clé API, l'app fonctionne quand même : un cours d'exemple (insuffisance cardiaque) permet de tout essayer.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis colle ta clé API Anthropic dedans
npm run dev
```

Ouvre http://localhost:3000.

## Mettre en ligne (Vercel)

1. Sur [vercel.com](https://vercel.com), importe ce dépôt GitHub.
2. Dans *Settings › Environment Variables*, ajoute `ANTHROPIC_API_KEY` (clé créée sur [console.anthropic.com](https://console.anthropic.com)).
3. Déploie, puis ouvre le site sur le téléphone et choisis « Ajouter à l'écran d'accueil ».

La génération d'un cours prend 1 à 3 minutes : la route `/api/generate` demande jusqu'à 300 secondes, ce qu'accepte l'offre gratuite de Vercel avec Fluid Compute. Les PDF de plus de 3 Mo sont envoyés sous forme de texte extrait page par page, pour rester sous la limite de taille des requêtes.

## Architecture

| Dossier | Rôle |
| --- | --- |
| `src/app` | Écrans : accueil, cours, détail d'un cours, session, progression, réglages |
| `src/app/api/generate` | Seule partie serveur : appelle Claude avec le cours et renvoie un JSON validé |
| `src/lib/db.ts` | Base locale IndexedDB (Dexie) |
| `src/lib/srs.ts` | Répétition espacée (ts-fsrs), file du jour, maîtrise |
| `src/lib/ingest.ts` | Extraction du PDF (pdf.js), appel de la génération, enregistrement |
| `src/lib/gamification.ts` | XP, grades, série, badges |
| `src/lib/generation-schema.ts` | Schéma de sortie de l'IA |

## Pour la suite

Dossiers cliniques progressifs, schémas à légender, planning jusqu'au jour J, tuteur IA sur les cours, synchronisation entre appareils (Supabase), export Anki.
