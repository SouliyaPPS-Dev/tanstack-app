import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { openaiText } from '@tanstack/ai-openai'
import { geminiText } from '@tanstack/ai-gemini'
import { ollamaText } from '@tanstack/ai-ollama'
import { createFileRoute } from '@tanstack/react-router'

import { env } from '@/env'
import { getGuitars, recommendGuitarTool } from '@/lib/demo-guitar-tools'
import { logApiError } from '@/utils/server-logger'

const SYSTEM_PROMPT = `You are a helpful assistant for a store that sells guitars.

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THIS EXACT WORKFLOW:

When a user asks for a guitar recommendation:
1. FIRST: Use the getGuitars tool (no parameters needed)
2. SECOND: Use the recommendGuitar tool with the ID of the guitar you want to recommend
3. NEVER write a recommendation directly - ALWAYS use the recommendGuitar tool

IMPORTANT:
- The recommendGuitar tool will display the guitar in a special, appealing format
- You MUST use recommendGuitar for ANY guitar recommendation
- ONLY recommend guitars from our inventory (use getGuitars first)
- The recommendGuitar tool has a buy button - this is how customers purchase
- Do NOT describe the guitar yourself - let the recommendGuitar tool do it
`

export const Route = createFileRoute('/demo/api/ai/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Capture request signal before reading body (it may be aborted after body is consumed)
        const requestSignal = request.signal

        // If request is already aborted, return early
        if (requestSignal.aborted) {
          return new Response(null, { status: 499 }) // 499 = Client Closed Request
        }

        const abortController = new AbortController()

        type Provider = 'anthropic' | 'openai' | 'gemini' | 'ollama'
        type ProviderConfig = {
          provider: Provider
          model: string
          apiKey?: string
        }

        const providers: ProviderConfig[] = []

        // if (env.ANTHROPIC_API_KEY) {
        //   providers.push({
        //     provider: 'anthropic',
        //     model: 'claude-sonnet-4-5',
        //     apiKey: env.ANTHROPIC_API_KEY,
        //   })
        // }

        // if (env.OPENAI_API_KEY) {
        //   providers.push({
        //     provider: 'openai',
        //     model: 'gpt-5.2',
        //     apiKey: env.OPENAI_API_KEY,
        //   })
        // }

        if (env.GEMINI_API_KEY) {
          providers.push({
            provider: 'gemini',
            model: 'gemini-1.5-flash',
            apiKey: env.GEMINI_API_KEY,
          })
        }

        providers.push({
          provider: 'ollama',
          model: 'mistral:7b',
          apiKey: 'always-available',
        })

        let provider: Provider | undefined
        let model: string | undefined

        try {
          const body = await request.json()
          const { messages } = body

          // Build execution queue prioritizing providers with API keys, fallback to Ollama last
          const availableProviders = providers.filter((config) => config.apiKey)
          const executionQueue = availableProviders.length
            ? availableProviders
            : [providers[providers.length - 1]]

          const getAdapter = (p: Provider, m: string) => {
            if (p === 'anthropic') return anthropicText(m as any)
            if (p === 'openai') return openaiText(m as any)
            if (p === 'gemini') return geminiText(m as any)
            return ollamaText(m as any)
          }

          let lastError: Error | null = null

          for (const config of executionQueue) {
            try {
              provider = config.provider
              model = config.model

              console.log(`Attempting provider ${provider} with model ${model}`)

              const stream = chat({
                adapter: getAdapter(config.provider, config.model),
                tools: [getGuitars, recommendGuitarTool],
                systemPrompts: [SYSTEM_PROMPT],
                agentLoopStrategy: maxIterations(5),
                messages,
                abortController,
              })

              return toServerSentEventsResponse(stream, { abortController })
            } catch (attemptError: any) {
              lastError = attemptError
              console.error(`Provider ${config.provider} failed:`, attemptError.message)
            }
          }

          if (lastError) {
            throw lastError
          }

          throw new Error('No AI providers are configured')
        } catch (error: any) {
          logApiError('POST /demo/api/ai/chat', error, {
            provider,
            model,
          })
          // If request was aborted, return early (don't send error response)
          if (error.name === 'AbortError' || abortController.signal.aborted) {
            return new Response(null, { status: 499 }) // 499 = Client Closed Request
          }
          return new Response(
            JSON.stringify({ error: 'Failed to process chat request', details: error.message }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
