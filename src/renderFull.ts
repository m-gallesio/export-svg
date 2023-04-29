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

export async function svgToRasterDataUri(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions
): Promise<string> {
    return canvasToRasterDataUri(await svgToCanvas(el, options), options);
}

export async function svgToRasterBlob(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions
): Promise<Blob> {
    return canvasToRasterBlob(await svgToCanvas(el, options), options);
}

