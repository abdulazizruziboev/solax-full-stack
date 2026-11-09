import { cookies } from "next/headers"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/server/auth"
import { countActiveAlarms } from "@/server/devices"
import { AppSidebar } from "./nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, alarmCount, cookieStore] = await Promise.all([
    auth(),
    countActiveAlarms(),
    cookies(),
  ])

  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={session?.user} alarmCount={alarmCount} />
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">Solar Pro Monitoring</span>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 overflow-x-clip px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
