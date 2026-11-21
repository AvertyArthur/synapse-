import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import { db, localDay } from "./db";
import type { StudyCard } from "./types";
import { xpForReview } from "./gamification";

export const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

export { Rating, State };
export type { Grade };

export function newFsrsCard(now = new Date()): Card {
  return createEmptyCard(now);
}

function hydrate(card: Card): Card {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

/** Délais affichés sous chaque bouton (« 10 min », « 3 j »...) */
export function previewIntervals(card: StudyCard, now = new Date()): Record<Grade, string> {
  const preview = scheduler.repeat(hydrate(card.fsrs), now);
  const out = {} as Record<Grade, string>;
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[g] = formatDelay(preview[g].card.due.getTime() - now.getTime());
  }
  return out;
}

export function formatDelay(ms: number) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} j`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mois`;
  return `${(d / 365).toFixed(1)} an${d >= 730 ? "s" : ""}`;
}

export async function gradeCard(card: StudyCard, grade: Grade, durationMs: number) {
  const now = new Date();
  const { card: next } = scheduler.next(hydrate(card.fsrs), now, grade);
  const xp = xpForReview(card, grade);
  await db.transaction("rw", [db.cards, db.reviews], async () => {
    await db.cards.update(card.id, { fsrs: next, due: next.due.getTime(), isNew: 0 });
    await db.reviews.add({
      cardId: card.id,
      courseId: card.courseId,
      rating: grade,
      at: now.getTime(),
      day: localDay(now),
      durationMs,
      xp,
    });
  });
  return { next, xp };
}

/** Probabilité de se souvenir de la carte maintenant (0 à 1) */
export function retrievability(card: StudyCard, now = new Date()) {
  if (card.isNew) return 0;
  return scheduler.get_retrievability(hydrate(card.fsrs), now, false);
}

/** Stabilité (en jours) à partir de laquelle une carte est considérée comme ancrée */
export const MATURE_DAYS = 21;

/**
 * Maîtrise d'une carte : probabilité de rappel aujourd'hui, pondérée par sa solidité.
 * Une carte vue pour la première fois ce matin est fraîche (rappel ~100 %) mais pas encore ancrée :
 * elle ne compte qu'à hauteur de sa stabilité / 21 jours.
 */
export function cardMastery(card: StudyCard, now = new Date()) {
  if (card.isNew) return 0;
  return retrievability(card, now) * Math.min(1, card.fsrs.stability / MATURE_DAYS);
}

/** Maîtrise d'un ensemble de cartes (0 à 1), cartes nouvelles comptées à 0 */
export function mastery(cards: StudyCard[], now = new Date()) {
  const active = cards.filter((c) => !c.suspended);
  if (!active.length) return 0;
  return active.reduce((s, c) => s + cardMastery(c, now), 0) / active.length;
}

export interface SessionPlan {
  due: StudyCard[];
  fresh: StudyCard[];
  estimatedMinutes: number;
}

/**
 * File du jour : cartes dues d'abord (les plus en retard en premier),
 * puis des nouvelles cartes dans la limite quotidienne, en mélangeant les cours.
 */
export async function buildSessionPlan(newPerDay: number, courseId?: string): Promise<SessionPlan> {
  const now = Date.now();
  const activeCourses = new Set((await db.courses.where("status").equals("active").toArray()).map((c) => c.id));
  const inScope = (c: StudyCard) => !c.suspended && activeCourses.has(c.courseId) && (!courseId || c.courseId === courseId);

  const due = (await db.cards.where("due").belowOrEqual(now).toArray()).filter((c) => inScope(c) && !c.isNew);
  due.sort((a, b) => a.due - b.due);

  const today = localDay();
  const introducedToday = new Set(
    (await db.reviews.where("day").equals(today).toArray()).map((r) => r.cardId),
  );
  const newIntroducedToday = (await db.cards.bulkGet([...introducedToday]))
    .filter((c): c is StudyCard => !!c)
    .filter((c) => c.fsrs.reps <= 1).length;
  const remainingNew = Math.max(0, newPerDay - newIntroducedToday);

  const allNew = (await db.cards.where("isNew").equals(1).toArray()).filter(inScope);
  allNew.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const fresh = interleave(allNew).slice(0, remainingNew);

  const seconds = due.reduce((s, c) => s + (c.kind === "qcm" ? 45 : 12), 0) + fresh.reduce((s, c) => s + (c.kind === "qcm" ? 60 : 25), 0);
  return { due, fresh, estimatedMinutes: Math.max(due.length + fresh.length ? 1 : 0, Math.round(seconds / 60)) };
}

/** Alterne les cours pour mélanger les sujets (entrelacement) tout en gardant l'ordre interne */
function interleave(cards: StudyCard[]) {
  const byCourse = new Map<string, StudyCard[]>();
  for (const c of cards) {
    const list = byCourse.get(c.courseId) ?? [];
    list.push(c);
    byCourse.set(c.courseId, list);
  }
  const queues = [...byCourse.values()];
  const out: StudyCard[] = [];
  let i = 0;
  while (queues.some((q) => q.length)) {
    const q = queues[i % queues.length];
    const c = q.shift();
    if (c) out.push(c);
    i++;
  }
  return out;
}

/** Mélange les cartes dues et nouvelles : une nouvelle toutes les 3 cartes */
export function mixQueue(plan: SessionPlan) {
  const out: StudyCard[] = [];
  const due = [...plan.due];
  const fresh = [...plan.fresh];
  while (due.length || fresh.length) {
    for (let k = 0; k < 3 && due.length; k++) out.push(due.shift()!);
    if (fresh.length) out.push(fresh.shift()!);
  }
  return out;
}

/** Entraînement libre (sprint) : compte pour l'XP et la série, sans toucher au planning de la carte */
export async function logPractice(card: StudyCard, grade: Grade, durationMs: number) {
  const now = new Date();
  const xp = Math.round(xpForReview(card, grade) / 2);
  await db.reviews.add({ cardId: card.id, courseId: card.courseId, rating: grade, at: now.getTime(), day: localDay(now), durationMs, xp });
  return { xp };
}

export async function buildSprint(size = 10) {
  const active = new Set((await db.courses.where("status").equals("active").toArray()).map((c) => c.id));
  const qcms = (await db.cards.where("kind").equals("qcm").toArray()).filter((c) => active.has(c.courseId) && !c.suspended);
  for (let i = qcms.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [qcms[i], qcms[j]] = [qcms[j], qcms[i]];
  }
  return qcms.slice(0, size);
}

/** Note automatique d'un QCM : tout juste = Bien, une erreur = Difficile, sinon À revoir */
export function gradeQcm(card: StudyCard, picked: Set<number>): { grade: Grade; errors: number } {
  const errors = (card.options ?? []).reduce((n, o, i) => n + (o.correct !== picked.has(i) ? 1 : 0), 0);
  const grade = errors === 0 ? Rating.Good : errors === 1 ? Rating.Hard : Rating.Again;
  return { grade: grade as Grade, errors };
}
