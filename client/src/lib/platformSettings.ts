import { useState, useEffect } from 'react'

let cachedShowCampus = false
const listeners = new Set<(show: boolean) => void>()

export function setLocalShowCampus(show: boolean) {
  cachedShowCampus = show
  listeners.forEach((fn) => fn(show))
}

export async function fetchPlatformSettings(): Promise<{ showCampusAffiliation: boolean }> {
  try {
    const res = await fetch('/api/settings/public')
    if (res.ok) {
      const json = await res.json()
      if (json.success && json.data) {
        cachedShowCampus = Boolean(json.data.showCampusAffiliation)
        listeners.forEach((fn) => fn(cachedShowCampus))
        return json.data
      }
    }
  } catch {
    // fallback safe default
  }
  return { showCampusAffiliation: cachedShowCampus }
}

export function usePlatformSettings() {
  const [showCampusAffiliation, setShowCampusAffiliation] = useState(cachedShowCampus)

  useEffect(() => {
    fetchPlatformSettings().then((res) => {
      setShowCampusAffiliation(res.showCampusAffiliation)
    })

    const listener = (show: boolean) => setShowCampusAffiliation(show)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return {
    showCampusAffiliation,
    refetchSettings: fetchPlatformSettings
  }
}
