"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { db, localDay, saveProfile } from "@/lib/db";
import { computeStreak, greeting } from "@/lib/gamification";
import { useProfile, useSessionPlan } from "@/lib/hooks";
import { mastery } from "@/lib/srs";
import { Card, Meter, Page, btn } from "@/components/ui";
import { ChevronIcon, FlameIcon, HeartIcon } from "@/components/Icons";

export default function Home() {
  const profile = useProfile();
  const plan = useSessionPlan(profile?.newCardsPerDay);
  const reviews = useLiveQuery(() => db.reviews.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const chapters = useLiveQuery(() => db.chapters.toArray(), []);
  const cards = useLiveQuery(() => db.cards.toArray(), []);

  const today = localDay();
  const doneToday = reviews?.filter((r) => r.day === today).length ?? 0;
  const streak = profile && reviews ? computeStreak(reviews, profile) : 0;

  const message = useMemo(() => {
    const list = profile?.encouragements.filter(Boolean) ?? [];
    if (!list.length) return null;
    const dayIndex = Math.floor(Date.now() / 86400000);
    return list[dayIndex % list.length];
  }, [profile?.encouragements]);

  const nextExam = useMemo(() => {
    const upcoming = (profile?.exams ?? []).filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0];
  }, [profile?.exams, today]);

  const weakChapters = useMemo(() => {
    if (!chapters || !cards || !courses) return [];
    const activeIds = new Set(courses.filter((c) => c.status === "active").map((c) => c.id));
    const scope = nextExam?.courseIds.length ? new Set(nextExam.courseIds) : activeIds;
    return chapters
      .filter((ch) => scope.has(ch.courseId) && activeIds.has(ch.courseId))
      .map((ch) => ({ ch, m: mastery(cards.filter((c) => c.chapterId === ch.id)) }))
      .sort((a, b) => a.m - b.m)
      .slice(0, 3);
  }, [chapters, cards, courses, nextExam]);

  if (!profile) return null;
  if (!profile.onboarded) return <Welcome defaultName={profile.firstName} />;

  const total = plan ? plan.due.length + plan.fresh.length : 0;
  const qcmCount = plan ? [...plan.due, ...plan.fresh].filter((c) => c.kind === "qcm").length : 0;
  const flashCount = total - qcmCount;
  const hasCourses = (courses?.length ?? 0) > 0;
  const progressToday = total + doneToday ? doneToday / (total + doneToday) : 0;
  const daysLeft = nextExam ? Math.round((new Date(nextExam.date + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) / 86400000) : null;

  return (
    <Page>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-muted first-letter:uppercase">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-display text-[28px] font-bold">
            {greeting()} {profile.firstName}
          </h1>
        </div>
        {profile.gamification && (
          <div className="flex items-center gap-1.5 rounded-full bg-coral-tint px-3 py-2 text-sm font-bold text-coral" title="Jours de révision consécutifs">
            <FlameIcon size={16} />
            {streak} jour{streak > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3 rounded-[20px] bg-ink p-5 text-white">
        <span className="text-xs font-semibold tracking-wider text-emerald-200 uppercase">Session du jour</span>
        {!hasCourses ? (
          <>
            <p className="font-display text-2xl font-bold">Ajoute ton premier cours</p>
            <p className="text-sm text-slate-300">Dépose un PDF, des diapos ou une photo de poly : l&apos;app prépare flashcards, QCM et fiche de synthèse.</p>
            <Link href="/cours" className={btn.mint}>Ajouter un cours</Link>
          </>
        ) : total === 0 ? (
          <>
            <p className="font-display text-2xl font-bold">Tout est à jour</p>
            <p className="text-sm text-slate-300">
              {doneToday ? `${doneToday} révisions faites aujourd'hui. ` : ""}
              {courses?.some((c) => c.status === "ready") ? "Un kit de révision attend ta validation dans Cours." : "Reviens demain, ou ajoute un nouveau cours."}
            </p>
            <Link href="/cours" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white/10 font-bold">Voir mes cours</Link>
          </>
        ) : (
          <>
            <p className="font-display text-2xl leading-tight font-bold">
              {flashCount > 0 && `${flashCount} carte${flashCount > 1 ? "s" : ""}`}
              {flashCount > 0 && qcmCount > 0 && " et "}
              {qcmCount > 0 && `${qcmCount} QCM`}
            </p>
            <p className="text-sm text-slate-300">
              Environ {plan!.estimatedMinutes} min · {plan!.due.length} à revoir, {plan!.fresh.length} nouvelle{plan!.fresh.length > 1 ? "s" : ""}
            </p>
            <Meter value={progressToday} tone="mint" />
            <Link href="/session" className={btn.mint}>{doneToday ? "Continuer la session" : "Commencer la session"}</Link>
          </>
        )}
      </section>

      {message && (
        <Card className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral-tint text-coral"><HeartIcon size={20} /></div>
          <div>
            <p className="text-xs font-semibold text-muted">Un mot d&apos;Arthur</p>
            <p className="text-[15px]">{message}</p>
          </div>
        </Card>
      )}

      {weakChapters.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">{nextExam ? nextExam.name : "À renforcer"}</h2>
            {daysLeft !== null && <span className="text-sm font-bold text-teal">{daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}</span>}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {weakChapters.map(({ ch, m }) => (
              <Link key={ch.id} href={`/cours/${ch.courseId}#${ch.id}`} className="flex flex-col gap-1.5 rounded-xl bg-ground p-3 hover:bg-line">
                <span className="line-clamp-2 text-[13px] text-muted">{ch.title}</span>
                <Meter value={m} />
                <span className="text-xs font-semibold">{Math.round(m * 100)} %</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted">Mémoire estimée par chapitre. Les plus fragiles reviennent en priorité.</p>
        </Card>
      )}

      {hasCourses && (
        <Link href="/session?mode=sprint" className="flex min-h-11 items-center justify-between rounded-2xl bg-teal-tint px-4 py-3.5">
          <div>
            <p className="text-xs font-bold text-teal">Défi</p>
            <p className="font-semibold">Sprint QCM : 10 questions mélangées</p>
          </div>
          <ChevronIcon className="text-teal" size={20} />
        </Link>
      )}
    </Page>
  );
}

function Welcome({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [minutes, setMinutes] = useState(30);
  return (
    <Page>
      <div className="mt-6 flex flex-col gap-2">
        <p className="font-display text-4xl font-bold">Synapse</p>
        <p className="text-muted">Tes cours deviennent des flashcards, des QCM et des fiches, révisés au bon moment.</p>
      </div>
      <Card className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Ton prénom
          <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-base font-normal" />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Combien de temps par jour ?</legend>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
                className={`min-h-11 rounded-xl border font-semibold ${minutes === m ? "border-teal bg-teal-tint text-teal" : "border-slate-300 bg-white"}`}
              >
                {m} min
              </button>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          className={btn.primary}
          onClick={() => saveProfile({ firstName: name.trim() || "Jade", dailyMinutes: minutes, newCardsPerDay: Math.round(minutes * 0.7), onboarded: true })}
        >
          C&apos;est parti
        </button>
      </Card>
    </Page>
  );
}
