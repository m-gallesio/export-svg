const xmlNs = 'http://www.w3.org/2000/xmlns/';
const xhtmlNs = 'http://www.w3.org/1999/xhtml';
const svgNs = 'http://www.w3.org/2000/svg';
const xlinkNs = 'http://www.w3.org/1999/xlink';
const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
const urlRegex = /url\(["']?(.+?)["']?\)/;
const fontFormats: { [key: string]: string; } = {
    woff2: 'font/woff2',
    woff: 'font/woff',
    otf: 'application/x-font-opentype',
    ttf: 'application/x-font-ttf',
    eot: 'application/vnd.ms-fontobject',
    sfnt: 'application/font-sfnt',
    svg: 'image/svg+xml'
};

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

function ensureDomNode(
    this: void,
    el: any
): Promise<typeof el extends HTMLElement | SVGElement ? void : never> {
    return el instanceof HTMLElement || el instanceof SVGElement
        ? Promise.resolve()
        : Promise.reject(new Error(`an HTMLElement or SVGElement is required; got ${el}`));
}

function isExternal(
    url: string
) {
    return url && url.lastIndexOf('http', 0) === 0 && url.lastIndexOf(window.location.host) === -1;
}

function getFontMimeTypeFromUrl(
    this: void,
    fontUrl: string
) {
    const formats = Object.keys(fontFormats)
        .filter(extension => fontUrl.indexOf(`.${extension}`) > 0)
        .map(extension => fontFormats[extension]);
    if (formats)
        return formats[0];
    console.error(`Unknown font format for ${fontUrl}. Fonts may not be working correctly.`);
    return 'application/octet-stream';
}

function arrayBufferToBase64(
    this: void,
    buffer: Iterable<number>
) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++)
        binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

function getDimension(
    this: void,
    el: SVGSVGElement,
    clone: SVGGraphicsElement,
    dim: "width" | "height"
) {
    const v =
        (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
        (clone.getAttribute(dim) !== null && !clone.getAttribute(dim)!.match(/%$/) && parseInt(clone.getAttribute(dim)!)) ||
        el.getBoundingClientRect()[dim] ||
        parseInt(clone.style[dim]) ||
        parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return typeof v === 'undefined' || v === null || isNaN(Number(v)) ? 0 : v;
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

function query(
    this: void,
    el: Element,
    selector: string
) {
    if (selector) {
        try {
            return el.querySelector(selector) || el.parentNode?.querySelector(selector);
        }
        catch (err) {
            console.warn(`Invalid CSS selector "${selector}"`, err);
        }
    }
}

function detectCssFont(
    this: void,
    rule: CSSStyleRule,
    href: string | null | undefined
) {
    // Match CSS font-face rules to external links.
    // @font-face {
    //   src: local('Abel'), url(https://fonts.gstatic.com/s/abel/v6/UzN-iejR1VoXU2Oc-7LsbvesZW2xOQ-xsNqO47m55DA.woff2);
    // }
    const url = rule.cssText.match(urlRegex)?.[1] || '';
    if (!url || url.match(/^data:/) || url === 'about:blank')
        return null;

    let fullUrl: string;
    if (url.startsWith('../'))
        fullUrl = `${href}/../${url}`;
    else if (url.startsWith('./'))
        fullUrl = `${href}/${url}`;
    else
        fullUrl = url;

    return {
        text: rule.cssText,
        format: getFontMimeTypeFromUrl(fullUrl),
        url: fullUrl
    };
}

function inlineImages(
    this: void,
    el: SVGElement
) {
    return Promise.all(Array.from(el.querySelectorAll('image')).map(image => {
        let href = image.getAttributeNS(xlinkNs, 'href') || image.getAttribute('href');
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
            img.src = href || '';
        });
    }));
}

interface FontQueueElement {
    text: string;
    format: string;
    url: string;
}

const cachedFonts: { [key: string]: string | null; } = {};
function inlineFonts(
    this: void,
    fonts: FontQueueElement[]
) {
    return Promise.all(
        fonts.map(font => new Promise(resolve => {
            if (cachedFonts[font.url])
                return resolve(cachedFonts[font.url]);

            // TODO fetch
            const req = new XMLHttpRequest();
            req.addEventListener('load', () => {
                // TODO: it may also be worth it to wait until fonts are fully loaded before
                // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
                const fontInBase64 = arrayBufferToBase64(req.response);
                const fontUri = font.text.replace(urlRegex, `url("data:${font.format};base64,${fontInBase64}")`) + '\n';
                cachedFonts[font.url] = fontUri;
                resolve(fontUri);
            });
            req.addEventListener('error', e => {
                console.warn(`Failed to load font from: ${font.url}`, e);
                cachedFonts[font.url] = null;
                resolve(null);
            });
            req.addEventListener('abort', e => {
                console.warn(`Aborted loading font from: ${font.url}`, e);
                resolve(null);
            });
            req.open('GET', font.url);
            req.responseType = 'arraybuffer';
            req.send();
        })
        )
    ).then(fontCss => fontCss.filter(x => x).join(''));
}

interface CssRuleDefinition {
    rules?: CSSRuleList;
    href?: string | null;
}

let cachedRules: CssRuleDefinition[] | null | undefined = null;
function styleSheetRules(this: void) {
    return cachedRules ||= Array.from(document.styleSheets).map(sheet => {
        try {
            return { rules: sheet.cssRules, href: sheet.href };
        }
        catch (e) {
            console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
            return {};
        }
    });
}

interface CanvasEncoderOptions {
    /// A Number between 0 and 1 indicating image quality. The default is 0.8
    encoderOptions?: number;
    /// A DOMString indicating the image format. The default type is image/png.
    encoderType?: string;
}

interface CssOptions {
    /// Exclude all CSS rules
    excludeCss?: boolean;
    /// Exclude CSS rules that don't match any elements in the SVG.
    excludeUnusedCss?: boolean;
    /// A list of `{text, url, format}` objects the specify what fonts to inline in the SVG. Omitting this option defaults to auto-detecting font rules.
    fonts?: FontQueueElement[];
    /// A function that takes a CSS rule's selector and properties and returns a string of CSS. Supercedes `selectorRemap` and `modifyStyle`. Useful for modifying properties only for certain CSS selectors.
    modifyCss?(s: string): string;
    /// A function that takes a CSS rule's properties and returns a string of CSS. Useful for modifying properties before they're inlined into the SVG.
    modifyStyle?(s: string): string;
    /// A function that takes a CSS selector and produces its replacement in the CSS that's inlined into the SVG. Useful if your SVG style selectors are scoped by ancestor elements in your HTML document.
    selectorRemap?(s: string): string;
}

interface SvgExportOptions extends CanvasEncoderOptions, CssOptions {
    /// Creates a PNG with the given background color. Defaults to transparent.
    backgroundColor?: string;
    /// Specify the image's height. Defaults to the viewbox's height if given, or the element's non-percentage height, or the element's bounding box's height, or the element's CSS height, or the computed style's height, or 0.
    height?: number;
    /// Specify the viewbox's left position. Defaults to 0.
    left?: number;
    /// TODO
    responsive?: boolean;
    /// Changes the resolution of the output PNG. Defaults to `1`, the same dimensions as the source SVG.
    scale?: number;
    /// Specify the viewbox's top position. Defaults to 0.
    top?: number;
    /// Specify the image's width. Defaults to the viewbox's width if given, or the element's non-percentage width, or the element's bounding box's width, or the element's CSS width, or the computed style's width, or 0.
    width?: number;
}

function inlineCss(
    this: void,
    el: Element,
    options: CssOptions
) {
    const {
        selectorRemap,
        modifyStyle,
        modifyCss,
        fonts,
        excludeUnusedCss
    } = options || {};
    const generateCss = modifyCss || ((selector: string, properties: string) => {
        const sel = selectorRemap ? selectorRemap(selector) : selector;
        const props = modifyStyle ? modifyStyle(properties) : properties;
        return `${sel}{${props}}\n`;
    });
    const css: string[] = [];
    const detectFonts = typeof fonts === 'undefined';
    const fontList = fonts || [];

    for (const { rules, href } of styleSheetRules()) {
        if (!rules)
            continue;
        // TODO:
        // - split rule types
        // - do something for @media rules
        for (const r of rules) {
            const rule = r as CSSStyleRule;
            if (!rule.style)
                continue;

            if (query(el, rule.selectorText)) {
                css.push(generateCss(rule.selectorText, rule.style.cssText));
            }
            else if (detectFonts && rule.cssText.match(/^@font-face/)) {
                const font = detectCssFont(rule, href);
                if (font) {
                    fontList.push(font);
                }
            }
            else if (!excludeUnusedCss) {
                css.push(rule.cssText);
            }
        }
    }

    return inlineFonts(fontList).then(fontCss => css.join('\n') + fontCss);
}

function getDimensions(
    this: void,
    el: any,
    w: number | null | undefined,
    h: number | null | undefined,
    clone: typeof el
) {
    if (el instanceof SVGSVGElement) {
        return {
            width: w || getDimension(el, clone, 'width'),
            height: h || getDimension(el, clone, 'height'),
            clone
        };
    }
    if (el instanceof SVGGraphicsElement) {
        if (clone.getAttribute('transform') != null) {
            clone.setAttribute('transform', clone.getAttribute('transform')?.replace(/translate\(.*?\)/, '') || "");
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

function createStylesheet(
    this: void,
    css: string
) {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = `<![CDATA[\n${css}\n]]>`;
    return style;
}

function prepareSvg(
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
        let clone = el.cloneNode(true) as typeof el;
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
            const style = createStylesheet(css);

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

export function svgAsDataUri(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    return ensureDomNode(el)
        .then(() => prepareSvg(el, options))
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

interface ImageData {
    uri: string;
    width?: number;
    height?: number;
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
};

export function svgAsPngUri(
    this: void,
    el: SVGGraphicsElement,
    options: SvgExportOptions
) {
    return ensureDomNode(el)
        .then(() => svgAsDataUri(el, options))
        .then(({ uri }) => {
            return new Promise((resolve: (value: ImageData) => void, reject) => {
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
    generate: (this: void, el: SVGGraphicsElement, options: SvgExportOptions) => Promise<ImageData>
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
