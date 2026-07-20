// Operator alerting. Newly-created alarms are pushed to Telegram once (deduped
// via alarm.notifiedAt) so a serious fault reaches the operator within a poll
// cycle instead of only living in the dashboard. Config-driven: with no bot
// token/chat id the alerter cleanly no-ops.

import { prisma } from "@solax/db"
import { env } from "./env.js"

const SEVERITY_ICON: Record<string, string> = {
  CRITICAL: "🔴",
  WARNING: "🟠",
  INFO: "🔵",
}

let warnedUnconfigured = false

export function alertingEnabled(): boolean {
  return Boolean(env.telegramBotToken && env.telegramChatId)
}

async function sendTelegram(text: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.telegramChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      console.error(`[alerter] Telegram ${res.status}:`, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error("[alerter] Telegram request failed:", err)
    return false
  }
}

/** Format a single alarm as an HTML Telegram message. */
export function formatAlarm(a: {
  deviceName: string
  deviceSn: string
  severity: string
  category: string
  message: string
}): string {
  const icon = SEVERITY_ICON[a.severity] ?? "⚪"
  return [
    `${icon} <b>${escapeHtml(a.deviceName)}</b>`,
    `${escapeHtml(a.message)}`,
    `<code>${escapeHtml(a.deviceSn)}</code> · ${a.category}`,
  ].join("\n")
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/**
 * Notify the operator about any open, not-yet-notified alarms and stamp
 * notifiedAt so we never send twice. Safe to call frequently; it only acts on
 * un-notified rows. When alerting is unconfigured it marks rows as "notified"
 * to avoid a growing backlog, warning once.
 */
export async function notifyPendingAlarms(): Promise<number> {
  const pending = await prisma.alarm.findMany({
    where: { resolvedAt: null, notifiedAt: null },
    orderBy: { ts: "asc" },
    take: 20,
    include: { device: { select: { name: true, sn: true } } },
  })
  if (pending.length === 0) return 0

  if (!alertingEnabled()) {
    if (!warnedUnconfigured) {
      console.warn(
        "[alerter] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set — alarms stored but not pushed."
      )
      warnedUnconfigured = true
    }
    // Mark as notified so this backlog doesn't reprocess forever.
    await prisma.alarm.updateMany({
      where: { id: { in: pending.map((a) => a.id) } },
      data: { notifiedAt: new Date() },
    })
    return 0
  }

  let sent = 0
  for (const a of pending) {
    const ok = await sendTelegram(
      formatAlarm({
        deviceName: a.device.name,
        deviceSn: a.device.sn,
        severity: a.severity,
        category: a.category,
        message: a.message,
      })
    )
    if (ok) {
      await prisma.alarm.update({ where: { id: a.id }, data: { notifiedAt: new Date() } })
      sent++
    }
  }
  return sent
}
