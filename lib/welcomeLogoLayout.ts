/**
 * Welcome / landing hero logo sizing. Layout box is fixed for flex; scale increases
 * visual size without shifting siblings (RN transform does not expand layout).
 */
export function getWelcomeLogoLayout(width: number) {
  const layoutSize = Math.min(width * 0.38, 152);
  const visualScale = Math.min(width * 0.62, 280) / layoutSize;
  const visualSize = layoutSize * visualScale;
  return { layoutSize, visualScale, visualSize };
}
