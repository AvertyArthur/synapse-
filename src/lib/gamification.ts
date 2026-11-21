import { Rating, type Grade } from "ts-fsrs";
import type { Profile, ReviewEntry, StudyCard } from "./types";
import { localDay } from "./db";

export const GRADES = [
  { name: "Carabin", xp: 0 },
  { name: "Externe", xp: 1000 },
  { name: "Interne", xp: 3500 },
  { name: "Docteur junior", xp: 8000 },
  { name: "Chef de clinique", xp: 15000 },
  { name: "PU-PH", xp: 30000 },
];

export function xpForReview(card: StudyCard, grade: Grade) {
  const base = card.kind === "qcm" ? 15 : 10;
  if (grade === Rating.Again) return 2;
  if (grade === Rating.Hard) return Math.round(base * 0.8);
  // bonus sur les cartes déjà ratées : on récompense ce qui était difficile
  const bonus = card.fsrs.lapses > 0 ? 5 : 0;
  return base + bonus;
}

export function gradeFor(xp: number) {
  let idx = 0;
  GRADES.forEach((g, i) => {
    if (xp >= g.xp) idx = i;
  });
  const current = GRADES[idx];
  const next = GRADES[idx + 1];
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { current, next, progress, level: idx + 1 };
}

export const JOKERS_PER_MONTH = 2;

/**
 * Série de jours consécutifs. Un jour compte s'il a au moins une révision,
 * ou s'il a été couvert par un joker. Aujourd'hui ne casse pas la série tant qu'il n'est pas fini.
 */
export function computeStreak(reviews: ReviewEntry[], profile: Profile, now = new Date()) {
  const days = new Set(reviews.map((r) => r.day));
  for (const d of profile.jokersUsed.days) days.add(d);
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function jokersLeft(profile: Profile, now = new Date()) {
  const month = localDay(now).slice(0, 7);
  if (profile.jokersUsed.month !== month) return JOKERS_PER_MONTH;
  return Math.max(0, JOKERS_PER_MONTH - profile.jokersUsed.days.length);
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

export function computeBadges(opts: {
  totalReviews: number;
  bestStreak: number;
  masteredChapters: number;
  perfectQcmSessions: number;
}): Badge[] {
  return [
    { id: "first", name: "Premiers pas", description: "Faire sa première révision", earned: opts.totalReviews >= 1 },
    { id: "100", name: "Centurion", description: "100 révisions", earned: opts.totalReviews >= 100 },
    { id: "1000", name: "Marathon", description: "1 000 révisions", earned: opts.totalReviews >= 1000 },
    { id: "streak7", name: "Une semaine", description: "7 jours de suite", earned: opts.bestStreak >= 7 },
    { id: "streak30", name: "Un mois", description: "30 jours de suite", earned: opts.bestStreak >= 30 },
    { id: "chapter", name: "Chapitre maîtrisé", description: "Un chapitre au-dessus de 80 %", earned: opts.masteredChapters >= 1 },
  ];
}

export function bestStreak(reviews: ReviewEntry[]) {
  const days = [...new Set(reviews.map((r) => r.day))].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = new Date(d + "T12:00:00");
    if (prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 18) return "Bonjour";
  return "Bonsoir";
}
