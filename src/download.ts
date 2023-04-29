import type { SvgExportOptions } from "./interfaces";
import { svgToInlinedSvgDataUri } from "./render";
import { svgToRasterBlob } from "./renderFull";

async function download(
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

export async function downloadSvg(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
): Promise<void> {
    return download(name, await svgToInlinedSvgDataUri(el, options));
}

export async function downloadSvgAsRaster(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
): Promise<void> {
    return download(name, await svgToRasterBlob(el, options));
}
