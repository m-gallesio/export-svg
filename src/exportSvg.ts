import type { CanvasEncoderOptions, RenderedImageInfo, SvgExportOptions } from "./interfaces";
import { buildSvg } from "./buildSvg";

const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';

function ensureDomNode(
    this: void,
    el: any
): typeof el extends HTMLElement | SVGElement ? void : never {
    if (!(el instanceof HTMLElement || el instanceof SVGElement))
        throw new Error(`an HTMLElement or SVGElement is required; got ${el}`);
}

function reEncode(
    this: void,
    data: string
) {
    return decodeURIComponent(
        encodeURIComponent(data)
            .replace(/%([0-9A-F]{2})/g, (_, p1: number) => {
                const c = String.fromCharCode(Number("0x" + p1));
                return c === '%' ? '%25' : c;
            })
    );
}

export async function svgAsDataUri(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
): Promise<RenderedImageInfo<string>> {
    ensureDomNode(el);
    const output = await buildSvg(el, options);
    const {
        src,
        width,
        height
    } = output || {};
    const data = `data:image/svg+xml;base64,${window.btoa(reEncode(doctype + src))}`;
    return { data, width, height };
}

function renderSvgToCanvas(
    this: void,
    src: HTMLImageElement,
    canvasOptions?: CanvasRenderingContext2DSettings
) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', canvasOptions)!;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = src.width * pixelRatio;
    canvas.height = src.height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.drawImage(src, 0, 0);

    return canvas;
}

function toRasterDataUrl(
    this: void,
    src: HTMLImageElement,
    options: CanvasEncoderOptions
): RenderedImageInfo<string> {
    const canvas = renderSvgToCanvas(src, options.canvasSettings);
    const {
        type = 'image/png',
        quality = 0.8
    } = options || {};
    const data = canvas.toDataURL(type, quality);
    return { data, width: canvas.width, height: canvas.height };
}

export async function svgAsPngUri(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    ensureDomNode(el);
    const { data } = await svgAsDataUri(el, options);
    return new Promise((resolve: (value: RenderedImageInfo<string>) => void, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve(toRasterDataUrl(image, options));
        };
        image.onerror = () => {
            reject(`Error loading SVG data uri as image:\n${window.atob(data.slice(26))}Open the following link to see browser's diagnosis\n${data}`);
        };
        image.src = data;
    });
}

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

export function saveSvg(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
) {
    return exportAndDownload(el, name, options, svgAsDataUri);
}

export function saveSvgAsPng(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions
) {
    return exportAndDownload(el, name, options, svgAsPngUri);
}
