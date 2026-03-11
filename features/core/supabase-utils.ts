import { supabase } from '@/lib/supabase'

type AnyObject = Record<string, unknown>

type FetchAttempt<T> = {
  table: string
  query: (table: string) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
}

export async function firstSuccessfulQuery<T>(attempts: FetchAttempt<T>[]) {
  const errors: string[] = []

  for (const attempt of attempts) {
    const { data, error } = await attempt.query(attempt.table)
    if (!error) return data ?? []
    errors.push(`${attempt.table}: ${error.message}`)
  }

  throw new Error(errors.join(' | '))
}

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('User not authenticated')
  return data.user.id
}

export function textValue(row: AnyObject, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return null
}

export function numberValue(row: AnyObject, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value)
    }
  }
  return null
}

export function boolValue(row: AnyObject, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const v = value.toLowerCase()
      if (v === 'true' || v === '1') return true
      if (v === 'false' || v === '0') return false
    }
  }
  return fallback
}

export function arrayNumberValue(row: AnyObject, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (Array.isArray(value)) {
      const nums = value.map((v) => Number(v)).filter((v) => !Number.isNaN(v))
      if (nums.length) return nums
    }
  }
  return null
}
