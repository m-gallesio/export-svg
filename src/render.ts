import type { CanvasEncoderOptions, ImageToCanvasOptions, SvgExportOptions } from "./interfaces";
import { svgToInlinedSvg } from "./buildSvg";

const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';

function reEncode(
    this: void,
    data: string
): string {
    return decodeURIComponent(
        encodeURIComponent(data)
            .replace(/%([0-9A-F]{2})/g, (_, p1: number) => {
                const c = String.fromCharCode(Number("0x" + p1));
                return c === "%" ? "%25" : c;
            })
    );
}

/** Converts a SVG element (assumed to be already inlined) to a data URI. */
export function inlinedSvgToDataUri(
    this: void,
    el: SVGElement
): string {
    return `data:image/svg+xml;base64,${window.btoa(reEncode(doctype + el.outerHTML))}`;
}

/** Converts a SVG element to a data URI. */
export async function svgToInlinedSvgDataUri(
    this: void,
    el: SVGGraphicsElement,
    options?: Readonly<SvgExportOptions> | null
): Promise<string> {
    const svg = await svgToInlinedSvg(el, options);
    return inlinedSvgToDataUri(svg);
}

/** Creates a `HTMLImageElement` (`<img>`) with the given data URI as its `src`. */
export async function dataUriToImage(
    this: void,
    dataUri: string
): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve(image);
        };
        image.onerror = () => {
            reject(`Error loading data uri as image:\n${window.atob(dataUri.slice(26))}Open the following link to see browser's diagnosis\n${dataUri}`);
        };
        image.src = dataUri;
    });
}

/** Creates a `HTMLCanvasElement` (`<canvas>`) tailored to the given image and draws the image on it. */
export function imageToCanvas(
    this: void,
    img: HTMLImageElement,
    options?: Readonly<ImageToCanvasOptions> | null,
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", options && options.canvasSettings || undefined)!;
    // this should ensure the exported image has the same size regardless of the device
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = img.width * pixelRatio;
    canvas.height = img.height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.drawImage(img, 0, 0);

    return canvas;
}

const defaultEncoderOptions: Readonly<CanvasEncoderOptions> = Object.freeze({
    type: "image/png",
    quality: .8
});

function ensureOptions(
    this: void,
    options: Readonly<CanvasEncoderOptions> | null | undefined
): Readonly<CanvasEncoderOptions> {
    return Object.assign({}, defaultEncoderOptions, options);
}

/** Gets the content of a canvas as a data URI. */
export function canvasToRasterDataUri(
    this: void,
    canvas: HTMLCanvasElement,
    options?: Readonly<CanvasEncoderOptions> | null
): string {
    const { type, quality } = ensureOptions(options);
    return canvas.toDataURL(
        type,
        quality
    );
}

/** Gets the content of a canvas as a `Blob`. */
export async function canvasToRasterBlob(
    this: void,
    canvas: HTMLCanvasElement,
    options?: Readonly<CanvasEncoderOptions> | null
): Promise<Blob> {
    const { type, quality } = ensureOptions(options);
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => blob
                ? resolve(blob)
                : reject(`Error converting SVG data URI to blob`),
            type,
            quality
        );
    });
}
