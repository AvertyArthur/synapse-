import Dexie, { type EntityTable } from "dexie";
import type { Chapter, Course, PageText, Profile, ReviewEntry, StoredFile, StudyCard } from "./types";

export class SynapseDB extends Dexie {
  courses!: EntityTable<Course, "id">;
  chapters!: EntityTable<Chapter, "id">;
  cards!: EntityTable<StudyCard, "id">;
  reviews!: EntityTable<ReviewEntry, "id">;
  pages!: EntityTable<PageText, "id">;
  files!: EntityTable<StoredFile, "courseId">;
  profile!: EntityTable<Profile, "id">;

  constructor() {
    super("synapse");
    this.version(1).stores({
      courses: "id, ue, createdAt, status",
      chapters: "id, courseId, order",
      cards: "id, courseId, chapterId, due, isNew, suspended, kind",
      reviews: "++id, cardId, courseId, day, at",
      pages: "++id, courseId, page",
      files: "courseId",
      profile: "id",
    });
  }
}

export const db = new SynapseDB();

export const DEFAULT_PROFILE: Profile = {
  id: "me",
  firstName: "Jade",
  dailyMinutes: 30,
  newCardsPerDay: 20,
  gamification: true,
  encouragements: [],
  exams: [],
  jokersUsed: { month: "", days: [] },
  onboarded: false,
};

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get("me");
  return p ?? DEFAULT_PROFILE;
}

export async function saveProfile(patch: Partial<Profile>) {
  const current = await getProfile();
  await db.profile.put({ ...current, ...patch, id: "me" });
}

export function uid() {
  return crypto.randomUUID();
}

export function localDay(d: Date | number = new Date()) {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export async function deleteCourse(courseId: string) {
  await db.transaction("rw", [db.courses, db.chapters, db.cards, db.reviews, db.pages, db.files], async () => {
    await db.courses.delete(courseId);
    await db.chapters.where("courseId").equals(courseId).delete();
    await db.cards.where("courseId").equals(courseId).delete();
    await db.reviews.where("courseId").equals(courseId).delete();
    await db.pages.where("courseId").equals(courseId).delete();
    await db.files.delete(courseId);
  });
}

/** Sauvegarde complète (hors fichiers) pour changer d'appareil */
export async function exportBackup() {
  const [courses, chapters, cards, reviews, profile] = await Promise.all([
    db.courses.toArray(),
    db.chapters.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.profile.toArray(),
  ]);
  return { app: "synapse", version: 1, exportedAt: new Date().toISOString(), courses, chapters, cards, reviews, profile };
}

export async function importBackup(data: Awaited<ReturnType<typeof exportBackup>>) {
  if (data?.app !== "synapse") throw new Error("Ce fichier n'est pas une sauvegarde Synapse.");
  await db.transaction("rw", [db.courses, db.chapters, db.cards, db.reviews, db.profile], async () => {
    await db.courses.bulkPut(data.courses);
    await db.chapters.bulkPut(data.chapters);
    await db.cards.bulkPut(
      data.cards.map((c) => ({
        ...c,
        fsrs: { ...c.fsrs, due: new Date(c.fsrs.due), last_review: c.fsrs.last_review ? new Date(c.fsrs.last_review) : undefined },
      })),
    );
    await db.reviews.bulkPut(data.reviews);
    if (data.profile[0]) await db.profile.put(data.profile[0]);
  });
}
