"use client";

import { db } from "./db";

/** Ouvre le document original à la bonne page (PDF) dans un nouvel onglet */
export async function openSource(courseId: string, page: number) {
  const file = await db.files.get(courseId);
  if (!file) {
    alert(`Information tirée de la page ${page} du cours (document original non disponible sur cet appareil).`);
    return;
  }
  const url = URL.createObjectURL(file.blob);
  const target = file.mediaType === "application/pdf" ? `${url}#page=${page}` : url;
  window.open(target, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
