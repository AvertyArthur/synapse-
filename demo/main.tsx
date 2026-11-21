import { createRoot } from "react-dom/client";
import { useSyncExternalStore } from "react";
import AppShell from "@/components/AppShell";
import Home from "@/app/page";
import CoursPage from "@/app/cours/page";
import CoursePage from "@/app/cours/[id]/page";
import Session from "@/app/session/page";
import ProgresPage from "@/app/progres/page";
import ReglagesPage from "@/app/reglages/page";
import { getLocation, subscribe } from "./router";

function Screen() {
  const { path, search } = useSyncExternalStore(subscribe, getLocation, getLocation);
  if (path === "/cours") return <CoursPage />;
  if (path.startsWith("/cours/")) return <CoursePage key={path} />;
  if (path === "/session") return <Session key={search} />;
  if (path === "/progres") return <ProgresPage />;
  if (path === "/reglages") return <ReglagesPage />;
  return <Home />;
}

createRoot(document.getElementById("root")!).render(
  <AppShell>
    <Screen />
  </AppShell>,
);
