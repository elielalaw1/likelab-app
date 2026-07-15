import { useEffect, useRef, useState } from 'react'
import { logoRainEasterEgg } from '@/features/shared/easterEggs'
import { startHapticRampage } from '@/features/shared/haptics'
import { LogoRain } from '@/features/shared/ui/LogoRain'

const RAIN_DURATION_MS = 5000
// 500 was tried and made the device stutter (500 concurrently animated views is a
// lot for a phone GPU) — this is the densest that stayed smooth on-device.
const RAIN_DENSITY = 150

// Spam the header logo (see PersistentTabHeader) to trigger 5 seconds of falling
// LikeLab marks plus a rapid haptic buzz. Mounted once at the app root so the rain
// covers the full screen regardless of which tab/route is active underneath.
export function LogoRainEasterEgg() {
  const [active, setActive] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const unsubscribe = logoRainEasterEgg.onTrigger(() => {
      cleanupRef.current?.()
      setActive(true)
      const stopRampage = startHapticRampage(RAIN_DURATION_MS)
      const timeout = setTimeout(() => {
        setActive(false)
        cleanupRef.current = null
      }, RAIN_DURATION_MS)
      cleanupRef.current = () => {
        clearTimeout(timeout)
        stopRampage()
      }
    })
    return () => {
      unsubscribe()
      cleanupRef.current?.()
    }
  }, [])

  return <LogoRain active={active} density={RAIN_DENSITY} loopDurationMs={RAIN_DURATION_MS} />
}
