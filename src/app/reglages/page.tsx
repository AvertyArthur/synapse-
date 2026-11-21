"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db, exportBackup, importBackup, localDay, saveProfile, uid } from "@/lib/db";
import { jokersLeft } from "@/lib/gamification";
import { useProfile } from "@/lib/hooks";
import { IS_DEMO } from "@/lib/demo";
import { Card, Page, PageHeader, btn } from "@/components/ui";
import { TrashIcon } from "@/components/Icons";

const input = "min-h-11 rounded-xl border border-slate-300 px-3 text-base font-normal";

export default function ReglagesPage() {
  const profile = useProfile();
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const [message, setMessage] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examCourses, setExamCourses] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localDay(d);
  })();

  return (
    <Page>
      <PageHeader title="Réglages" />

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Profil et rythme</h2>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Prénom
          <input className={input} value={profile.firstName} onChange={(e) => saveProfile({ firstName: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Minutes par jour
            <input type="number" min={5} max={180} className={input} value={profile.dailyMinutes} onChange={(e) => saveProfile({ dailyMinutes: Number(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Nouvelles cartes par jour
            <input type="number" min={0} max={200} className={input} value={profile.newCardsPerDay} onChange={(e) => saveProfile({ newCardsPerDay: Number(e.target.value) })} />
          </label>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
          Gamification (série, XP, grades, badges)
          <input type="checkbox" className="size-5 accent-teal" checked={profile.gamification} onChange={(e) => saveProfile({ gamification: e.target.checked })} />
        </label>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Examens</h2>
        <p className="text-sm text-muted">L&apos;accueil affiche le compte à rebours et les chapitres les plus fragiles du prochain examen.</p>
        {profile.exams.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-ground p-3">
            <div>
              <p className="font-semibold">{e.name}</p>
              <p className="text-xs text-muted">{new Date(e.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {e.courseIds.length || "tous les"} cours</p>
            </div>
            <button type="button" aria-label={`Supprimer ${e.name}`} className="flex size-10 items-center justify-center rounded-lg hover:bg-line" onClick={() => saveProfile({ exams: profile.exams.filter((x) => x.id !== e.id) })}>
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={input} placeholder="ex. Partiel de cardiologie" value={examName} onChange={(e) => setExamName(e.target.value)} aria-label="Nom de l'examen" />
          <input className={input} type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} aria-label="Date de l'examen" />
        </div>
        {(courses?.length ?? 0) > 0 && (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-xs font-semibold text-muted">Cours concernés (aucun coché = tous)</legend>
            {courses!.map((c) => (
              <label key={c.id} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ground px-3 text-sm">
                <input type="checkbox" className="accent-teal" checked={examCourses.includes(c.id)} onChange={(e) => setExamCourses((l) => (e.target.checked ? [...l, c.id] : l.filter((x) => x !== c.id)))} />
                {c.title}
              </label>
            ))}
          </fieldset>
        )}
        <button
          type="button"
          className={btn.teal}
          disabled={!examName.trim() || !examDate}
          onClick={async () => {
            await saveProfile({ exams: [...profile.exams, { id: uid(), name: examName.trim(), date: examDate, courseIds: examCourses }] });
            setExamName("");
            setExamDate("");
            setExamCourses([]);
          }}
        >
          Ajouter l&apos;examen
        </button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Mots d&apos;encouragement</h2>
        <p className="text-sm text-muted">Écrits par Arthur. Un message différent s&apos;affiche chaque jour sur l&apos;accueil.</p>
        {profile.encouragements.map((m, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-coral-tint p-3 text-sm">
            <span>{m}</span>
            <button type="button" aria-label="Supprimer ce message" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/60" onClick={() => saveProfile({ encouragements: profile.encouragements.filter((_, j) => j !== i) })}>
              <TrashIcon size={15} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input className={`${input} flex-1`} placeholder="Un petit mot pour Jade…" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Nouveau message" />
          <button type="button" className={btn.teal} disabled={!message.trim()} onClick={async () => { await saveProfile({ encouragements: [...profile.encouragements, message.trim()] }); setMessage(""); }}>
            Ajouter
          </button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Jokers de série</h2>
        <p className="text-sm text-muted">Une garde, un partiel, un jour off : un joker protège la série. {jokersLeft(profile)} restant{jokersLeft(profile) > 1 ? "s" : ""} ce mois-ci.</p>
        <button
          type="button"
          className={btn.ghost}
          disabled={jokersLeft(profile) === 0 || profile.jokersUsed.days.includes(yesterday)}
          onClick={() => {
            const month = localDay().slice(0, 7);
            const days = profile.jokersUsed.month === month ? profile.jokersUsed.days : [];
            saveProfile({ jokersUsed: { month, days: [...days, yesterday] } });
          }}
        >
          Utiliser un joker pour hier
        </button>
      </Card>

      {!IS_DEMO && <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Sauvegarde</h2>
        <p className="text-sm text-muted">Tout est enregistré sur cet appareil. Exporte une sauvegarde de temps en temps, ou pour passer sur un autre appareil (les PDF originaux ne sont pas inclus).</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn.ghost}
            onClick={async () => {
              const data = await exportBackup();
              const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = `synapse-sauvegarde-${localDay()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exporter
          </button>
          <button type="button" className={btn.ghost} onClick={() => importRef.current?.click()}>Importer</button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                await importBackup(JSON.parse(await f.text()));
                setNotice("Sauvegarde importée.");
              } catch (err) {
                setNotice(err instanceof Error ? err.message : "Import impossible.");
              }
            }}
          />
        </div>
        {notice && <p role="status" className="text-sm font-semibold text-teal">{notice}</p>}
      </Card>}
    </Page>
  );
}
