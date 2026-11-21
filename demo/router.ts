// Petit routeur en mémoire pour la version de démonstration (une seule page, sans serveur).
// Les écrans principaux se retrouvent aussi dans l'ancre de l'URL (#cours, #progres...).
type Loc = { path: string; search: string };

const TOP = ["cours", "session", "progres", "reglages"];

function fromHash(): Loc {
  try {
    const h = location.hash.replace(/^#/, "");
    if (TOP.includes(h)) return { path: "/" + h, search: "" };
  } catch {}
  return { path: "/", search: "" };
}

let current: Loc = fromHash();
const listeners = new Set<() => void>();

export function getLocation() {
  return current;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function navigate(href: string) {
  const [pathAndSearch, anchor] = href.split("#");
  const [path, search = ""] = pathAndSearch.split("?");
  current = { path: path || "/", search };
  const top = current.path.slice(1);
  try {
    const target = TOP.includes(top) && !search ? "#" + top : current.path === "/" ? "" : null;
    if (target !== null && location.hash !== target) history.replaceState(null, "", target || location.pathname);
  } catch {}
  listeners.forEach((l) => l());
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 50);
  else window.scrollTo(0, 0);
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const next = fromHash();
    if (next.path !== current.path) {
      current = next;
      listeners.forEach((l) => l());
    }
  });
}
