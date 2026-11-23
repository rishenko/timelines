// The toolbar's Export: the view as one SVG (PrintPages in figure mode), saved as SVG or as PNG.

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fileName = (title: string, ext: string) => `${title.replace(/[^\w]+/g, '-').toLowerCase()}.${ext}`;

/** Downloads one SVG (as drawn by PrintPages in figure mode) as SVG, or as PNG at twice its size. */
export async function exportImage(svg: SVGSVGElement, title: string, kind: 'svg' | 'png') {
  const text = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([text], { type: 'image/svg+xml' });
  if (kind === 'svg') return download(blob, fileName(title, 'svg'));
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = svg.width.baseVal.value * 2;
  c.height = svg.height.baseVal.value * 2;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  c.toBlob((b) => b && download(b, fileName(title, 'png')), 'image/png');
}
