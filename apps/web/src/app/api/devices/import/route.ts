import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { auth } from "@/server/auth"
import { importDevices } from "@/server/devices"
import { deviceImportRowSchema } from "@solax/shared"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: "buffer" })
  } catch (err) {
    return NextResponse.json(
      {
        error: `Fayl o'qib bo'lmadi. .xlsx, .xls yoki .csv formatida ekanligiga ishonch hosil qiling. (${err instanceof Error ? err.message : String(err)})`,
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
