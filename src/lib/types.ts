import type { Card as FsrsCard } from "ts-fsrs";

export type CardKind = "basic" | "cloze" | "qcm";

export interface QcmOption {
  text: string;
  correct: boolean;
}

export interface Course {
  id: string;
  title: string;
  ue: string;
  semester: string;
  fileName: string;
  createdAt: number;
  status: "pending" | "ready" | "active" | "error";
  error?: string;
  pageCount?: number;
}

export interface Chapter {
  id: string;
  courseId: string;
  order: number;
  title: string;
  /** Fiche de synthèse, en Markdown simple */
  summary: string;
  keyPoints: string[];
  mnemonics: string[];
}

export interface StudyCard {
  id: string;
  courseId: string;
  chapterId: string;
  kind: CardKind;
  front: string;
  back: string;
  /** QCM uniquement */
  options?: QcmOption[];
  qcmType?: "QRU" | "QRM";
  explanation?: string;
  sourcePage?: number;
  /** Etat FSRS sérialisé */
  fsrs: FsrsCard;
  /** Copie de fsrs.due en ms pour l'index */
  due: number;
  isNew: 0 | 1;
  suspended: 0 | 1;
  createdAt: number;
}

export interface ReviewEntry {
  id?: number;
  cardId: string;
  courseId: string;
  rating: number;
  at: number;
  /** jour local AAAA-MM-JJ */
  day: string;
  durationMs: number;
  xp: number;
}

export interface PageText {
  id?: number;
  courseId: string;
  page: number;
  text: string;
}

export interface StoredFile {
  courseId: string;
  blob: Blob;
  mediaType: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string; // AAAA-MM-JJ
  courseIds: string[];
}

export interface Profile {
  id: "me";
  firstName: string;
  dailyMinutes: number;
  newCardsPerDay: number;
  gamification: boolean;
  encouragements: string[];
  exams: Exam[];
  jokersUsed: { month: string; days: string[] };
  onboarded: boolean;
}
