"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db, DEFAULT_PROFILE } from "./db";
import { buildSessionPlan, type SessionPlan } from "./srs";

export function useProfile() {
  return useLiveQuery(async () => (await db.profile.get("me")) ?? DEFAULT_PROFILE, [], undefined);
}

/** Recalcule la file du jour dès que les cartes ou les révisions changent */
export function useSessionPlan(newPerDay: number | undefined, courseId?: string) {
  const version = useLiveQuery(async () => {
    const [cards, reviews, courses] = await Promise.all([db.cards.count(), db.reviews.count(), db.courses.toArray()]);
    return `${cards}-${reviews}-${courses.map((c) => c.status).join("")}`;
  });
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  useEffect(() => {
    if (newPerDay === undefined || version === undefined) return;
    let alive = true;
    buildSessionPlan(newPerDay, courseId).then((p) => alive && setPlan(p));
    return () => {
      alive = false;
    };
  }, [newPerDay, version, courseId]);
  return plan;
}
