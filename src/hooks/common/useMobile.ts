import * as React from "react"

/** Viewport width (px) below which the layout is considered mobile. */
const MOBILE_BREAKPOINT = 768

/**
 * Tracks whether the viewport is currently mobile-sized.
 * Returns `true` when the window width is below the mobile breakpoint and `false` otherwise.
 */
export function useIsMobile() {
  // `undefined` initial state defers the first render decision until the effect runs
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Defer the initial check so the effect run matches post-mount, not SSR hydration
    setTimeout(() => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }, 0)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
