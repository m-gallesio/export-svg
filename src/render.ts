import type { CanvasEncoderOptions, RenderedImageInfo, SvgExportOptions } from "./interfaces";
import { buildSvg } from "./buildSvg";

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
) {
    return decodeURIComponent(
        encodeURIComponent(data)
            .replace(/%([0-9A-F]{2})/g, (_, p1: number) => {
                const c = String.fromCharCode(Number("0x" + p1));
                return c === '%' ? '%25' : c;
            })
    );
}

/** @internal */

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

async function toRaster<TResult>(
    this: void,
    src: HTMLImageElement,
    options: CanvasEncoderOptions,
    getData: (canvas: HTMLCanvasElement, type: string, quality: number) => TResult | Promise<TResult>
): Promise<RenderedImageInfo<TResult>> {
    const canvas = renderSvgToCanvas(src, options.canvasSettings);
    const {
        type = 'image/png',
        quality = 0.8
    } = options || {};
    return {
        data: await getData(canvas, type, quality),
        width: canvas.width,
        height: canvas.height
    }
}

async function renderToResult<TResult>(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions,
    render: (image: HTMLImageElement, options: SvgExportOptions) => RenderedImageInfo<TResult> | Promise<RenderedImageInfo<TResult>>
) {
    ensureDomNode(el);
    const { data } = await svgAsDataUri(el, options);
    return new Promise((resolve: (value: RenderedImageInfo<TResult>) => void, reject) => {
        const image = new Image();
        image.onload = async () => {
            resolve(await render(image, options));
        };
        image.onerror = () => {
            reject(`Error loading SVG data uri as image:\n${window.atob(data.slice(26))}Open the following link to see browser's diagnosis\n${data}`);
        };
        image.src = data;
    });
}

/** @internal */

export async function svgAsPngUri(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    return renderToResult(el, options, (src, options) => toRaster(
        src,
        options,
        (canvas, type, quality) => canvas.toDataURL(type, quality)
    ));
}

/** @internal */

export async function svgAsPngBlob(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    return renderToResult(el, options, (src, options) => toRaster(
        src,
        options,
        (canvas, type, quality) => new Promise((resolve: (value: Blob) => void, reject) => {
            canvas.toBlob(blob => blob
                ? resolve(blob)
                : reject(`Error converting SVG data URI to blob`), type, quality);
        })
    ));
}