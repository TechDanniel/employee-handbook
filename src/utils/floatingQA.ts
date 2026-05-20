import type { Match, WorkerMsg } from '../types/floatingQA'
import { OpenRouter } from '@openrouter/sdk'
import { reactive } from 'vue'

const LS_OPENROUTER_API_KEY = 'kb_openrouter_api_key'
const LS_OPENROUTER_CHAT_MODEL = 'kb_openrouter_chat_model'
const LS_OPENROUTER_EMBEDDING_MODEL = 'kb_openrouter_embedding_model'
const LS_OPENROUTER_CONFIG_PANEL_OPEN = 'kb_openrouter_config_panel_open'

function readLocalStorage(key: string): string | undefined {
	try {
		const v = localStorage.getItem(key)
		const trimmed = v?.trim()
		return trimmed ? trimmed : undefined
	} catch {
		return undefined
	}
}

function writeLocalStorage(key: string, value: string | undefined) {
	try {
		const v = value?.trim()
		if (!v) {
			localStorage.removeItem(key)
			return
		}
		localStorage.setItem(key, v)
	} catch {
		// ignore
	}
}

function readBoolLocalStorage(key: string, fallback = false) {
	try {
		const v = localStorage.getItem(key)
		if (v == null) return fallback
		return v === '1'
	} catch {
		return fallback
	}
}

function writeBoolLocalStorage(key: string, value: boolean) {
	try {
		localStorage.setItem(key, value ? '1' : '0')
	} catch {
		// ignore
	}
}

export function setStoredOpenRouterConfig(cfg: {
	apiKey?: string
	chatModel?: string
	embeddingModel?: string
}) {
	writeLocalStorage(LS_OPENROUTER_API_KEY, cfg.apiKey)
	writeLocalStorage(LS_OPENROUTER_CHAT_MODEL, cfg.chatModel)
	writeLocalStorage(LS_OPENROUTER_EMBEDDING_MODEL, cfg.embeddingModel)
}

export function clearStoredOpenRouterConfig() {
	writeLocalStorage(LS_OPENROUTER_API_KEY, undefined)
	writeLocalStorage(LS_OPENROUTER_CHAT_MODEL, undefined)
	writeLocalStorage(LS_OPENROUTER_EMBEDDING_MODEL, undefined)
}

export type OpenRouterConfigForm = {
	apiKey: string
	chatModel: string
	embeddingModel: string
}

export type OpenRouterConfigController = {
	panelOpen: boolean
	form: OpenRouterConfigForm
	save(): void
	clear(): void
	togglePanel(): void
}

export function useOpenRouterConfigController(
	env: FloatingQaEnv,
	options?: { setStatus?: (text: string) => void }
): OpenRouterConfigController {
	const setStatus = options?.setStatus

	const state = reactive({
		panelOpen: readBoolLocalStorage(LS_OPENROUTER_CONFIG_PANEL_OPEN, false)
	})

	const form = reactive<OpenRouterConfigForm>({
		apiKey: readLocalStorage(LS_OPENROUTER_API_KEY) ?? (env.apiKey ?? ''),
		chatModel: readLocalStorage(LS_OPENROUTER_CHAT_MODEL) ?? (env.chatModel ?? ''),
		embeddingModel: readLocalStorage(LS_OPENROUTER_EMBEDDING_MODEL) ?? (env.embeddingModel ?? '')
	})

	function syncEnvFromCurrentSources() {
		const fresh = createFloatingQaEnv()
		env.apiKey = fresh.apiKey
		env.chatModel = fresh.chatModel
		env.embeddingModel = fresh.embeddingModel
	}

	function save() {
		setStoredOpenRouterConfig({
			apiKey: form.apiKey,
			chatModel: form.chatModel,
			embeddingModel: form.embeddingModel
		})
		syncEnvFromCurrentSources()
		state.panelOpen = false
		writeBoolLocalStorage(LS_OPENROUTER_CONFIG_PANEL_OPEN, state.panelOpen)
		setStatus?.('已保存配置（仅存于当前浏览器 localStorage）')
	}

	function clear() {
		clearStoredOpenRouterConfig()
		form.apiKey = ''
		form.chatModel = ''
		form.embeddingModel = ''
		syncEnvFromCurrentSources()
		state.panelOpen = false
		writeBoolLocalStorage(LS_OPENROUTER_CONFIG_PANEL_OPEN, state.panelOpen)
		setStatus?.('已清除本地配置')
	}

	function togglePanel() {
		state.panelOpen = !state.panelOpen
		writeBoolLocalStorage(LS_OPENROUTER_CONFIG_PANEL_OPEN, state.panelOpen)
		if (!state.panelOpen) return
		// 打开时刷新表单，避免显示过期值
		form.apiKey = readLocalStorage(LS_OPENROUTER_API_KEY) ?? (env.apiKey ?? '')
		form.chatModel = readLocalStorage(LS_OPENROUTER_CHAT_MODEL) ?? (env.chatModel ?? '')
		form.embeddingModel = readLocalStorage(LS_OPENROUTER_EMBEDDING_MODEL) ?? (env.embeddingModel ?? '')
	}

	return { get panelOpen() { return state.panelOpen }, set panelOpen(v: boolean) { state.panelOpen = v }, form, save, clear, togglePanel }
}

export type FloatingQaEnv = {
	apiKey?: string
	chatModel?: string
	embeddingModel?: string
	kbManifestUrl: string
	kbVectorsUrl: string
}

export function createFloatingQaEnv(): FloatingQaEnv {
	const storedApiKey = readLocalStorage(LS_OPENROUTER_API_KEY)
	const storedChatModel = readLocalStorage(LS_OPENROUTER_CHAT_MODEL)
	const storedEmbeddingModel = readLocalStorage(LS_OPENROUTER_EMBEDDING_MODEL)

	return {
		apiKey: storedApiKey ?? (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined),
		chatModel: storedChatModel ?? (import.meta.env.VITE_OPENROUTER_MODEL as string | undefined),
		embeddingModel:
			storedEmbeddingModel ?? (import.meta.env.VITE_OPENROUTER_EMBEDDING_MODEL as string | undefined),
		kbManifestUrl:
			(import.meta.env.VITE_KB_MANIFEST_URL as string | undefined) ?? '/kb/manifest.json',
		kbVectorsUrl:
			(import.meta.env.VITE_KB_VECTORS_URL as string | undefined) ?? '/kb/vectors.bin'
	}
}

export function useFloatingQaEnvWithConfig(options?: { setStatus?: (text: string) => void }) {
	const env = reactive<FloatingQaEnv>(createFloatingQaEnv())
	const config = useOpenRouterConfigController(env, { setStatus: options?.setStatus })
	return { env, config }
}

export function buildPrompt(question: string, matches: Match[]) {
	if (!matches.length) {
		return `问题：${question}`
	}
	const ctx = matches
		.map((m, idx) => {
			const title = `[${idx + 1}] ${m.chunk.sourcePath} (score=${m.score.toFixed(4)})`
			return `${title}\n${m.chunk.text}`
		})
		.join('\n\n')

	return `本地知识库检索到以下片段（可能不完整/可能与问题无关）：\n\n${ctx}\n\n用户问题：${question}`
}

async function probeJson(url: string) {
	const res = await fetch(url, { cache: 'no-store' })
	if (!res.ok) {
		throw new Error(`加载失败：${url} (${res.status})`)
	}
	try {
		await res.json()
	} catch {
		throw new Error(`manifest 不是有效 JSON：${url}`)
	}
}

async function probeBinary(url: string) {
	// 尽量避免下载完整 vectors.bin：优先 HEAD；不支持则用 Range GET。
	try {
		const head = await fetch(url, { method: 'HEAD', cache: 'no-store' })
		if (head.ok) return
		// 某些静态服务可能不支持 HEAD（405/501），继续 fallback。
		if (![405, 501].includes(head.status)) {
			throw new Error(`加载失败：${url} (${head.status})`)
		}
	} catch {
		// ignore and fallback
	}

	const controller = new AbortController()
	const res = await fetch(url, {
		method: 'GET',
		headers: {
			Range: 'bytes=0-0'
		},
		cache: 'no-store',
		signal: controller.signal
	})
	if (!(res.ok || res.status === 206)) {
		throw new Error(`加载失败：${url} (${res.status})`)
	}
	try {
		// 主动取消 body流的下载，避免拉取大文件
		await res.body?.cancel()
	} catch {
		// ignore
	}
	controller.abort()
}

function kbMissingHint(env: FloatingQaEnv) {
	return [
		'未检测到本地知识库文件（manifest/vectors）。',
		`manifest: ${env.kbManifestUrl}`,
		`vectors:  ${env.kbVectorsUrl}`,
		'',
		'请先用 CLI 生成并放到站点可访问的位置（VitePress 通常是 note-demo/public/kb）：',
		'  knowledge-base ai index --input <你的md或目录> --out note-demo/public/kb',
		'',
		'或通过 .env 配置覆盖：VITE_KB_MANIFEST_URL / VITE_KB_VECTORS_URL。'
	].join('\n')
}

export async function chat(
	env: FloatingQaEnv,
	prompt: string,
	options?: {
		onDelta?: (text: string) => void
		history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
	}
) {
	if (!env.apiKey) throw new Error('缺少 VITE_OPENROUTER_API_KEY')
	if (!env.chatModel) throw new Error('缺少 VITE_OPENROUTER_MODEL')

	const client = new OpenRouter({
		apiKey: env.apiKey
	})

	const systemMsg = {
		role: 'system',
		content:
			'你是一个严谨的知识库问答助手。优先基于给定的上下文回答；如果上下文不足以支持结论，请明确说明无法从知识库得出答案。'
	} as const
	const history = (options?.history ?? []).filter((m) => Boolean(m?.content?.trim()))

	const userMsg = { role: 'user', content: prompt } as const

	// 流式：边接收边输出，便于 UI 实时渲染。
	const stream: any = await client.chat.send({
		chatRequest: {
			model: env.chatModel,
			stream: true,
			messages: [systemMsg, ...history, userMsg],
			temperature: 0.2,
			maxTokens: 1024
		}
	})

	let fullText = ''

	const emit = (delta: unknown) => {
		if (typeof delta !== 'string' || !delta) return
		fullText += delta
		options?.onDelta?.(delta)
	}

	if (stream && typeof stream === 'object' && Symbol.asyncIterator in stream) {
		for await (const chunk of stream as AsyncIterable<any>) {
			const content = chunk?.choices?.[0]?.delta?.content
      if(content){
        emit(content)
      }
		}
		const trimmed = fullText.trim()
		if (!trimmed) throw new Error('Chat 返回为空')
		return fullText
	}

	// 如果 SDK 在某些环境下未返回 async iterable，则 fallback 为非流式。
	const result: any = await client.chat.send({
		chatRequest: {
			model: env.chatModel,
			stream: false,
			messages: [systemMsg, ...history, userMsg],
			temperature: 0.2,
			maxTokens: 1024
		}
	})

	const content = result?.choices?.[0]?.message?.content?.trim()
	if (!content) throw new Error('Chat 返回为空')
	return content as string
}

export type FloatingQaService = {
	initKbOnce(): Promise<void>
	searchKb(query: string, topK?: number): Promise<Match[]>
	dispose(): void
}

export function createFloatingQaService(options: {
	env: FloatingQaEnv
	setStatus?: (text: string) => void
}): FloatingQaService {
	const setStatus = options.setStatus
	let worker: Worker | null = null
	let workerInited = false

	let initPromise: Promise<void> | null = null
	let initResolve: (() => void) | null = null
	let initReject: ((e: Error) => void) | null = null

	let pendingSearchResolve: ((m: Match[]) => void) | null = null

	let pendingSearchReject: ((e: Error) => void) | null = null

	function ensureWorker() {
		if (worker) return
		worker = new Worker(new URL('../workers/kb.worker.ts', import.meta.url), { type: 'module' })
		worker.onmessage = (ev: MessageEvent<WorkerMsg>) => {
			const msg = ev.data
			if (msg.type === 'inited') {
				workerInited = true
				setStatus?.(`本地知识库已加载：${msg.chunkCount} chunks (dim=${msg.dimension})`)
				initResolve?.()
				initResolve = null
				initReject = null
				initPromise = null
				return
			}
			if (msg.type === 'searchResult') {
				pendingSearchResolve?.(msg.matches)
				pendingSearchResolve = null
				pendingSearchReject = null
				return
			}
			if (msg.type === 'error') {
				setStatus?.(msg.message)
				const err = new Error(msg.message)
				initReject?.(err)
				initResolve = null
				initReject = null
				initPromise = null

				pendingSearchReject?.(err)
				pendingSearchResolve = null
				pendingSearchReject = null
				return
			}
		}
	}

	function initKbOnce(): Promise<void> {
		ensureWorker()
		if (!worker) return Promise.reject(new Error('Worker 未初始化'))
		if (workerInited) return Promise.resolve()
		if (initPromise) return initPromise

		setStatus?.('正在检查本地知识库文件...')
		const p = new Promise<void>((resolve: () => void, reject: (reason?: unknown) => void) => {
			initResolve = resolve
			initReject = (e: Error) => reject(e)
			;(async () => {
				try {
					await probeJson(options.env.kbManifestUrl)
					await probeBinary(options.env.kbVectorsUrl)
				} catch (e: any) {
					throw new Error(`${kbMissingHint(options.env)}\n\n原始错误：${e?.message ?? String(e)}`)
				}

				setStatus?.('正在加载本地知识库...')
				worker!.postMessage({
					type: 'init',
					manifestUrl: options.env.kbManifestUrl,
					vectorsUrl: options.env.kbVectorsUrl
				})
			})().catch((e: any) => {
				const err = e instanceof Error ? e : new Error(String(e))
				initReject?.(err)
				initResolve = null
				initReject = null
				initPromise = null
			})
		})
		initPromise = p
		return p
	}

	function searchKb(query: string, topK = 5): Promise<Match[]> {
		if (!worker) throw new Error('Worker 未初始化')
		if (!options.env.apiKey) {
			throw new Error('缺少 OPENROUTER_API_KEY（远端 embedding 需要）')
		}
		if (!options.env.embeddingModel) {
			throw new Error('缺少 OPENROUTER_EMBEDDING_MODEL（远端 embedding 需要）')
		}
		return new Promise<Match[]>((resolve: (m: Match[]) => void, reject: (e: Error) => void) => {
			pendingSearchResolve = resolve
			pendingSearchReject = reject
			worker!.postMessage({
				type: 'search',
				query,
				topK,
				embedding:
					{
            model: options.env.embeddingModel,
            apiKey: options.env.apiKey
          }
			})
		})
	}

	function dispose() {
		worker?.terminate()
		worker = null
		workerInited = false
		initPromise = null
		initResolve = null
		initReject = null
		pendingSearchResolve = null
		pendingSearchReject = null
	}

	return {
		initKbOnce,
		searchKb,
		dispose
	}
}