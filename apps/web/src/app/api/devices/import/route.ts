import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { guard } from "@/server/guard"
import { importDevices } from "@/server/devices"
import { deviceImportRowSchema } from "@solax/shared"

// A device list is a few hundred rows; anything bigger is a mistake or abuse
// (the xlsx parser is also the riskiest dependency here — keep its input small).
const MAX_IMPORT_BYTES = 2 * 1024 * 1024
const MAX_IMPORT_ROWS = 5000

export async function POST(request: Request) {
  const denied = await guard({ admin: true })
  if (denied) return denied

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 })
  }
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 })
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json(
      { error: `Fayl juda katta (maksimum ${MAX_IMPORT_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: "buffer" })
  } catch (err) {
    console.error("import: XLSX.read failed:", err)
    return NextResponse.json(
      {
        error: "Fayl o'qib bo'lmadi. .xlsx, .xls yoki .csv formatida ekanligiga ishonch hosil qiling.",
      },
      { status: 400 }
    )
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return NextResponse.json({ error: "Faylda varaq (sheet) topilmadi" }, { status: 400 })
  }

  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  })

  if (rawRows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `Qatorlar soni juda ko'p (maksimum ${MAX_IMPORT_ROWS})` },
      { status: 400 }
    )
  }

  const rows: {
    sn: string
    inverterSn: string
    tokenId: string
    name: string
    plantName: string
  }[] = []
  const rowErrors: string[] = []

  rawRows.forEach((raw, index) => {
    // Accepts both our generic template (sn, name, tokenId, plantName) and a
    // raw SolaxCloud plant export (SN, Inverter SN, SiteName, UserName, ...).
    // IMPORTANT: SolaxCloud's API is queried by the Registration No (the
    // dongle/Wi-Fi module SN — the "SN" column), NOT the inverter serial.
    // So `sn` = Registration No, `inverterSn` = the inverter's own serial.
    const normalized = {
      sn: String(
        raw["Registration No"] ?? raw.registrationNo ?? raw.sn ?? raw.SN ?? ""
      ).trim(),
      inverterSn: String(
        raw["Inverter SN"] ?? raw.inverterSn ?? raw.inverterSN ?? ""
      ).trim(),
      tokenId: String(raw.tokenId ?? raw.TokenId ?? raw.token ?? "").trim(),
      name: String(
        raw.SiteName ?? raw.name ?? raw.Name ?? raw.deviceName ?? raw.UserName ?? ""
      ).trim(),
      plantName: String(
        raw.UserName ?? raw.plantName ?? raw.PlantName ?? raw.plant ?? raw.SiteName ?? ""
      ).trim(),
    }

    const parsed = deviceImportRowSchema.safeParse(normalized)
    if (!parsed.success) {
      rowErrors.push(`Qator ${index + 2}: ${parsed.error.issues.map((i) => i.message).join(", ")}`)
      return
    }
    rows.push(parsed.data)
  })

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Yaroqli qatorlar topilmadi", rowErrors },
      { status: 400 }
    )
  }

  const result = await importDevices(rows)

  return NextResponse.json({
    ...result,
    rowErrors,
    totalRows: rawRows.length,
  })
}
