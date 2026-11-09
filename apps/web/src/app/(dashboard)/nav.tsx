"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Server,
  TriangleAlert,
  LogOut,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
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
  SidebarRail,
  useSidebar,
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
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/60 p-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:px-0 transition-all">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center w-full">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center"
            title="Solar Pro Monitoring"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-xs border border-border/40">
              <Image
                src="/logo.png"
                alt="Solar Pro"
                width={32}
                height={32}
                unoptimized
                className="size-full object-contain"
              />
            </div>
            <div className="leading-tight truncate group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold tracking-tight truncate">Solar Pro</p>
              <p className="text-muted-foreground text-[11px] truncate">Quyosh energiyasi</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? "Kengaytirish (Ctrl+B)" : "Yig'ish (Ctrl+B)"}
            className="hidden md:flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 group-data-[collapsible=icon]:px-1">
        <SidebarGroup className="gap-1">
          <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
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
                      tooltip={link.label}
                      className="gap-2.5"
                    >
                      <div className="relative flex items-center justify-center">
                        <link.icon className="text-muted-foreground group-data-active/menu-button:text-foreground size-4 shrink-0" />
                        {link.href === "/alarms" && alarmCount > 0 && (
                          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-red-600 hidden group-data-[collapsible=icon]:block" />
                        )}
                      </div>
                      <span className="flex-1 group-data-[collapsible=icon]:hidden">{link.label}</span>
                      {link.href === "/alarms" && alarmCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[11px] font-semibold tabular-nums text-red-600 dark:text-red-400 group-data-[collapsible=icon]:hidden">
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

      <SidebarFooter className="border-t border-border/60 p-2 gap-1 group-data-[collapsible=icon]:p-1.5">
        <ThemeToggle className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto" />
        <form action={logoutAction} className="w-full">
          <button
            type="submit"
            title="Chiqish"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto cursor-pointer"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Chiqish</span>
          </button>
        </form>
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? "Kengaytirish (Ctrl+B)" : "Yig'ish (Ctrl+B)"}
          className="hidden md:flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="size-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-4 shrink-0" />
              <span className="text-xs">Yig'ish</span>
            </>
          )}
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
