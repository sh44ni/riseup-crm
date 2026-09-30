// Rise Up CRM - Smooth SVG Sparkline & Popover Path Generator

export function dataToMiniPath(data: number[] | undefined, width = 73, height = 28, pad = 2): string {
  const zeroY = height - pad - 2;
  if (!data || data.length < 2) return `M ${pad} ${zeroY} L ${width - pad} ${zeroY}`;
  const max = Math.max(...data);
  const min = Math.min(...data);
  if (max === 0 && min === 0) {
    return `M ${pad} ${zeroY} L ${width - pad} ${zeroY}`;
  }
  if (max === min) {
    const midY = Math.round(height / 2);
    return `M ${pad} ${midY} L ${width - pad} ${midY}`;
  }
  const range = max - min;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2 - 2),
  }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx.toFixed(1)} ${prev.y.toFixed(1)}, ${cpx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  return d;
}

export function dataToPopoverPaths(
  data: number[] | undefined,
  width = 234,
  height = 64,
  padX = 6,
  padY = 6
): {
  line: string;
  area: string;
  dotCx: number;
  dotCy: number;
} {
  const zeroY = height - padY - 2;
  const flatZero = {
    line: `M ${padX} ${zeroY} L ${width - padX} ${zeroY}`,
    area: `M ${padX} ${zeroY} L ${width - padX} ${zeroY} L ${width - padX} ${height} L ${padX} ${height} Z`,
    dotCx: width - padX,
    dotCy: zeroY,
  };
  if (!data || data.length < 2) return flatZero;
  const max = Math.max(...data);
  const min = Math.min(...data);
  if (max === 0 && min === 0) return flatZero;
  if (max === min) {
    const midY = Math.round(height / 2);
    return {
      line: `M ${padX} ${midY} L ${width - padX} ${midY}`,
      area: `M ${padX} ${midY} L ${width - padX} ${midY} L ${width - padX} ${height} L ${padX} ${height} Z`,
      dotCx: width - padX,
      dotCy: midY,
    };
  }
  const range = max - min;
  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (width - padX * 2),
    y: padY + (1 - (v - min) / range) * (height - padY * 2 - 4),
  }));
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    line += ` C ${cpx.toFixed(1)} ${prev.y.toFixed(1)}, ${cpx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  const area = `${line} L ${(width - padX).toFixed(1)} ${height} L ${padX} ${height} Z`;
  return { line, area, dotCx: Math.round(last.x), dotCy: Math.round(last.y) };
}
