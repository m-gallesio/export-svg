import { inlineCss } from "./inline/inlineCss";
import { inlineImages } from "./inline/inlineImages";
import { createStylesheet } from "./inline/styleSheetCache";
import type { ImageInfo, SvgExportOptions } from "./interfaces";
import { svgNs, xmlNs, xlinkNs, xhtmlNs } from "./namespaces";

function getDimensions(
    this: void,
    el: SVGElement,
    w: number | null | undefined,
    h: number | null | undefined,
    clone: typeof el
): ImageInfo<SVGSVGElement> | null {
    if (el instanceof SVGSVGElement) {
        return {
            width: w || getDimension(el, 'width'),
            height: h || getDimension(el, 'height'),
            image: clone as SVGSVGElement
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
            image: svg
        };
    }
    return null;
}

function getDimension(
    this: void,
    el: SVGSVGElement,
    dim: "width" | "height"
): number {
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
): void {
    if (!el.getAttribute(qualifiedName)) {
        el.setAttributeNS(namespace, qualifiedName, value);
    }
}

/** @internal */

export async function buildSvg(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
): Promise<ImageInfo<string>> {
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

    await inlineImages(el);
    let clone = el.cloneNode(true) as typeof el | SVGElement;
    clone.style.backgroundColor = backgroundColor || el.style.backgroundColor;

    const dim = getDimensions(el, w, h, clone);
    if (!dim) {
        throw new TypeError('Attempted to render non-SVG element');
    }

    const { width, height } = dim;
    clone = dim.image;

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

        return {
            image: outer.innerHTML,
            width,
            height
        };
    }

    const css = await inlineCss(el, options);
    const style = createStylesheet(`<![CDATA[\n${css}\n]]>`);

    const defs = document.createElement('defs');
    defs.appendChild(style);
    clone.insertBefore(defs, clone.firstChild);

    const outer = document.createElement('div');
    outer.appendChild(clone);

    return {
        image: outer.innerHTML.replace(/NS\d+:href/gi, `xmlns:xlink="${xlinkNs}" xlink:href`),
        width,
        height
    };
}
