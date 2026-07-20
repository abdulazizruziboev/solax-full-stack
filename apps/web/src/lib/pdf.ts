import jsPDF from "jspdf"
import { PDF_FONT_BASE64 } from "./pdf-font-data"

const FONT_FILE = "Tahoma-uz.ttf"
const FONT_NAME = "TahomaUz"

/**
 * Creates a jsPDF document with an embedded Unicode font (subsetted Tahoma
 * covering Latin + Cyrillic + Uzbek Latin). jsPDF's built-in Helvetica only
 * supports Latin-1, so Cyrillic device names (~77% of our fleet) render as
 * garbage without this. Always use this instead of `new jsPDF()` for any PDF
 * that can contain device/plant names.
 */
export function createPdf(options?: { orientation?: "portrait" | "landscape" }): jsPDF {
  const doc = new jsPDF({ orientation: options?.orientation ?? "portrait" })
  doc.addFileToVFS(FONT_FILE, PDF_FONT_BASE64)
  // Register the same subset under normal AND bold. The subset has no true
  // bold cut, but jspdf-autotable renders header cells bold by default — without
  // a 'bold' entry those lookups fall back to Helvetica and garble Cyrillic.
  // Mapping bold → the same Unicode file keeps every glyph correct.
  doc.addFont(FONT_FILE, FONT_NAME, "normal")
  doc.addFont(FONT_FILE, FONT_NAME, "bold")
  doc.setFont(FONT_NAME)
  return doc
}

/** Font family name to pass to jspdf-autotable's `styles.font`. */
export const PDF_FONT = FONT_NAME
