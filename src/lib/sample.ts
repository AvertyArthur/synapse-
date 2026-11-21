import { db, uid } from "./db";
import { saveGeneration } from "./ingest";
import type { Generation } from "./generation-schema";

/** Petit cours d'exemple pour essayer l'app sans clé IA. */
export const SAMPLE: Generation = {
  course_title: "Exemple : insuffisance cardiaque (démo)",
  suggested_ue: "Cardiologie",
  chapters: [
    {
      title: "Définition et diagnostic",
      summary_markdown:
        "### Définition\nSyndrome clinique associant des **symptômes** (dyspnée, fatigue) et des **signes** (œdèmes, crépitants) liés à une anomalie cardiaque structurelle ou fonctionnelle.\n\n### Classification selon la FEVG\n- **IC à FE réduite** : FEVG ≤ 40 %\n- **IC à FE légèrement réduite** : 41 à 49 %\n- **IC à FE préservée** : ≥ 50 %\n\n### Diagnostic\n- **ECG** et **radiographie thoracique**\n- **BNP / NT-proBNP** : un taux normal rend le diagnostic peu probable\n- **Échocardiographie transthoracique** : examen clé, mesure de la FEVG",
      key_points: [
        "L'échocardiographie transthoracique est l'examen clé du diagnostic",
        "Un BNP normal rend le diagnostic d'IC peu probable",
        "FE réduite : FEVG ≤ 40 %",
      ],
      mnemonics: [],
      cards: [
        { type: "basic", front: "Quel est l'examen clé pour confirmer une insuffisance cardiaque et mesurer la FEVG ?", back: "L'échocardiographie transthoracique", source_page: 1 },
        { type: "cloze", front: "On parle d'IC à fraction d'éjection réduite quand la FEVG est {{...}}.", back: "≤ 40 %", source_page: 1 },
        { type: "cloze", front: "L'IC à FE préservée correspond à une FEVG {{...}}.", back: "≥ 50 %", source_page: 1 },
        { type: "basic", front: "Quel dosage biologique permet d'écarter une IC lorsqu'il est normal ?", back: "BNP ou NT-proBNP", source_page: 1 },
        { type: "basic", front: "Citez deux signes cliniques de congestion dans l'IC.", back: "Œdèmes des membres inférieurs, crépitants pulmonaires (aussi : turgescence jugulaire)", source_page: 1 },
      ],
      qcms: [
        {
          type: "QRM",
          question: "Devant une suspicion d'insuffisance cardiaque, quels examens demandez-vous en première intention ?",
          options: [
            { text: "ECG", correct: true },
            { text: "Dosage du BNP ou NT-proBNP", correct: true },
            { text: "Échocardiographie transthoracique", correct: true },
            { text: "Radiographie thoracique", correct: true },
            { text: "Scintigraphie pulmonaire de ventilation-perfusion", correct: false },
          ],
          explanation: "ECG, radiographie, peptides natriurétiques et échocardiographie font partie du bilan initial. La scintigraphie V/P sert à rechercher une embolie pulmonaire, pas à diagnostiquer une IC.",
          source_page: 1,
        },
      ],
    },
    {
      title: "Traitement de l'IC à FE réduite",
      summary_markdown:
        "### Les 4 piliers qui améliorent le pronostic\n1. **IEC** (ou ARA2), ou **sacubitril-valsartan**\n2. **Bêtabloquant**\n3. **Antagoniste des récepteurs minéralocorticoïdes**\n4. **Gliflozine** (inhibiteur de SGLT2)\n\n### Traitement symptomatique\n- **Diurétiques de l'anse** en cas de congestion : ils soulagent mais n'améliorent pas la survie\n\n### Mesures associées\n- Éducation thérapeutique, activité physique adaptée, surveillance du poids",
      key_points: [
        "4 classes améliorent le pronostic : IEC/ARA2 ou ARNI, bêtabloquant, ARM, iSGLT2",
        "Les diurétiques de l'anse traitent la congestion sans améliorer la survie",
      ],
      mnemonics: ["Les « 4 piliers » : un bloqueur du système rénine-angiotensine, un bêtabloquant, un ARM et une gliflozine."],
      cards: [
        { type: "basic", front: "Quelles sont les 4 classes de médicaments qui améliorent le pronostic de l'IC à FE réduite ?", back: "IEC (ou ARA2) ou sacubitril-valsartan ; bêtabloquant ; antagoniste des récepteurs minéralocorticoïdes ; gliflozine (iSGLT2)", source_page: 2 },
        { type: "basic", front: "Les diurétiques de l'anse améliorent-ils la survie dans l'IC ?", back: "Non : ils traitent la congestion et les symptômes", source_page: 2 },
        { type: "cloze", front: "Le sacubitril-valsartan associe un inhibiteur de la néprilysine et un {{...}}.", back: "ARA2 (valsartan)", source_page: 2 },
        { type: "basic", front: "Quelle mesure simple de surveillance apprend-on au patient en éducation thérapeutique ?", back: "Se peser régulièrement pour repérer une prise de poids rapide", source_page: 2 },
      ],
      qcms: [
        {
          type: "QRM",
          question: "Parmi ces traitements, lesquels améliorent le pronostic de l'IC à FE réduite ?",
          options: [
            { text: "Bêtabloquant", correct: true },
            { text: "Furosémide", correct: false },
            { text: "Gliflozine (iSGLT2)", correct: true },
            { text: "Antagoniste des récepteurs minéralocorticoïdes", correct: true },
            { text: "Digoxine", correct: false },
          ],
          explanation: "Bêtabloquant, ARM et iSGLT2 font partie des 4 piliers. Le furosémide est symptomatique. La digoxine n'améliore pas la survie.",
          source_page: 2,
        },
        {
          type: "QRU",
          question: "Quel est le rôle principal des diurétiques de l'anse dans l'IC ?",
          options: [
            { text: "Améliorer la survie", correct: false },
            { text: "Traiter la congestion", correct: true },
            { text: "Ralentir la fréquence cardiaque", correct: false },
            { text: "Remplacer les IEC", correct: false },
            { text: "Prévenir les troubles du rythme", correct: false },
          ],
          explanation: "Les diurétiques de l'anse soulagent la congestion (œdèmes, dyspnée) sans effet démontré sur la survie.",
          source_page: 2,
        },
      ],
    },
  ],
};

export async function loadSample() {
  const id = uid();
  await db.courses.add({
    id,
    title: SAMPLE.course_title,
    ue: "Cardiologie",
    semester: "",
    fileName: "exemple.pdf",
    createdAt: Date.now(),
    status: "pending",
    pageCount: 2,
  });
  await db.pages.bulkAdd(
    SAMPLE.chapters.map((c, i) => ({ courseId: id, page: i + 1, text: c.summary_markdown.replace(/[#*]/g, "") })),
  );
  await saveGeneration(id, SAMPLE, { ue: "Cardiologie" });
  return id;
}
