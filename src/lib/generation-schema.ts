import { z } from "zod";

export const CardSchema = z.object({
  type: z.enum(["basic", "cloze"]),
  front: z.string().describe("Question (basic) ou phrase avec le trou noté {{...}} (cloze)"),
  back: z.string().describe("Réponse courte et exacte, tirée du cours"),
  source_page: z.number().int().describe("Numéro de page ou de diapo du document où se trouve l'information"),
});

export const QcmSchema = z.object({
  type: z.enum(["QRU", "QRM"]),
  question: z.string(),
  options: z
    .array(z.object({ text: z.string(), correct: z.boolean() }))
    .describe("5 propositions, comme aux EDN"),
  explanation: z.string().describe("Correction : pourquoi chaque proposition est juste ou fausse, d'après le cours"),
  source_page: z.number().int(),
});

export const ChapterSchema = z.object({
  title: z.string(),
  summary_markdown: z
    .string()
    .describe("Fiche de synthèse du chapitre en Markdown : titres ###, listes, gras pour les notions clés"),
  key_points: z.array(z.string()).describe("Les 3 à 8 points à retenir absolument"),
  mnemonics: z.array(z.string()).describe("Moyens mnémotechniques utiles pour les listes à connaître, s'il y en a"),
  cards: z.array(CardSchema),
  qcms: z.array(QcmSchema),
});

export const GenerationSchema = z.object({
  course_title: z.string(),
  suggested_ue: z.string().describe("Discipline ou UE probable, ex. Cardiologie, Pharmacologie, Anatomie"),
  chapters: z.array(ChapterSchema),
});

export type Generation = z.infer<typeof GenerationSchema>;
