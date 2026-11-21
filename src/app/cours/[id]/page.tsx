"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { db, deleteCourse } from "@/lib/db";
import { mastery } from "@/lib/srs";
import { openSource } from "@/lib/source";
import Markdown from "@/components/Markdown";
import { Card, Meter, Page, btn } from "@/components/ui";
import { ExternalIcon, PencilIcon, PrintIcon, TrashIcon } from "@/components/Icons";
import type { StudyCard } from "@/lib/types";

type Tab = "fiches" | "cartes" | "qcm";

export default function CoursePageWrapper() {
  return (
    <Suspense>
      <CoursePage />
    </Suspense>
  );
}

function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const course = useLiveQuery(() => db.courses.get(id), [id]);
  const chapters = useLiveQuery(() => db.chapters.where("courseId").equals(id).sortBy("order"), [id]);
  const cards = useLiveQuery(() => db.cards.where("courseId").equals(id).toArray(), [id]);
  const [tab, setTab] = useState<Tab>("fiches");
  const page = search.get("page");

  useEffect(() => {
    if (page) openSource(id, Number(page));
  }, [id, page]);

  if (course === undefined) return null;
  if (!course) {
    return (
      <Page>
        <p>Ce cours n&apos;existe plus.</p>
        <Link href="/cours" className="font-semibold text-teal">Retour aux cours</Link>
      </Page>
    );
  }

  const flash = (cards ?? []).filter((c) => c.kind !== "qcm");
  const qcms = (cards ?? []).filter((c) => c.kind === "qcm");

  return (
    <Page>
      <div className="no-print">
        <Link href="/cours" className="text-sm font-semibold text-teal">← Mes cours</Link>
      </div>
      <header className="flex flex-col gap-1">
        <p className="text-xs font-bold tracking-wider text-teal uppercase">{[course.ue, course.semester].filter(Boolean).join(" · ") || "Sans UE"}</p>
        <h1 className="font-display text-[26px] leading-tight font-bold">{course.title}</h1>
        <p className="text-sm text-muted no-print">
          {chapters?.length ?? 0} chapitre{(chapters?.length ?? 0) > 1 ? "s" : ""} · {flash.length} cartes · {qcms.length} QCM
        </p>
      </header>

      {course.status === "error" && (
        <Card className="no-print border border-rose-200">
          <p className="font-semibold text-rose-900">La génération a échoué</p>
          <p className="text-sm">{course.error}</p>
          <button type="button" className={`${btn.ghost} mt-3`} onClick={async () => { await deleteCourse(id); router.push("/cours"); }}>
            Supprimer et réessayer
          </button>
        </Card>
      )}

      {course.status === "pending" && (
        <Card className="no-print"><p role="status">Analyse en cours… Le kit apparaîtra ici dans quelques minutes.</p></Card>
      )}

      {course.status === "ready" && (
        <Card className="no-print flex flex-col gap-3 bg-sky-50">
          <p className="font-semibold">Ton kit de révision est prêt</p>
          <p className="text-sm text-muted">Parcours les cartes, corrige ou supprime ce qui ne te plaît pas, puis active le paquet pour qu&apos;il entre dans tes sessions.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn.primary} onClick={() => db.courses.update(id, { status: "active" })}>Activer le paquet</button>
            <button type="button" className={btn.ghost} onClick={() => setTab("cartes")}>Vérifier les cartes</button>
          </div>
        </Card>
      )}

      {course.status === "active" && (
        <div className="no-print flex flex-wrap gap-2">
          <Link href={`/session?course=${id}`} className={btn.teal}>Réviser ce cours</Link>
          <button type="button" className={btn.ghost} onClick={() => window.print()}><PrintIcon size={18} /> Imprimer les fiches</button>
          <button type="button" className={btn.ghost} onClick={() => db.courses.update(id, { status: "ready" })}>Mettre en pause</button>
        </div>
      )}

      {(chapters?.length ?? 0) > 0 && (
        <div role="tablist" aria-label="Contenu du cours" className="no-print flex gap-1 rounded-xl bg-white p-1">
          {([
            ["fiches", "Fiches"],
            ["cartes", `Cartes (${flash.length})`],
            ["qcm", `QCM (${qcms.length})`],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${tab === t ? "bg-ink text-white" : "text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "fiches" &&
        chapters?.map((ch, i) => {
          const chCards = (cards ?? []).filter((c) => c.chapterId === ch.id);
          const m = mastery(chCards);
          return (
            <Card key={ch.id} className={`print-sheet ${i > 0 ? "print-break" : ""}`}>
              <div id={ch.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">{ch.title}</h2>
                  <span className="no-print shrink-0 text-sm font-semibold text-muted">{Math.round(m * 100)} %</span>
                </div>
                <div className="no-print"><Meter value={m} /></div>
                {ch.keyPoints.length > 0 && (
                  <div className="mt-2 rounded-xl bg-teal-tint p-3">
                    <p className="text-xs font-bold tracking-wider text-teal uppercase">À retenir</p>
                    <ul className="mt-1 list-disc pl-5 text-[15px]">{ch.keyPoints.map((k, j) => <li key={j}>{k}</li>)}</ul>
                  </div>
                )}
                <Markdown source={ch.summary} />
                {ch.mnemonics.length > 0 && (
                  <div className="rounded-xl bg-coral-tint p-3">
                    <p className="text-xs font-bold tracking-wider text-coral uppercase">Moyens mnémotechniques</p>
                    <ul className="mt-1 list-disc pl-5 text-[15px]">{ch.mnemonics.map((k, j) => <li key={j}>{k}</li>)}</ul>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

      {tab !== "fiches" && (
        <div className="flex flex-col gap-2">
          {(tab === "cartes" ? flash : qcms)
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((c) => <CardRow key={c.id} card={c} chapterTitle={chapters?.find((ch) => ch.id === c.chapterId)?.title} />)}
        </div>
      )}

      <div className="no-print mt-4 border-t border-line pt-4">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-rose-700"
          onClick={async () => {
            if (confirm("Supprimer ce cours, ses cartes et son historique ?")) {
              await deleteCourse(id);
              router.push("/cours");
            }
          }}
        >
          <TrashIcon size={16} /> Supprimer ce cours
        </button>
      </div>
    </Page>
  );
}

function CardRow({ card, chapterTitle }: { card: StudyCard; chapterTitle?: string }) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.kind === "qcm" ? card.explanation ?? "" : card.back);

  return (
    <article className={`rounded-2xl bg-white p-4 ${card.suspended ? "opacity-60" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate font-semibold">
          {card.kind === "qcm" ? card.qcmType : card.kind === "cloze" ? "Texte à trous" : "Question"} · {chapterTitle}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {card.sourcePage ? (
            <button type="button" onClick={() => openSource(card.courseId, card.sourcePage!)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold text-teal hover:bg-teal-tint">
              <ExternalIcon size={14} /> p. {card.sourcePage}
            </button>
          ) : null}
          <button type="button" aria-label="Modifier" onClick={() => setEditing((v) => !v)} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-ground"><PencilIcon size={16} /></button>
          <button type="button" aria-label="Supprimer la carte" onClick={() => db.cards.delete(card.id)} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-ground"><TrashIcon size={16} /></button>
        </div>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold">
            {card.kind === "qcm" ? "Question" : "Recto"}
            <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-[15px] font-normal" />
          </label>
          <label className="text-xs font-semibold">
            {card.kind === "qcm" ? "Correction" : "Verso"}
            <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-[15px] font-normal" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn.teal}
              onClick={async () => {
                await db.cards.update(card.id, card.kind === "qcm" ? { front, explanation: back } : { front, back });
                setEditing(false);
              }}
            >
              Enregistrer
            </button>
            <button type="button" className={btn.ghost} onClick={() => db.cards.update(card.id, { suspended: card.suspended ? 0 : 1 })}>
              {card.suspended ? "Réactiver" : "Mettre de côté"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="font-semibold">{card.kind === "cloze" ? card.front.replace(/\{\{[^}]*\}\}/g, "[…]") : card.front}</p>
          {card.kind === "qcm" ? (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {card.options?.map((o, i) => (
                <li key={i} className={o.correct ? "font-semibold text-teal" : "text-muted"}>
                  {o.correct ? "✓" : "✗"} {o.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[15px] text-muted">{card.back}</p>
          )}
        </>
      )}
    </article>
  );
}
