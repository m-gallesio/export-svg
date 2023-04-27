import type { ImageInfo, SvgExportOptions } from "./interfaces";
import { toSvgText } from "./buildSvg";

const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';

/** @internal */

export function ensureDomNode(
    this: void,
    el: any
): typeof el extends HTMLElement | SVGElement ? void : never {
    if (!(el instanceof HTMLElement || el instanceof SVGElement))
        throw new Error(`an HTMLElement or SVGElement is required; got ${el}`);
}

function reEncode(
    this: void,
    data: string
): string {
    return decodeURIComponent(
        encodeURIComponent(data)
            .replace(/%([0-9A-F]{2})/g, (_, p1: number) => {
                const c = String.fromCharCode(Number("0x" + p1));
                return c === '%' ? '%25' : c;
            })
    );
}

export async function toSvgDataUri(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions | null
): Promise<ImageInfo<string>> {
    ensureDomNode(el);
    const output = await toSvgText(el, options);
    const {
        image,
        width,
        height
    } = output || {};
    return {
        image: `data:image/svg+xml;base64,${window.btoa(reEncode(doctype + image))}`,
        width,
        height
    };
}

async function toImage(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions | null
): Promise<HTMLImageElement> {
    ensureDomNode(el);
    const { image: data } = await toSvgDataUri(el, options);
    return new Promise((resolve: (value: HTMLImageElement) => void, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve(image);
        };
        image.onerror = () => {
            reject(`Error loading SVG data uri as image:\n${window.atob(data.slice(26))}Open the following link to see browser's diagnosis\n${data}`);
        };
        image.src = data;
    });
}

export async function toCanvas(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions | null,
): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', options && options.canvasSettings || undefined)!;
    const pixelRatio = window.devicePixelRatio || 1;

    const img = await toImage(el, options);
    canvas.width = img.width * pixelRatio;
    canvas.height = img.height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.drawImage(img, 0, 0);

    return canvas;
}

async function toRaster<TResult>(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions | null | undefined,
    render: (canvas: HTMLCanvasElement, type: string, quality: number) => TResult | Promise<TResult>,
) {
    const canvas = await toCanvas(el, options);
    const {
        type = 'image/png',
        quality = 0.8
    } = options || {};
    return {
        image: await render(canvas, type, quality),
        width: canvas.width,
        height: canvas.height
    }
}

export async function toRasterDataUri(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions
): Promise<ImageInfo<string>> {
    return toRaster(
        el,
        options,
        (canvas, type, quality) => canvas.toDataURL(type, quality)
    );
}

export async function toRasterBlob(
    this: void,
    el: SVGGraphicsElement,
    options?: SvgExportOptions
): Promise<ImageInfo<Blob>> {
    return toRaster(
        el,
        options,
        (canvas, type, quality) => new Promise((resolve: (value: Blob) => void, reject) => {
            canvas.toBlob(blob => blob
                ? resolve(blob)
                : reject(`Error converting SVG data URI to blob`), type, quality);
        })
    );
}
