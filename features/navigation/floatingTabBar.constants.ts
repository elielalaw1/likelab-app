export const FLOATING_TAB_BAR_HEIGHT = 72

// Height of the persistent header ROW (excludes the top safe-area inset). Screens
// under the blur header overlay pad their content by insets.top + this.
export const TAB_HEADER_HEIGHT = 52

export function getFloatingTabBarBottomOffset(insetBottom: number) {
  return Math.max(insetBottom, 10) + 4
}

export function getFloatingTabBarSpace(insetBottom: number) {
  return getFloatingTabBarBottomOffset(insetBottom) + FLOATING_TAB_BAR_HEIGHT + 20
}

