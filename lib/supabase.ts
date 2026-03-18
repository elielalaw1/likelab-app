import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
const SECURE_STORE_CHUNK_SIZE = 1800
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
export const supabaseStorageKey = `sb-${projectRef}-auth-token`

function getChunkMetaKey(key: string) {
  return `${key}__chunk_count`
}

function getChunkKey(key: string, index: number) {
  return `${key}__chunk_${index}`
}

async function removeChunkedValue(key: string) {
  const metaKey = getChunkMetaKey(key)
  const countValue = await SecureStore.getItemAsync(metaKey)

  if (countValue) {
    const chunkCount = Number.parseInt(countValue, 10)

    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      for (let index = 0; index < chunkCount; index += 1) {
        await SecureStore.deleteItemAsync(getChunkKey(key, index))
      }
    }

    await SecureStore.deleteItemAsync(metaKey)
  }
}

const ExpoSecureStoreAdapter = {
  async getItem(key: string) {
    const metaKey = getChunkMetaKey(key)
    const countValue = await SecureStore.getItemAsync(metaKey)

    if (!countValue) {
      return SecureStore.getItemAsync(key)
    }

    const chunkCount = Number.parseInt(countValue, 10)
    if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
      await SecureStore.deleteItemAsync(metaKey)
      return SecureStore.getItemAsync(key)
    }

    const chunks: string[] = []

    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = await SecureStore.getItemAsync(getChunkKey(key, index))

      if (chunk == null) {
        await removeChunkedValue(key)
        return null
      }

      chunks.push(chunk)
    }

    return chunks.join('')
  },
  async setItem(key: string, value: string) {
    const metaKey = getChunkMetaKey(key)
    await removeChunkedValue(key)

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value)
      return
    }

    const chunkCount = Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE)
    await SecureStore.deleteItemAsync(key)

    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * SECURE_STORE_CHUNK_SIZE
      const end = start + SECURE_STORE_CHUNK_SIZE
      await SecureStore.setItemAsync(getChunkKey(key, index), value.slice(start, end))
    }

    await SecureStore.setItemAsync(metaKey, String(chunkCount))
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key)
    await removeChunkedValue(key)
  },
}

const WebStorageAdapter = {
  getItem: (key: string) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    globalThis.localStorage?.removeItem(key)
    return Promise.resolve()
  },
}

const storage = Platform.OS === 'web' ? WebStorageAdapter : ExpoSecureStoreAdapter

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    storageKey: supabaseStorageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

export async function clearPersistedSupabaseSession() {
  await storage.removeItem(supabaseStorageKey)
}
