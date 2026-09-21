import {
  PLAQUE_QR_ID,
  QR_BACKGROUND_COLOR,
  QR_FOREGROUND_COLOR,
} from './plaqueConfig';

/**
 * Module-exact QR geometry extracted from the rendered SVG. When available we
 * embed it as a true vector inside the PDF instead of a raster image.
 */
export interface QrVectorPayload {
  viewBox: string;
  pathData: string;
  /** QR module count (side length) derived from the viewBox. */
  moduleCount: number;
}

const getPlaqueQrSvg = (): SVGSVGElement => {
  const svg = document.querySelector<SVGSVGElement>(`#${PLAQUE_QR_ID}`);
  if (!svg) {
    throw new Error('Plaque QR SVG element not found in the DOM');
  }
  return svg;
};

/**
 * Reads the dark-module path of the QR SVG. qrcode.react renders one path for
 * the background and one for the foreground modules, so we pick the path that
 * matches our foreground colour (falling back to the longest path).
 */
export const readQrVector = (svg: SVGSVGElement): QrVectorPayload | null => {
  const viewBox = svg.getAttribute('viewBox');
  const paths = Array.from(svg.querySelectorAll('path'));
  if (!viewBox || paths.length === 0) return null;

  const [, , viewBoxWidth] = viewBox.trim().split(/[\s,]+/);
  const moduleCount = Number(viewBoxWidth);
  if (!Number.isFinite(moduleCount) || moduleCount <= 0) return null;

  const foreground =
    paths.find(
      (path) =>
        path.getAttribute('fill')?.toLowerCase() ===
        QR_FOREGROUND_COLOR.toLowerCase(),
    ) ??
    paths.reduce((longest, path) =>
      (path.getAttribute('d')?.length ?? 0) >
      (longest.getAttribute('d')?.length ?? 0)
        ? path
        : longest,
    );

  const pathData = foreground.getAttribute('d');
  return pathData ? { viewBox, pathData, moduleCount } : null;
};

/**
 * Serializes the QR SVG at an explicit pixel size so rasterizing it into a
 * canvas never depends on the on-screen size or on the browser's intrinsic
 * SVG rasterization heuristics.
 */
const serializeQrSvg = (svg: SVGSVGElement, sizePx: number): string => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(sizePx));
  clone.setAttribute('height', String(sizePx));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(clone);
};

const loadSvgImage = (xml: string): Promise<HTMLImageElement> =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const blobUrl = URL.createObjectURL(
      new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to rasterize the QR SVG'));
    };
    image.src = blobUrl;
  });

/**
 * Renders the plaque QR code into a lossless PNG data URL. The quiet zone is
 * already part of the SVG (QR_QUIET_ZONE_MODULES), so the full square is drawn.
 */
export const rasterizeQr = async (
  sizePx: number,
  svg: SVGSVGElement = getPlaqueQrSvg(),
): Promise<string> => {
  const image = await loadSvgImage(serializeQrSvg(svg, sizePx));
  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }

  context.fillStyle = QR_BACKGROUND_COLOR;
  context.fillRect(0, 0, sizePx, sizePx);
  context.drawImage(image, 0, 0, sizePx, sizePx);

  return canvas.toDataURL('image/png', 1);
};

/** Everything the PDF needs: true vector when readable + a raster fallback. */
export interface PlaqueQrPayload {
  vector: QrVectorPayload | null;
  pngDataUrl: string;
}

/** Collects everything the PDF needs: true vector when readable + a PNG fallback. */
export const buildQrPayload = async (
  rasterSizePx: number,
): Promise<PlaqueQrPayload> => {
  const svg = getPlaqueQrSvg();
  return {
    vector: readQrVector(svg),
    pngDataUrl: await rasterizeQr(rasterSizePx, svg),
  };
};

export const downloadDataUrl = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
