export const FLOATING_TAB_BAR_HEIGHT = 68

export function getFloatingTabBarBottomOffset(insetBottom: number) {
  return Math.max(insetBottom, 10) + 4
}

export function getFloatingTabBarSpace(insetBottom: number) {
  return getFloatingTabBarBottomOffset(insetBottom) + FLOATING_TAB_BAR_HEIGHT + 20
}

