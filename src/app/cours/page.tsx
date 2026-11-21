"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";
import { ACCEPTED, ingestFile } from "@/lib/ingest";
import { loadSample } from "@/lib/sample";
import { Card, Page, PageHeader, btn } from "@/components/ui";
import { CameraIcon, ChevronIcon, SearchIcon, UploadIcon } from "@/components/Icons";
import type { Course } from "@/lib/types";

const STATUS: Record<Course["status"], { label: string; cls: string }> = {
  pending: { label: "Analyse en cours", cls: "bg-amber-100 text-amber-900" },
  ready: { label: "À vérifier", cls: "bg-sky-100 text-sky-900" },
  active: { label: "Actif", cls: "bg-teal-tint text-teal" },
  error: { label: "Erreur", cls: "bg-rose-100 text-rose-900" },
};

export default function CoursPage() {
  const courses = useLiveQuery(() => db.courses.orderBy("createdAt").reverse().toArray(), []);
  const counts = useLiveQuery(async () => {
    const all = await db.cards.toArray();
    const m = new Map<string, { flash: number; qcm: number }>();
    for (const c of all) {
      const e = m.get(c.courseId) ?? { flash: 0, qcm: 0 };
      if (c.kind === "qcm") e.qcm++;
      else e.flash++;
      m.set(c.courseId, e);
    }
    return m;
  }, []);
  const [ue, setUe] = useState("");
  const [semester, setSemester] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const ues = useMemo(() => [...new Set((courses ?? []).map((c) => c.ue).filter(Boolean))].sort(), [courses]);
  const grouped = useMemo(() => {
    const g = new Map<string, Course[]>();
    for (const c of courses ?? []) {
      const k = c.ue || "Sans UE";
      g.set(k, [...(g.get(k) ?? []), c]);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [courses]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files)) {
      setBusy(file.name);
      try {
        await ingestFile(file, { ue: ue.trim(), semester: semester.trim() });
      } catch (e) {
        setError(`${file.name} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
  }

  return (
    <Page>
      <PageHeader title="Mes cours" subtitle="Rangés par UE. Chaque cours devient un kit de révision." />

      <Card className="flex flex-col gap-3">
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-400 p-5 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
          <UploadIcon className="text-teal" size={30} />
          <p className="font-semibold">Glisse un PDF, des diapos exportées en PDF ou tes notes</p>
          <p className="text-[13px] text-muted">PDF, images (photo de poly), texte. Pour un PowerPoint, exporte-le d&apos;abord en PDF.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={btn.teal} disabled={!!busy} onClick={() => fileRef.current?.click()}>
              <UploadIcon size={18} /> Importer un fichier
            </button>
            <button type="button" className={btn.ghost} disabled={!!busy} onClick={() => camRef.current?.click()}>
              <CameraIcon size={18} /> Prendre en photo
            </button>
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED} multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            UE (facultatif)
            <input list="ue-list" value={ue} onChange={(e) => setUe(e.target.value)} placeholder="ex. Cardiologie" className="min-h-11 rounded-xl border border-slate-300 px-3 text-base font-normal" />
            <datalist id="ue-list">{ues.map((u) => <option key={u} value={u} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            Semestre (facultatif)
            <input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="ex. S1" className="min-h-11 rounded-xl border border-slate-300 px-3 text-base font-normal" />
          </label>
        </div>
        {busy && (
          <div role="status" className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm">
            <span className="size-4 animate-spin rounded-full border-2 border-teal border-t-transparent" aria-hidden />
            <span><strong>{busy}</strong> : l&apos;IA lit le cours et prépare les cartes. Compte 1 à 3 minutes, garde la page ouverte.</span>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        {courses?.length === 0 && (
          <button type="button" className="text-sm font-semibold text-teal underline" onClick={() => loadSample()}>
            Essayer avec un cours d&apos;exemple
          </button>
        )}
      </Card>

      {(courses?.length ?? 0) > 0 && (
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <SearchIcon size={18} className="text-muted" />
          <span className="sr-only">Rechercher dans tous les cours</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans tous mes cours (ex. amiodarone)" className="min-h-11 flex-1 bg-transparent outline-none" />
        </label>
      )}

      {query.trim().length >= 2 ? (
        <SearchResults query={query.trim()} courses={courses ?? []} />
      ) : (
        grouped.map(([group, list]) => (
          <section key={group} className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-bold tracking-wider text-muted uppercase">{group}</h2>
            {list.map((c) => {
              const n = counts?.get(c.id);
              return (
                <Link key={c.id} href={`/cours/${c.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 hover:bg-white/70">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.title}</p>
                    <p className="text-[13px] text-muted">
                      {c.semester && `${c.semester} · `}
                      {n ? `${n.flash} cartes · ${n.qcm} QCM` : c.status === "error" ? c.error : "…"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                  <ChevronIcon size={18} className="text-muted" />
                </Link>
              );
            })}
          </section>
        ))
      )}
    </Page>
  );
}

function SearchResults({ query, courses }: { query: string; courses: Course[] }) {
  const results = useLiveQuery(async () => {
    const q = query.toLocaleLowerCase("fr");
    const norm = (s: string) => s.toLocaleLowerCase("fr");
    const pages = (await db.pages.toArray()).filter((p) => norm(p.text).includes(q)).slice(0, 30);
    const cards = (await db.cards.toArray()).filter((c) => norm(c.front + " " + c.back).includes(q)).slice(0, 30);
    return { pages, cards };
  }, [query]);
  const title = (id: string) => courses.find((c) => c.id === id)?.title ?? "Cours";
  if (!results) return null;
  const snippet = (text: string) => {
    const i = text.toLocaleLowerCase("fr").indexOf(query.toLocaleLowerCase("fr"));
    const start = Math.max(0, i - 60);
    return (start > 0 ? "…" : "") + text.slice(start, i + query.length + 90) + "…";
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-sm text-muted">
        {results.pages.length} passage{results.pages.length > 1 ? "s" : ""} dans les cours, {results.cards.length} carte{results.cards.length > 1 ? "s" : ""}
      </p>
      {results.pages.map((p) => (
        <Link key={p.id} href={`/cours/${p.courseId}?page=${p.page}`} className="rounded-2xl bg-white p-4">
          <p className="text-xs font-semibold text-teal">{title(p.courseId)} · page {p.page}</p>
          <p className="mt-1 text-sm">{snippet(p.text)}</p>
        </Link>
      ))}
      {results.cards.map((c) => (
        <Link key={c.id} href={`/cours/${c.courseId}`} className="rounded-2xl bg-white p-4">
          <p className="text-xs font-semibold text-teal">{title(c.courseId)} · {c.kind === "qcm" ? "QCM" : "carte"}</p>
          <p className="mt-1 text-sm font-semibold">{c.front}</p>
          <p className="text-sm text-muted">{c.back}</p>
        </Link>
      ))}
    </div>
  );
}
