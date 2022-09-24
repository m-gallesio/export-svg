import { createStylesheet, inlineCss } from "./inlineStyle";
import type { SvgExportOptions } from "./interfaces";

const xmlNs = 'http://www.w3.org/2000/xmlns/';
const xhtmlNs = 'http://www.w3.org/1999/xhtml';
const svgNs = 'http://www.w3.org/2000/svg';
const xlinkNs = 'http://www.w3.org/1999/xlink';

function isExternal(
    url: string | null | undefined
): url is string {
    return Boolean(url && url.lastIndexOf('http', 0) === 0 && url.lastIndexOf(window.location.host) === -1);
}

function inlineImages(
    this: void,
    el: SVGElement
) {
    return Promise.all(Array.from(el.querySelectorAll('image')).map(image => {
        let href = image.getAttributeNS(xlinkNs, 'href') || image.getAttribute('href') || '';
        if (!href) {
            return Promise.resolve(null);
        }
        if (isExternal(href)) {
            href += (href.indexOf('?') === -1 ? '?' : '&') + 't=' + new Date().valueOf();
        }
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onerror = () => reject(new Error(`Could not load ${href}`));
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d')!.drawImage(img, 0, 0);
                image.setAttributeNS(xlinkNs, 'href', canvas.toDataURL('image/png'));
                resolve(true);
            };
            img.src = href;
        });
    }));
}

function getDimensions(
    this: void,
    el: SVGElement,
    w: number | null | undefined,
    h: number | null | undefined,
    clone: typeof el
) {
    if (el instanceof SVGSVGElement) {
        return {
            width: w || getDimension(el, 'width'),
            height: h || getDimension(el, 'height'),
            clone: clone as SVGSVGElement
        };
    }
    if (el instanceof SVGGraphicsElement) {
        if (clone.hasAttribute('transform')) {
            clone.setAttribute('transform', clone.getAttribute('transform')!.replace(/translate\(.*?\)/, ''));
        }
        const svg = document.createElementNS(svgNs, 'svg');
        svg.appendChild(clone);
        const bb = el.getBBox();
        return {
            width: bb.x + bb.width,
            height: bb.y + bb.height,
            clone: svg
        };
    }
    return null;
}

function getDimension(
    this: void,
    el: SVGSVGElement,
    dim: "width" | "height"
) {
    const v =
        (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
        (el.getAttribute(dim) && !el.getAttribute(dim)!.match(/%$/) && parseInt(el.getAttribute(dim)!)) ||
        el.getBoundingClientRect()[dim] ||
        parseInt(el.style[dim]) ||
        parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return typeof v === 'undefined' || v === null || isNaN(Number(v)) ? 0 : v;
}

function ensureAttributeNS(
    this: void,
    el: Element,
    namespace: string | null,
    qualifiedName: string,
    value: string
) {
    if (!el.getAttribute(qualifiedName)) {
        el.setAttributeNS(namespace, qualifiedName, value);
    }
}

/** @internal */

export function prepareSvg(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    const {
        left = 0,
        top = 0,
        width: w,
        height: h,
        scale = 1,
        backgroundColor,
        responsive = false,
        excludeCss = false,
    } = options || {};

    return inlineImages(el).then(() => {
        let clone = el.cloneNode(true) as typeof el | SVGElement;
        clone.style.backgroundColor = backgroundColor || el.style.backgroundColor;

        const dim = getDimensions(el, w, h, clone);
        if (!dim) {
            console.error('Attempted to render non-SVG element', el);
            return;
        }

        const { width, height } = dim;
        clone = dim.clone;

        clone.setAttribute('version', '1.1');
        clone.setAttribute('viewBox', [left, top, width, height].join(' '));
        ensureAttributeNS(clone, xmlNs, 'xmlns', svgNs);
        ensureAttributeNS(clone, xmlNs, 'xmlns:xlink', xlinkNs);

        if (responsive) {
            clone.removeAttribute('width');
            clone.removeAttribute('height');
            clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        }
        else {
            clone.setAttribute('width', (width * scale).toString());
            clone.setAttribute('height', (height * scale).toString());
        }

        for (const foreignObject of clone.querySelectorAll('foreignObject > *')) {
            ensureAttributeNS(foreignObject, xmlNs, 'xmlns', foreignObject.tagName === 'svg' ? svgNs : xhtmlNs);
        }

        if (excludeCss) {
            const outer = document.createElement('div');
            outer.appendChild(clone);
            const src = outer.innerHTML;

            return { src, width, height };
        }

        return inlineCss(el, options).then(css => {
            const style = createStylesheet(`<![CDATA[\n${css}\n]]>`);

            const defs = document.createElement('defs');
            defs.appendChild(style);
            clone.insertBefore(defs, clone.firstChild);

            const outer = document.createElement('div');
            outer.appendChild(clone);
            const src = outer.innerHTML.replace(/NS\d+:href/gi, `xmlns:xlink="${xlinkNs}" xlink:href`);

            return { src, width, height };
        });
    });
}
