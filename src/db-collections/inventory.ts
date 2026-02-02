import { createCollection } from '@tanstack/react-db'
import {
     trailBaseCollectionOptions,
     type TrailBaseCollectionConfig,
     type TrailBaseCollectionUtils,
} from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'
import { z } from 'zod'

import { env } from '@/env'

const inventorySchema = z.object({
     id: z.number(),
     name: z.string(),
     category: z.string(),
     stock: z.number().nonnegative(),
     price: z.number().nonnegative(),
     created_at: z.date(),
     updated_at: z.date(),
})

const trailbaseRecordSchema = z.object({
     id: z.number(),
     name: z.string(),
     category: z.string(),
     stock: z.number(),
     price: z.number(),
     created_at: z.string(),
     updated_at: z.string(),
})

export type InventoryItem = z.infer<typeof inventorySchema>
export type InventoryRecord = z.infer<typeof trailbaseRecordSchema>

type InventoryCollectionConfig = TrailBaseCollectionConfig<
     InventoryItem,
     InventoryRecord,
     InventoryItem['id']
>

const isServer = typeof window === 'undefined'
const clientServerUrl = !isServer ? import.meta.env.VITE_TRAILBASE_URL : undefined
const trailbaseUrl = isServer ? env.SERVER_URL : clientServerUrl

if (!trailbaseUrl) {
     throw new Error(
          'Trailbase URL missing. Set SERVER_URL on the server and VITE_TRAILBASE_URL for the client.',
     )
}

const trailbaseClient = initClient(trailbaseUrl)

const recordApi = trailbaseClient.records<InventoryRecord>(
     'inventory',
) as unknown as InventoryCollectionConfig['recordApi']

const trailbaseOptions = trailBaseCollectionOptions<InventoryItem, InventoryRecord, InventoryItem['id']>({
     id: 'inventory',
     recordApi,
     getKey: (item) => item.id,
     parse: {
          created_at: (value: InventoryRecord['created_at']) => new Date(value),
          updated_at: (value: InventoryRecord['updated_at']) => new Date(value),
     },
     serialize: {
          created_at: (value: InventoryItem['created_at']) => value.toISOString(),
          updated_at: (value: InventoryItem['updated_at']) => value.toISOString(),
     },
})

export const inventoryCollection = createCollection<
     typeof inventorySchema,
     InventoryItem['id'],
     TrailBaseCollectionUtils
>({
     ...trailbaseOptions,
     schema: inventorySchema,
})
