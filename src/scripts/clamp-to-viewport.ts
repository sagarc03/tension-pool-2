const MIN_VISIBLE_PX = 40;

export function pctToPixels(
  leftPct: number, topPct: number,
  vpWidth: number, vpHeight: number,
): { left: number; top: number } {
  return {
    left: Math.round(leftPct * vpWidth),
    top: Math.round(topPct * vpHeight),
  };
}

export function pixelsToPct(
  left: number, top: number,
  vpWidth: number, vpHeight: number,
): { leftPct: number; topPct: number } {
  return {
    leftPct: vpWidth > 0 ? left / vpWidth : 0.5,
    topPct: vpHeight > 0 ? top / vpHeight : 0.5,
  };
}

export function clampToViewport(
  left: number, top: number,
  elWidth: number,
  vpWidth: number, vpHeight: number,
): { left: number; top: number } {
  return {
    left: Math.round(Math.max(MIN_VISIBLE_PX - elWidth, Math.min(left, vpWidth - MIN_VISIBLE_PX))),
    top: Math.round(Math.max(0, Math.min(top, vpHeight - MIN_VISIBLE_PX))),
  };
}
