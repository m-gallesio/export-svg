import type { ImageInfo, SvgExportOptions, Nullable } from "./interfaces";
import { toSvgText } from "./buildSvg";

const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';

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
    options?: Nullable<SvgExportOptions>
): Promise<ImageInfo<string>> {
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

export async function toImage(
    this: void,
    el: SVGGraphicsElement,
    options?: Nullable<SvgExportOptions>
): Promise<ImageInfo<HTMLImageElement>> {
    const { image: data } = await toSvgDataUri(el, options);
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve({
                image,
                width: image.width,
                height: image.height
            });
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
    options?: Nullable<SvgExportOptions>,
): Promise<ImageInfo<HTMLCanvasElement>> {
    const { image: img } = await toImage(el, options);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', options && options.canvasSettings || undefined)!;
    // this should ensure the exported image has the same size regardless of the device
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = img.width * pixelRatio;
    canvas.height = img.height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.drawImage(img, 0, 0);

    return {
        image: canvas,
        width: canvas.width,
        height: canvas.height
    };
}

async function toRaster<TResult>(
    this: void,
    el: SVGGraphicsElement,
    options: Nullable<SvgExportOptions>,
    render: (canvas: HTMLCanvasElement, type: string, quality: number) => TResult | Promise<TResult>,
) {
    const { image: canvas, width, height } = await toCanvas(el, options);
    const {
        type = 'image/png',
        quality = .8
    } = options || {};
    return {
        image: await render(canvas, type, quality),
        width,
        height
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
