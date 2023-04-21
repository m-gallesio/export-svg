import type { RenderedImageInfo, SvgExportOptions } from "./interfaces";
import { ensureDomNode, svgAsDataUri, svgAsPngUri } from "./exportSvg";

async function download(
    this: void,
    name: string,
    uri: string
) {
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
    generate: (this: void, el: SVGGraphicsElement, options: SvgExportOptions) => Promise<RenderedImageInfo<string>>
) {
    ensureDomNode(el);
    const { data } = await generate(el, options || {});
    return download(name, data);
}

/** @internal */

export function saveSvg(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
) {
    return exportAndDownload(el, name, options, svgAsDataUri);
}

/** @internal */

export function saveSvgAsPng(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
) {
    return exportAndDownload(el, name, options, svgAsPngUri);
}
