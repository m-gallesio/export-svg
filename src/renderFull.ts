import type { SvgExportOptions, Nullable } from "./interfaces";
import { canvasToRasterBlob, canvasToRasterDataUri, dataUriToImage, imageToCanvas, svgToInlinedSvgDataUri } from "./render";

async function svgToCanvas(
    this: void,
    el: SVGGraphicsElement,
    options?: Nullable<SvgExportOptions>
): Promise<HTMLCanvasElement> {
    const dataUri = await svgToInlinedSvgDataUri(el, options);
    const image = await dataUriToImage(dataUri);
    return imageToCanvas(image);
}

/** Converts a SVG element to a raster image (PNG by default) as a data URI. */
export async function svgToRasterDataUri(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions
): Promise<string> {
    return canvasToRasterDataUri(await svgToCanvas(el, options), options);
}

/** Converts a SVG element to a raster image (PNG by default) as a `Blob`. */
export async function svgToRasterBlob(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions
): Promise<Blob> {
    return canvasToRasterBlob(await svgToCanvas(el, options), options);
}

