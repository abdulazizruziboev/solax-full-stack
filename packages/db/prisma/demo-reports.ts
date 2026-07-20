import { prisma } from "../src/index.js"

async function main() {
  const devices = [
    { sn: "DEMO-INV-001", name: "Chorbog' Uy Paneli" },
    { sn: "DEMO-INV-002", name: "Yunusobod Ombor" },
  ]

  const created = []
  for (const d of devices) {
    const dev = await prisma.device.upsert({
      where: { sn: d.sn },
      update: { name: d.name, status: "ONLINE" },
      create: { sn: d.sn, name: d.name, status: "ONLINE" },
    })
    created.push(dev)
  }

  const today = new Date()
  for (let dayAgo = 0; dayAgo < 3; dayAgo++) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayAgo)
    date.setHours(0, 0, 0, 0)

    for (const dev of created) {
      await prisma.dailySummary.upsert({
        where: { deviceId_date: { deviceId: dev.id, date } },
        update: {},
        create: {
          deviceId: dev.id,
          date,
          totalYieldKwh: Math.round((10 + Math.random() * 30) * 10) / 10,
          peakAcPowerW: Math.round(2000 + Math.random() * 3000),
          alarmCount: dayAgo === 1 ? 2 : 0,
          wasOnline: true,
          offlineCount: 0,
        },
      })
    }
  }

  console.log(`Demo: ${created.length} devices, 3 days of summaries created.`)
}

main().finally(() => prisma.$disconnect())
