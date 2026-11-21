"use client";

import { db } from "./db";

/** Ouvre le document original à la bonne page (PDF) dans un nouvel onglet. Renvoie false si l'original n'est pas sur l'appareil. */
export async function openSource(courseId: string, page: number) {
  const file = await db.files.get(courseId);
  if (!file) return false;
  const url = URL.createObjectURL(file.blob);
  const target = file.mediaType === "application/pdf" ? `${url}#page=${page}` : url;
  window.open(target, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
