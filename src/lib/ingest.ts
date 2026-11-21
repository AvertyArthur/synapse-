"use client";

import { db, uid } from "./db";
import { IS_DEMO } from "./demo";
import { newFsrsCard } from "./srs";
import type { Generation } from "./generation-schema";
import type { Chapter, Course, StudyCard } from "./types";

/** Au-delà, on envoie seulement le texte extrait (limite de taille des requêtes chez l'hébergeur) */
const MAX_BINARY_BYTES = 3 * 1024 * 1024;

export async function extractPdfPages(file: Blob): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    pages.push(
      tc.items
        .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
        .join("")
        .replace(/[ \t]+/g, " ")
        .trim(),
    );
  }
  return pages;
}

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function guessMediaType(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "md" || ext === "txt") return "text/plain";
  return "application/octet-stream";
}

export const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,image/*,text/plain";

/** Crée le cours, extrait le texte, appelle l'IA et enregistre le kit. Renvoie l'id du cours. */
export async function ingestFile(file: File, meta: { ue: string; semester: string }) {
  if (IS_DEMO) {
    throw new Error("Dans cette démo, l'IA n'est pas branchée : l'import de vrais cours marche dans la version en ligne. Essaie le cours d'exemple.");
  }
  const mediaType = guessMediaType(file);
  const courseId = uid();
  const course: Course = {
    id: courseId,
    title: file.name.replace(/\.[^.]+$/, ""),
    ue: meta.ue,
    semester: meta.semester,
    fileName: file.name,
    createdAt: Date.now(),
    status: "pending",
  };
  await db.courses.add(course);
  await db.files.put({ courseId, blob: file, mediaType });

  try {
    let pages: string[] = [];
    let text: string | undefined;
    if (mediaType === "application/pdf") {
      pages = await extractPdfPages(file);
    } else if (mediaType.startsWith("text/")) {
      text = await file.text();
      pages = [text];
    }
    if (pages.length) {
      await db.pages.bulkAdd(pages.map((t, i) => ({ courseId, page: i + 1, text: t })));
      await db.courses.update(courseId, { pageCount: pages.length });
    }

    let payload: Record<string, string>;
    if (mediaType === "application/pdf" && file.size > MAX_BINARY_BYTES) {
      // trop gros pour être envoyé tel quel : on envoie le texte, page par page
      payload = {
        mediaType: "text/plain",
        fileName: file.name,
        data: "",
        text: pages.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join("\n\n"),
      };
    } else if (mediaType.startsWith("text/")) {
      payload = { mediaType, fileName: file.name, data: "", text: text ?? "" };
    } else {
      payload = { mediaType, fileName: file.name, data: toBase64(await file.arrayBuffer()) };
    }

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
    if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
    await saveGeneration(courseId, json as Generation, meta);
    return courseId;
  } catch (e) {
    await db.courses.update(courseId, { status: "error", error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

export async function saveGeneration(courseId: string, gen: Generation, meta?: { ue?: string }) {
  const now = Date.now();
  const chapters: Chapter[] = [];
  const cards: StudyCard[] = [];
  gen.chapters.forEach((ch, order) => {
    const chapterId = uid();
    chapters.push({
      id: chapterId,
      courseId,
      order,
      title: ch.title,
      summary: ch.summary_markdown,
      keyPoints: ch.key_points,
      mnemonics: ch.mnemonics,
    });
    const base = (i: number) => {
      const fsrs = newFsrsCard(new Date(now));
      return { fsrs, due: fsrs.due.getTime(), isNew: 1 as const, suspended: 0 as const, createdAt: now + order * 1000 + i, courseId, chapterId };
    };
    ch.cards.forEach((c, i) =>
      cards.push({ id: uid(), kind: c.type, front: c.front, back: c.back, sourcePage: c.source_page, ...base(i) }),
    );
    ch.qcms.forEach((q, i) =>
      cards.push({
        id: uid(),
        kind: "qcm",
        qcmType: q.type,
        front: q.question,
        back: q.options.filter((o) => o.correct).map((o) => o.text).join(" ; "),
        options: q.options,
        explanation: q.explanation,
        sourcePage: q.source_page,
        ...base(500 + i),
      }),
    );
  });
  await db.transaction("rw", [db.courses, db.chapters, db.cards], async () => {
    await db.chapters.bulkAdd(chapters);
    await db.cards.bulkAdd(cards);
    const current = await db.courses.get(courseId);
    await db.courses.update(courseId, {
      status: "ready",
      title: gen.course_title || current?.title || "Cours",
      ue: meta?.ue || current?.ue || gen.suggested_ue,
      error: undefined,
    });
  });
}
