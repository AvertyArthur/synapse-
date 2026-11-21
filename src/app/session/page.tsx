"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getProfile } from "@/lib/db";
import { buildSessionPlan, buildSprint, gradeCard, gradeQcm, logPractice, mixQueue, previewIntervals, Rating, type Grade } from "@/lib/srs";
import { openSource } from "@/lib/source";
import { btn } from "@/components/ui";
import { CloseIcon, ExternalIcon } from "@/components/Icons";
import type { StudyCard } from "@/lib/types";

export default function SessionWrapper() {
  return (
    <Suspense>
      <Session />
    </Suspense>
  );
}

const GRADE_BUTTONS: { grade: Grade; label: string; cls: string }[] = [
  { grade: Rating.Again as Grade, label: "À revoir", cls: "bg-rose-100 text-rose-900" },
  { grade: Rating.Hard as Grade, label: "Difficile", cls: "bg-amber-100 text-amber-900" },
  { grade: Rating.Good as Grade, label: "Bien", cls: "bg-emerald-100 text-emerald-900" },
  { grade: Rating.Easy as Grade, label: "Facile", cls: "bg-blue-100 text-blue-900" },
];

function Session() {
  const params = useSearchParams();
  const sprint = params.get("mode") === "sprint";
  const courseId = params.get("course") ?? undefined;
  const [queue, setQueue] = useState<StudyCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ done: 0, good: 0, xp: 0, combo: 0, bestCombo: 0 });
  const startRef = useRef(Date.now());
  const requeued = useRef(new Map<string, number>());

  useEffect(() => {
    (async () => {
      if (sprint) {
        setQueue(await buildSprint(10));
      } else {
        const profile = await getProfile();
        setQueue(mixQueue(await buildSessionPlan(profile.newCardsPerDay, courseId)));
      }
    })();
  }, [sprint, courseId]);

  const card = queue?.[index];

  const submit = useCallback(
    async (grade: Grade) => {
      if (!card || !queue) return;
      const duration = Date.now() - startRef.current;
      const { xp } = sprint ? await logPractice(card, grade, duration) : await gradeCard(card, grade, duration);
      const ok = grade >= Rating.Good;
      setStats((s) => {
        const combo = ok ? s.combo + 1 : 0;
        return { done: s.done + 1, good: s.good + (ok ? 1 : 0), xp: s.xp + xp, combo, bestCombo: Math.max(s.bestCombo, combo) };
      });
      // une carte ratée revient en fin de session (deux fois au plus)
      const times = requeued.current.get(card.id) ?? 0;
      if (!sprint && grade === Rating.Again && times < 2) {
        requeued.current.set(card.id, times + 1);
        const { db } = await import("@/lib/db");
        const fresh = await db.cards.get(card.id);
        if (fresh) setQueue((q) => [...(q ?? []), fresh]);
      }
      startRef.current = Date.now();
      setIndex((i) => i + 1);
    },
    [card, queue, sprint],
  );

  if (!queue) return <div className="p-8 text-center text-muted">Préparation de la session…</div>;

  const total = queue.length;
  if (!card) return <Summary stats={stats} empty={total === 0} sprint={sprint} />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 pt-5 pb-6">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Quitter la session" className="flex size-11 items-center justify-center rounded-xl bg-white">
          <CloseIcon size={20} />
        </Link>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-teal transition-all" style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span className="text-[13px] font-semibold text-muted">{index + 1} / {total}</span>
        {stats.combo >= 3 && <span className="rounded-full bg-coral-tint px-2.5 py-1 text-[13px] font-bold text-coral">×{stats.combo}</span>}
      </div>
      {card.kind === "qcm" ? <QcmView key={`${card.id}-${index}`} card={card} onDone={submit} /> : <FlashView key={`${card.id}-${index}`} card={card} onDone={submit} sprint={sprint} />}
    </div>
  );
}

function SourceLink({ card }: { card: StudyCard }) {
  if (!card.sourcePage) return null;
  return (
    <button type="button" onClick={() => openSource(card.courseId, card.sourcePage!)} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-teal">
      <ExternalIcon size={15} /> Voir dans le cours, page {card.sourcePage}
    </button>
  );
}

function renderCloze(text: string, reveal: boolean) {
  const parts = text.split(/(\{\{[^}]*\}\})/g);
  return parts.map((p, i) =>
    p.startsWith("{{") ? (
      <span key={i} className={`mx-0.5 rounded-md px-1.5 ${reveal ? "bg-teal-tint text-teal" : "bg-line text-transparent"}`}>{reveal ? null : "______"}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function FlashView({ card, onDone, sprint }: { card: StudyCard; onDone: (g: Grade) => void; sprint: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const intervals = previewIntervals(card);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        onDone(Number(e.key) as Grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, onDone]);

  return (
    <>
      <article className="flex flex-1 flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold text-muted">{card.isNew ? "Nouvelle carte" : "À revoir"}</p>
        <p className="font-display text-[22px] leading-snug font-semibold">
          {card.kind === "cloze" ? renderCloze(card.front, false) : card.front}
        </p>
        {revealed && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-[17px] leading-relaxed whitespace-pre-line">{card.back}</p>
            <SourceLink card={card} />
          </div>
        )}
      </article>
      {!revealed ? (
        <div className="flex flex-col gap-2">
          <p className="text-center text-[13px] text-muted">Ta confiance avant de voir la réponse</p>
          <div className="grid grid-cols-3 gap-2">
            {["Aucune idée", "Je crois", "Sûre"].map((label, i) => (
              <button key={label} type="button" aria-pressed={confidence === i} onClick={() => setConfidence(i)} className={`min-h-11 rounded-xl border text-[13px] font-medium ${confidence === i ? "border-teal bg-teal-tint text-teal" : "border-slate-300 bg-white"}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={btn.primary + " min-h-14"} onClick={() => setRevealed(true)}>Afficher la réponse</button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {GRADE_BUTTONS.map((b) => (
            <button key={b.grade} type="button" onClick={() => onDone(b.grade)} className={`flex min-h-14 flex-col items-center justify-center rounded-2xl ${b.cls}`}>
              <span className="text-sm font-bold">{b.label}</span>
              {!sprint && <span className="text-[11px]">{intervals[b.grade]}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function QcmView({ card, onDone }: { card: StudyCard; onDone: (g: Grade) => void }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const result = checked ? gradeQcm(card, picked) : null;
  const single = card.qcmType === "QRU";

  const toggle = (i: number) => {
    if (checked) return;
    setPicked((p) => {
      const n = new Set(single ? [] : p);
      if (p.has(i) && !single) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  return (
    <>
      <article className="flex flex-1 flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex justify-between text-xs">
          <span className="font-bold text-teal">{card.qcmType}</span>
          <span className="text-muted">{single ? "Une seule réponse juste" : "Plusieurs réponses possibles"}</span>
        </div>
        <p className="font-display text-lg leading-snug font-semibold">{card.front}</p>
        <div className="flex flex-col gap-2" role={single ? "radiogroup" : "group"}>
          {card.options?.map((o, i) => {
            const on = picked.has(i);
            let cls = on ? "border-teal bg-teal-tint" : "border-slate-300 bg-white";
            let verdict = "";
            if (checked) {
              if (o.correct && on) { cls = "border-emerald-600 bg-emerald-50"; verdict = "Juste"; }
              else if (o.correct && !on) { cls = "border-amber-600 bg-amber-50"; verdict = "Oublié"; }
              else if (!o.correct && on) { cls = "border-rose-600 bg-rose-50"; verdict = "Faux"; }
            }
            return (
              <button key={i} type="button" role={single ? "radio" : "checkbox"} aria-checked={on} onClick={() => toggle(i)} className={`flex min-h-11 items-center gap-3 rounded-xl border-[1.5px] px-3 py-2 text-left text-[15px] ${cls}`}>
                <span className={`flex size-5 shrink-0 items-center justify-center border-[1.5px] text-xs font-bold text-white ${single ? "rounded-full" : "rounded-md"} ${on ? "border-teal bg-teal" : "border-slate-400"}`}>{on ? "✓" : ""}</span>
                <span className="flex-1">{o.text}</span>
                {verdict && <span className="text-xs font-bold">{verdict}</span>}
              </button>
            );
          })}
        </div>
        {checked && (
          <div className="flex flex-col gap-1 rounded-xl bg-teal-tint p-3 text-sm leading-relaxed">
            <p className="font-bold">{result!.errors === 0 ? "Parfait !" : result!.errors === 1 ? "Presque : une discordance" : `${result!.errors} discordances`}</p>
            <p>{card.explanation}</p>
            <SourceLink card={card} />
          </div>
        )}
      </article>
      {!checked ? (
        <button type="button" disabled={picked.size === 0} onClick={() => setChecked(true)} className={btn.mint + " min-h-14"}>Valider ma réponse</button>
      ) : (
        <button type="button" onClick={() => onDone(result!.grade)} className={btn.primary + " min-h-14"}>Suivant</button>
      )}
    </>
  );
}

function Summary({ stats, empty, sprint }: { stats: { done: number; good: number; xp: number; bestCombo: number }; empty: boolean; sprint: boolean }) {
  const rate = stats.done ? Math.round((stats.good / stats.done) * 100) : 0;
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-4 py-8">
      {empty ? (
        <>
          <h1 className="font-display text-3xl font-bold">{sprint ? "Pas encore de QCM" : "Rien à réviser pour l'instant"}</h1>
          <p className="text-muted">{sprint ? "Active un cours pour débloquer les sprints QCM." : "Toutes tes cartes sont à jour. Ajoute ou active un cours pour en avoir de nouvelles."}</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold">Session terminée</h1>
          <div className="grid grid-cols-3 gap-2">
            <Stat value={String(stats.done)} label="révisions" />
            <Stat value={`${rate} %`} label="réussite" />
            <Stat value={`+${stats.xp}`} label="XP" />
          </div>
          {stats.bestCombo >= 5 && <p className="rounded-xl bg-coral-tint p-3 text-sm font-semibold text-coral">Meilleure série de la session : {stats.bestCombo} bonnes réponses d&apos;affilée</p>}
          <p className="text-muted">Les cartes ratées reviendront bientôt, les autres plus tard : c&apos;est la répétition espacée qui travaille pour toi.</p>
        </>
      )}
      <Link href="/" className={btn.primary}>Retour à l&apos;accueil</Link>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
