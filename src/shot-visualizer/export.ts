/* Shot list downloads, built in the browser: a landscape PDF with a
   thumbnail per shot, and a CSV that opens in Sheets or Excel. */

import { SIZES, ANGLES, MOVES, type Shot } from "./shots";
import type { PlaceKey, TimeKey } from "./scenes";

export type ShotEntry = {
  id: string;
  shot: Shot;
  /** Where and when it was set up; lists saved before locations have none. */
  set?: { place: PlaceKey; time: TimeKey };
  scene: string;
  description: string;
  notes: string;
  /** JPEG data URL, 16:9. */
  thumb: string;
};

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cells = (e: ShotEntry, i: number) => [
  String(i + 1),
  e.scene,
  SIZES[e.shot.size].name,
  `${e.shot.lens}mm`,
  `f/${e.shot.fStop}`,
  ANGLES[e.shot.angle].name,
  MOVES[e.shot.move].name,
  e.description,
  e.notes,
];

export function downloadCsv(list: ShotEntry[]) {
  const head = ["Shot", "Scene", "Size", "Lens", "Aperture", "Angle", "Move", "Description", "Notes"];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [head, ...list.map(cells)].map((r) => r.map(esc).join(","));
  // BOM so Excel reads it as UTF-8.
  save(new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }), "shot-list.csv");
}

export async function downloadPdf(list: ShotEntry[], brand: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 12;

  const cols = [
    { title: "#", w: 9 },
    { title: "Frame", w: 53 },
    { title: "Scene", w: 20 },
    { title: "Shot", w: 52 },
    { title: "Description", w: 67 },
    { title: "Notes", w: pageW - 2 * M - 9 - 53 - 20 - 52 - 67 },
  ];
  const rowH = 32;

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(10, 10, 10);
    doc.text("Shot list", M, M + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(brand, pageW - M, M + 4, { align: "right" });
    let x = M;
    const y = M + 13;
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    for (const c of cols) {
      doc.text(c.title.toUpperCase(), x + 1, y);
      x += c.w;
    }
    doc.setDrawColor(40, 180, 40);
    doc.setLineWidth(0.5);
    doc.line(M, y + 2, pageW - M, y + 2);
    return y + 5;
  };

  let y = header();
  list.forEach((e, i) => {
    if (y + rowH > pageH - M) {
      doc.addPage();
      y = header();
    }
    const c = cells(e, i);
    let x = M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 10, 10);
    doc.text(c[0], x + 1, y + 5);
    x += cols[0].w;
    try {
      doc.addImage(e.thumb, "JPEG", x, y + 1, 48, 27);
    } catch {
      /* a missing thumbnail just leaves the cell empty */
    }
    x += cols[1].w;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const block = (text: string, w: number, lines = 7) =>
      (doc.splitTextToSize(text, w - 3) as string[]).slice(0, lines);
    doc.text(block(c[1], cols[2].w), x + 1, y + 5);
    x += cols[2].w;
    doc.text([`${c[2]}`, `${c[3]} · ${c[4]}`, c[5], c[6]], x + 1, y + 5);
    x += cols[3].w;
    doc.text(block(c[7], cols[4].w), x + 1, y + 5);
    x += cols[4].w;
    doc.setTextColor(90, 90, 90);
    doc.text(block(c[8], cols[5].w), x + 1, y + 5);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(M, y + rowH - 1, pageW - M, y + rowH - 1);
    y += rowH;
  });

  save(doc.output("blob"), "shot-list.pdf");
}
