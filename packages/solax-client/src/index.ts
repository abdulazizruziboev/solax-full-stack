import { solaxRealtimeSchema, type SolaxRealtime } from "@solax/shared"

export class SolaxApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "SolaxApiError"
  }
}

export interface SolaxClientOptions {
  baseUrl?: string
  defaultTokenId?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  maxRetries?: number
}

interface SolaxRawResponse {
  success: boolean
  exception?: string
  result?: Record<string, unknown>
  code?: string
}

const DEFAULT_BASE_URL = "https://www.solaxcloud.com:9443/proxy/api"

/**
 * Typed wrapper around the SolaxCloud Open API (getRealtimeInfo).
 * Docs: https://www.solaxcloud.com/green/#/apiManagement
 */
export class SolaxClient {
  private readonly baseUrl: string
  private readonly defaultTokenId?: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private readonly maxRetries: number

  constructor(options: SolaxClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.defaultTokenId = options.defaultTokenId
    this.fetchImpl = options.fetchImpl ?? fetch
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.maxRetries = options.maxRetries ?? 2
  }

  async getRealtimeInfo(sn: string, tokenId?: string): Promise<SolaxRealtime> {
    const token = tokenId || this.defaultTokenId
    if (!token) {
      throw new SolaxApiError("tokenId is missing for device " + sn)
    }

    const url = new URL(`${this.baseUrl}/getRealtimeInfo.do`)
    url.searchParams.set("tokenId", token)
    url.searchParams.set("sn", sn)

    const raw = await this.requestWithRetry(url)

    if (!raw.success) {
      throw new SolaxApiError(
        raw.exception ?? "Unknown SolaxCloud API error",
        raw.code !== undefined ? String(raw.code) : undefined
      )
    }

    const parsed = solaxRealtimeSchema.safeParse({
      inverterSN: sn,
      ...raw.result,
    })

    if (!parsed.success) {
      throw new SolaxApiError(
        `Unexpected SolaxCloud response shape for ${sn}: ${parsed.error.message}`
      )
    }

    return parsed.data
  }

  private async requestWithRetry(url: URL): Promise<SolaxRawResponse> {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.requestOnce(url)
      } catch (err) {
        lastError = err
        if (attempt < this.maxRetries) {
          await sleep(backoffDelayMs(attempt))
        }
      }
    }

    throw new SolaxApiError(
      `SolaxCloud request failed after ${this.maxRetries + 1} attempts`,
      undefined,
      lastError
    )
  }

  private async requestOnce(url: URL): Promise<SolaxRawResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      if (process.env.SOLAX_DEBUG_URL === "1") {
        console.log("[solax-client] GET", url.toString())
      }
      const res = await this.fetchImpl(url.toString(), {
        method: "GET",
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new SolaxApiError(`HTTP ${res.status} from SolaxCloud`)
      }

      return (await res.json()) as SolaxRawResponse
    } finally {
      clearTimeout(timeout)
    }
  }
}

function backoffDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 5_000)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type { SolaxRealtime }
