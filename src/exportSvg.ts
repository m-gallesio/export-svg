import type { CanvasEncoderOptions, RenderedImageInfo, SvgExportOptions } from "./interfaces";
import { buildSvg } from "./buildSvg";

const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';

function ensureDomNode(
    this: void,
    el: any
): Promise<typeof el extends HTMLElement | SVGElement ? void : never> {
    return el instanceof HTMLElement || el instanceof SVGElement
        ? Promise.resolve()
        : Promise.reject(new Error(`an HTMLElement or SVGElement is required; got ${el}`));
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

export function svgAsDataUri(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    return ensureDomNode(el)
        .then(() => buildSvg(el, options))
        .then(output => {
            const {
                src,
                width,
                height
            } = output || {};
            const uri = `data:image/svg+xml;base64,${window.btoa(reEncode(doctype + src))}`;
            return { uri, width, height };
        });
}

function toRasterDataUrl(
    this: void,
    src: HTMLImageElement,
    options: CanvasEncoderOptions
) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = src.width * pixelRatio;
    canvas.height = src.height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.drawImage(src, 0, 0);

    const {
        encoderType = 'image/png',
        encoderOptions = 0.8
    } = options || {};
    const uri = canvas.toDataURL(encoderType, encoderOptions);
    return { uri, width: canvas.width, height: canvas.height };
}

export function svgAsPngUri(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    return ensureDomNode(el)
        .then(() => svgAsDataUri(el, options))
        .then(({ uri }) => {
            return new Promise((resolve: (value: RenderedImageInfo) => void, reject) => {
                const image = new Image();
                image.onload = () => {
                    resolve(toRasterDataUrl(image, options));
                };
                image.onerror = () => {
                    reject(`There was an error loading the data URI as an image on the following SVG\n${window.atob(uri.slice(26))}Open the following link to see browser's diagnosis\n${uri}`);
                };
                image.src = uri;
            });
        });
}

function download(
    this: void,
    name: string,
    uri: string
) {
    const saveLink = document.createElement('a');
    if ('download' in saveLink) {
        saveLink.download = name;
        saveLink.style.display = 'none';
        document.body.appendChild(saveLink);
        fetch(uri)
            .then(data => data.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                saveLink.href = url;
                saveLink.onclick = () => requestAnimationFrame(() => URL.revokeObjectURL(url));
            })
            .catch(e => {
                console.error(e);
                console.warn('Error while getting object URL. Falling back to string URL.');
                saveLink.href = uri;
            })
            .then(() => {
                saveLink.click();
                document.body.removeChild(saveLink);
            });
    }
    else {
        const popup = window.open()!;
        popup.document.title = name;
        popup.location.replace(uri);
    }
}

function exportAndDownload(
    this: void,
    el: SVGGraphicsElement,
    name: string,
    options: SvgExportOptions,
    generate: (this: void, el: SVGGraphicsElement, options: SvgExportOptions) => Promise<RenderedImageInfo>
) {
    return ensureDomNode(el)
        .then(() => generate(el, options || {}))
        .then(({ uri }) => download(name, uri));
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
