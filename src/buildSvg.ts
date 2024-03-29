import { inlineCss } from "./inline/inlineCss";
import { inlineImages } from "./inline/inlineImages";
import { createStylesheet } from "./inline/styleSheetHelper";
import type { SvgToInlinedSvgOptions } from "./interfaces";
import { svgNs, xmlNs, xlinkNs, xhtmlNs } from "./namespaces";

function getDimension(
    this: void,
    el: SVGSVGElement,
    dim: "width" | "height"
): number {
    let attr: string | null;
    const v =
        (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
        ((attr = el.getAttribute(dim)) && attr.match(/%$/) && parseInt(attr)) ||
        el.getBoundingClientRect()[dim] ||
        parseInt(el.style[dim]) ||
        parseInt(getComputedStyle(el).getPropertyValue(dim));
    return v === undefined || v === null || isNaN(Number(v)) ? 0 : v;
}

function getDimensions(
    this: void,
    el: SVGGraphicsElement,
    w: number | null | undefined,
    h: number | null | undefined,
    clone: typeof el
): { width: number; height: number; svg: SVGSVGElement; } {
    if (el instanceof SVGSVGElement) {
        return {
            width: w || getDimension(el, "width"),
            height: h || getDimension(el, "height"),
            svg: clone as SVGSVGElement
        };
    }
    if (el instanceof SVGGraphicsElement) {
        if (clone.hasAttribute("transform")) {
            clone.setAttribute("transform", clone.getAttribute("transform")!.replace(/translate\(.*?\)/, ""));
        }
        const svg = document.createElementNS(svgNs, "svg");
        svg.appendChild(clone);
        const bb = el.getBBox();
        return {
            width: bb.x + bb.width,
            height: bb.y + bb.height,
            svg
        };
    }
    throw new TypeError("Attempted to render non-SVG element");
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

/** Inlines all external resources into the SVG. */
export async function svgToInlinedSvg(
    this: void,
    el: SVGGraphicsElement,
    options?: Readonly<SvgToInlinedSvgOptions> | null
): Promise<SVGSVGElement> {

    if (!(el instanceof HTMLElement || el instanceof SVGElement))
        throw new TypeError(`an HTMLElement or SVGElement is required; got ${el}`);

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

    const clone = el.cloneNode(true) as typeof el;
    await inlineImages(clone);
    clone.style.backgroundColor = backgroundColor || el.style.backgroundColor;

    const { svg, width, height } = getDimensions(el, w, h, clone);

    svg.removeAttribute("version");
    svg.setAttribute("viewBox", [left, top, width, height].join(" "));
    ensureAttributeNS(svg, xmlNs, "xmlns", svgNs);
    svg.removeAttribute("xmlns:xlink");

    if (responsive) {
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    }
    else {
        svg.setAttribute("width", (width * scale).toString());
        svg.setAttribute("height", (height * scale).toString());
    }

    for (const svgContent of svg.querySelectorAll("svg")) {
        ensureAttributeNS(svgContent, xmlNs, "xmlns", svgNs);
    }

    for (const htmlContent of svg.querySelectorAll("foreignObject > *:not(svg)")) {
        ensureAttributeNS(htmlContent, xmlNs, "xmlns", xhtmlNs);
    }

    if (!excludeCss) {
        // do NOT pass the cloned element, it needs to be attached to the DOM do detect styles
        const css = await inlineCss(el, options);
        const style = createStylesheet(`<![CDATA[\n${css}\n]]>`);
        const defs = document.createElement("defs");
        defs.appendChild(style);
        svg.insertBefore(defs, svg.firstChild);
    }

    return svg;
}
