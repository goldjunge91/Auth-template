import * as React from "react"

/**
 * The breakpoint width in pixels used to determine if the device is mobile.
 * Devices with a width less than this value are considered mobile.
 */
const MOBILE_BREAKPOINT = 768

/**
 * A custom React hook that determines if the current device is a mobile device
 * based on its screen width.
 *
 * @returns `true` if the device is considered mobile, `false` otherwise.
 *          Returns `undefined` during server-side rendering or before the first client-side check.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Set initial state
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    // Clean up the event listener on component unmount
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
