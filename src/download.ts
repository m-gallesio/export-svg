import type { ImageInfo, SvgExportOptions } from "./interfaces";
import { toSvgDataUri, toRasterDataUri } from "./render";

async function download(
    this: void,
    name: string,
    uri: string
): Promise<void> {
    const saveLink = document.createElement('a');
    saveLink.download = name;
    saveLink.style.display = 'none';
    document.body.appendChild(saveLink);
    try {
        const data = await fetch(uri);
        const blob = await data.blob();
        const url = URL.createObjectURL(blob);
        saveLink.href = url;
        saveLink.onclick = () => requestAnimationFrame(() => URL.revokeObjectURL(url));
    }
    catch (e) {
        console.error(e);
        console.warn('Error while getting object URL. Falling back to string URL.');
        saveLink.href = uri;
    }
    saveLink.click();
    document.body.removeChild(saveLink);
}

async function exportAndDownload(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions,
    generate: (this: void, el: SVGGraphicsElement, options: SvgExportOptions) => Promise<ImageInfo<string>>
): Promise<void> {
    const { image: data } = await generate(el, options || {});
    return download(name, data);
}

export function downloadSvg(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
): Promise<void> {
    return exportAndDownload(el, name, options, toSvgDataUri);
}

export function downloadRaster(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
): Promise<void> {
    return exportAndDownload(el, name, options, toRasterDataUri);
}
