import bcrypt from "bcryptjs"
import { prisma } from "../src/index.js"

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@solax.local"
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  })

  console.log(`Seeded admin user: ${user.email}`)
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`Default password: ${password} (change SEED_ADMIN_PASSWORD env to customize)`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
