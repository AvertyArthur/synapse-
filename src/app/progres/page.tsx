"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db, localDay } from "@/lib/db";
import { bestStreak, computeBadges, computeStreak, gradeFor, jokersLeft } from "@/lib/gamification";
import { useProfile } from "@/lib/hooks";
import { MATURE_DAYS, mastery } from "@/lib/srs";
import { Card, Meter, Page, PageHeader } from "@/components/ui";
import { LockIcon, MedalIcon } from "@/components/Icons";

export default function ProgresPage() {
  const profile = useProfile();
  const reviews = useLiveQuery(() => db.reviews.toArray(), []);
  const cards = useLiveQuery(() => db.cards.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const chapters = useLiveQuery(() => db.chapters.toArray(), []);

  const data = useMemo(() => {
    if (!reviews || !cards || !courses || !chapters || !profile) return null;
    const xp = reviews.reduce((s, r) => s + r.xp, 0);
    const active = courses.filter((c) => c.status === "active");
    const byUe = new Map<string, string[]>();
    for (const c of active) byUe.set(c.ue || "Sans UE", [...(byUe.get(c.ue || "Sans UE") ?? []), c.id]);
    const ues = [...byUe.entries()]
      .map(([ue, ids]) => ({ ue, m: mastery(cards.filter((c) => ids.includes(c.courseId))) }))
      .sort((a, b) => b.m - a.m);
    const perDay = new Map<string, number>();
    for (const r of reviews) perDay.set(r.day, (perDay.get(r.day) ?? 0) + 1);
    const days: { day: string; n: number; joker: boolean }[] = [];
    const d = new Date();
    d.setDate(d.getDate() - 27);
    for (let i = 0; i < 28; i++) {
      const k = localDay(d);
      days.push({ day: k, n: perDay.get(k) ?? 0, joker: profile.jokersUsed.days.includes(k) });
      d.setDate(d.getDate() + 1);
    }
    const masteredChapters = chapters.filter((ch) => mastery(cards.filter((c) => c.chapterId === ch.id)) >= 0.8).length;
    const badges = computeBadges({ totalReviews: reviews.length, bestStreak: bestStreak(reviews), masteredChapters, perfectQcmSessions: 0 });
    const known = cards.filter((c) => !c.isNew && c.fsrs.stability >= MATURE_DAYS).length;
    return { xp, ues, days, badges, known, streak: computeStreak(reviews, profile), jokers: jokersLeft(profile) };
  }, [reviews, cards, courses, chapters, profile]);

  if (!data || !profile) return null;
  const g = gradeFor(data.xp);
  const shade = (n: number, joker: boolean) => (joker ? "bg-amber-300" : n === 0 ? "bg-line" : n < 15 ? "bg-emerald-200" : n < 40 ? "bg-mint" : "bg-teal");

  return (
    <Page>
      <PageHeader title="Ta progression" />

      {profile.gamification && (
        <section className="flex flex-col gap-2 rounded-[18px] bg-ink p-4 text-white">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl font-bold">{g.current.name}</span>
            <span className="text-[13px] text-slate-300">{data.xp.toLocaleString("fr-FR")} XP</span>
          </div>
          <Meter value={g.progress} tone="mint" />
          <span className="text-xs text-slate-300">
            {g.next ? `Encore ${(g.next.xp - data.xp).toLocaleString("fr-FR")} XP avant le grade ${g.next.name}` : "Grade maximal atteint, bravo !"}
          </span>
        </section>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">Le corps à conquérir</h2>
          <span className="text-xs text-muted">maîtrise par UE</span>
        </div>
        {data.ues.length === 0 ? (
          <p className="text-sm text-muted">Active un cours pour voir ta maîtrise par UE.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.ues.map(({ ue, m }) => (
              <div key={ue} className={`flex flex-col gap-0.5 rounded-xl p-3 ${m >= 0.6 ? "bg-emerald-200" : m >= 0.4 ? "bg-emerald-100" : m > 0 ? "bg-emerald-50" : "bg-slate-100"}`}>
                <span className="truncate text-[13px] font-semibold">{ue}</span>
                <span className="font-display text-xl font-bold">{Math.round(m * 100)} %</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">{data.known} carte{data.known > 1 ? "s" : ""} solidement ancrée{data.known > 1 ? "s" : ""} (rappel prévu dans plus de 3 semaines).</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">4 dernières semaines</h2>
          <span className="text-xs font-bold text-coral">série : {data.streak} jour{data.streak > 1 ? "s" : ""} · {data.jokers} joker{data.jokers > 1 ? "s" : ""} ce mois-ci</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {data.days.map((d) => (
            <div key={d.day} title={`${new Date(d.day + "T12:00:00").toLocaleDateString("fr-FR")} : ${d.n} révision${d.n > 1 ? "s" : ""}${d.joker ? " (joker)" : ""}`} className={`aspect-square rounded-md ${shade(d.n, d.joker)}`} />
          ))}
        </div>
      </Card>

      {profile.gamification && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.badges.map((b) => (
            <div key={b.id} className={`flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-center ${b.earned ? "" : "text-muted"}`}>
              {b.earned ? <MedalIcon className="text-teal" size={26} /> : <LockIcon className="text-slate-400" size={26} />}
              <span className="text-[13px] font-semibold">{b.name}</span>
              <span className="text-[11px] text-muted">{b.description}</span>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
