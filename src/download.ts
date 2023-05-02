import type { SvgExportOptions } from "./interfaces";
import { svgToInlinedSvgDataUri } from "./render";
import { svgToRasterBlob } from "./renderFull";

/** Downloads the given content (data URI or `Blob`) with the given file name. */
export async function download(
    this: void,
    name: string,
    content: string | Blob
): Promise<void> {
    const saveLink = document.createElement("a");
    saveLink.download = name;
    saveLink.style.display = "none";
    document.body.appendChild(saveLink);
    const blob = content instanceof Blob
        ? content
        : await (await fetch(content)).blob();
    const url = URL.createObjectURL(blob);
    saveLink.href = url;
    saveLink.onclick = () => requestAnimationFrame(() => {
        document.body.removeChild(saveLink);
        URL.revokeObjectURL(url);
    });
    saveLink.click();
}

/** Downloads a SVG element. */
export async function downloadSvg(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options?: Readonly<SvgExportOptions> | null
): Promise<void> {
    return download(name, await svgToInlinedSvgDataUri(el, options));
}

/** Converts a SVG element to a raster image (PNG by default) which is then downloaded. */
export async function downloadSvgAsRaster(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options?: Readonly<SvgExportOptions> | null
): Promise<void> {
    return download(name, await svgToRasterBlob(el, options));
}
