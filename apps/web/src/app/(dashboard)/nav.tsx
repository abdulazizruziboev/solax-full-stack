"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Server,
  TriangleAlert,
  LogOut,
  CalendarClock,
  Sun,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { logoutAction } from "@/server/actions"
import { ThemeToggle } from "@/components/theme-toggle"

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/devices", label: "Qurilmalar", icon: Server },
  { href: "/alarms", label: "Alarmlar", icon: TriangleAlert },
  { href: "/reports", label: "Kunlik hisobotlar", icon: CalendarClock },
]

export function AppSidebar({
  user,
  alarmCount = 0,
}: {
  user?: { name?: string | null; email?: string | null }
  alarmCount?: number
}) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/60 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <Sun className="size-4.5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Solax Monitoring</p>
            <p className="text-muted-foreground text-[11px]">Quyosh energiyasi nazorati</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="gap-1">
          <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Menyu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {links.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href)
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      isActive={active}
                      render={<Link href={link.href} />}
                      className="gap-2.5"
                    >
                      <link.icon className="text-muted-foreground group-data-active/menu-button:text-foreground" />
                      <span className="flex-1">{link.label}</span>
                      {link.href === "/alarms" && alarmCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[11px] font-semibold tabular-nums text-red-600 dark:text-red-400">
                          {alarmCount > 99 ? "99+" : alarmCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2.5 px-1 pb-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
            {(user?.name ?? user?.email ?? "A").slice(0, 1)}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{user?.name ?? "Admin"}</p>
            <p className="text-muted-foreground truncate text-[11px]">{user?.email}</p>
          </div>
        </div>
        <ThemeToggle className="w-full" />
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Chiqish
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
