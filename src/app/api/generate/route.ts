import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { GenerationSchema } from "@/lib/generation-schema";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";

const SYSTEM = `Tu es un enseignant en médecine en France qui prépare des outils de révision pour une étudiante, à partir de SON cours.

Règles absolues :
- Utilise uniquement les informations présentes dans le document fourni. N'ajoute aucune donnée médicale qui n'y figure pas, même si tu la connais. Si le cours est flou, ne crée pas de carte sur ce point.
- Chaque carte et chaque QCM indique la page ou la diapo d'où vient l'information (numérotation du document, à partir de 1).
- Écris en français, avec le vocabulaire médical du cours.

Découpage : suis le plan du cours (parties, chapitres). Un cours court peut n'avoir qu'un chapitre.

Flashcards (environ 8 à 15 par chapitre selon la densité) :
- Une seule notion par carte, réponse courte (une ligne ou une courte liste).
- Varie : définitions, mécanismes physiopathologiques (« pourquoi »), signes cliniques, examens, traitements, chiffres et seuils à connaître.
- Utilise le type "cloze" pour les phrases à compléter : le trou est noté {{...}} dans front et la réponse dans back.

QCM (environ 3 à 5 par chapitre) au format des EDN :
- 5 propositions. QRU : une seule juste. QRM : au moins deux justes.
- Distracteurs plausibles, jamais absurdes.
- Correction qui explique chaque proposition en s'appuyant sur le cours.

Fiche de synthèse : une page claire et structurée par chapitre, que l'étudiante pourrait imprimer.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "La génération IA n'est pas encore configurée (clé API manquante sur le serveur)." },
      { status: 503 },
    );
  }

  let body: { data: string; mediaType: string; fileName: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const content: Anthropic.ContentBlockParam[] = [];
  if (body.mediaType === "application/pdf") {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: body.data } });
  } else if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(body.mediaType)) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: body.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: body.data },
    });
  } else if (body.text) {
    content.push({ type: "text", text: `<cours nom="${body.fileName}">\n${body.text}\n</cours>` });
  } else {
    return NextResponse.json({ error: "Format non pris en charge. Utilise un PDF, une image ou un fichier texte." }, { status: 415 });
  }
  content.push({ type: "text", text: `Voici le cours « ${body.fileName} ». Prépare le kit de révision.` });

  const client = new Anthropic();
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: SYSTEM,
      output_config: { effort: "medium", format: zodOutputFormat(GenerationSchema) },
      messages: [{ role: "user", content }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "L'IA a refusé de traiter ce document." }, { status: 422 });
    }
    if (message.stop_reason === "max_tokens") {
      return NextResponse.json({ error: "Ce cours est trop long pour être traité d'un coup. Essaie de le découper en plusieurs fichiers." }, { status: 413 });
    }
    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const parsed = GenerationSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return NextResponse.json({ error: "La réponse de l'IA était incomplète. Réessaie." }, { status: 502 });
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Trop de demandes pour le moment, réessaie dans une minute." }, { status: 429 });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ error: `Document refusé par l'IA : ${error.message}` }, { status: 400 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Erreur du service IA (${error.status}).` }, { status: 502 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "La réponse de l'IA n'était pas lisible. Réessaie." }, { status: 502 });
    }
    throw error;
  }
}
