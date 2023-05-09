const xmlNs = "http://www.w3.org/2000/xmlns/";
const xhtmlNs = "http://www.w3.org/1999/xhtml";
const svgNs = "http://www.w3.org/2000/svg";
const xlinkNs = "http://www.w3.org/1999/xlink";

class RemoteCache {
    constructor(accessor, reader) {
        this.accessor = accessor;
        this.reader = reader;
        this.content = {};
    }
    async get(source) {
        const url = this.accessor(source);
        if (this.content[url])
            return this.content[url];
        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error("Fetch error: " + response.status);
            const data = await this.reader(source, response);
            this.content[url] = data;
            return data;
        }
        catch (e) {
            console.warn(`Failed to load data from: ${url}`, e);
            return null;
        }
    }
}

const urlRegex = /url\(["']?(.+?)["']?\)/;
const fontFormats = Object.freeze({
    woff2: "font/woff2",
    woff: "font/woff",
    otf: "application/x-font-opentype",
    ttf: "application/x-font-ttf",
    eot: "application/vnd.ms-fontobject",
    sfnt: "application/font-sfnt",
    svg: "image/svg+xml"
});
function getFontMimeTypeFromUrl(fontUrl) {
    for (const entry of Object.entries(fontFormats)) {
        if (fontUrl.endsWith(`.${entry[0]}`))
            return entry[1];
    }
    console.error(`Unknown font format for ${fontUrl}. Fonts may not be working correctly.`);
    return "application/octet-stream";
}
function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++)
        binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}
function detectCssFont(cssText, href, inlineAllFonts) {
    if (inlineAllFonts)
        throw new Error("The option 'inlineAllFonts' is not implemented yet.");
    const match = cssText.match(urlRegex);
    const url = match && match[1] || "";
    if (!url || url.match(/^data:/) || url === "about:blank")
        return null;
    let fullUrl;
    if (url.startsWith("../"))
        fullUrl = `${href}/../${url}`;
    else if (url.startsWith("./"))
        fullUrl = `${href}/${url}`;
    else
        fullUrl = url;
    fullUrl = fullUrl.toLowerCase();
    return {
        text: cssText,
        format: getFontMimeTypeFromUrl(fullUrl),
        url: fullUrl
    };
}
const fontCache = new RemoteCache(font => font.url, async function (font, response) {
    const contents = await response.arrayBuffer();
    const fontInBase64 = arrayBufferToBase64(contents);
    return font.text.replace(urlRegex, `url("data:${font.format};base64,${fontInBase64}")`) + "\n";
});
async function inlineFonts(fonts) {
    return (await Promise.all(fonts.map(font => fontCache.get(font)))).join("");
}

const styleCache = new RemoteCache(href => href, async function (href, response) {
    const contents = await response.text();
    const element = document.body.appendChild(createStylesheet(contents));
    const loadedStyle = {
        href,
        rules: (element.sheet && element.sheet.cssRules)
            ? Array.from(element.sheet.cssRules)
            : []
    };
    element.remove();
    return loadedStyle;
});
async function loadStyleSheetRules(sheet) {
    try {
        if (sheet.cssRules)
            return { rules: sheet.cssRules, href: sheet.href };
    }
    catch (e) {
        if (sheet.href) {
            return styleCache.get(sheet.href);
        }
        console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
    }
    return null;
}
async function getStyleSheets() {
    return Promise
        .all(Array.from(document.styleSheets)
        .filter(sheet => !sheet.media.length || matchMedia(sheet.media.mediaText).matches)
        .map(loadStyleSheetRules))
        .then(all => all.filter(x => x));
}
function createStylesheet(css) {
    const style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.innerHTML = css;
    return style;
}

function query(el, selector) {
    if (selector) {
        try {
            return el.querySelector(selector) || el.parentNode && el.parentNode.querySelector(selector);
        }
        catch (err) {
            console.warn(`Invalid CSS selector "${selector}"`, err);
        }
    }
    return null;
}
function processCssRule(rule, el, generateCss, css) {
    if (rule.style) {
        if (query(el, rule.selectorText)) {
            css.push(generateCss(rule.selectorText, rule.style.cssText));
            return true;
        }
        return false;
    }
    return true;
}
function processCssFontFaceRule(rule, href, fontList, options) {
    if (options.detectFonts) {
        const font = detectCssFont(rule.cssText, href, options.inlineAllFonts);
        if (font) {
            fontList.push(font);
        }
    }
    return true;
}
async function processCssMediaRule(rule, el, href, accumulator, options) {
    if (matchMedia(rule.conditionText).matches) {
        await processRuleList(rule.cssRules, href, el, accumulator, options);
    }
    return true;
}
async function processCssSupportsRule(rule, el, href, accumulator, options) {
    if ("supports" in CSS && CSS.supports(rule.conditionText)) {
        await processRuleList(rule.cssRules, href, el, accumulator, options);
    }
    return true;
}
async function processCssImportRule(rule, el, accumulator, options) {
    if (!rule.media.length || matchMedia(rule.media.mediaText).matches) {
        try {
            const style = await styleCache.get(rule.href);
            if (style)
                await processRuleList(style.rules, rule.href, el, accumulator, options);
        }
        catch (err) {
            console.warn(`Could not load @imported stylesheet from "${rule.href}"`, err);
        }
    }
    return true;
}
async function processRuleList(rules, href, el, accumulator, options) {
    for (const rule of rules) {
        let isProcessed = false;
        if (rule instanceof CSSStyleRule) {
            isProcessed = processCssRule(rule, el, options.generateCss, accumulator.css);
        }
        else if (rule instanceof CSSMediaRule) {
            isProcessed = await processCssMediaRule(rule, el, href, accumulator, options);
        }
        else if (rule instanceof CSSFontFaceRule) {
            isProcessed = processCssFontFaceRule(rule, href, accumulator.fonts, options);
        }
        else if (rule instanceof CSSSupportsRule) {
            isProcessed = await processCssSupportsRule(rule, el, href, accumulator, options);
        }
        else if (rule instanceof CSSImportRule) {
            isProcessed = await processCssImportRule(rule, el, accumulator, options);
        }
        if (!isProcessed && !options.excludeUnusedCss) {
            accumulator.css.push(rule.cssText);
        }
    }
}
const defaultGenerateCss = (selector, properties) => `${selector}{${properties}}\n`;
function getGenerateCss(modifyCss) {
    if (typeof modifyCss === "function") {
        return modifyCss;
    }
    if (modifyCss) {
        const identity = (s) => s;
        const { selectorRemap = identity, modifyStyle = identity } = modifyCss;
        return (selector, properties) => defaultGenerateCss(selectorRemap(selector), modifyStyle(properties));
    }
    return defaultGenerateCss;
}
async function inlineCss(el, options) {
    const { modifyCss, fonts, inlineAllFonts = false, excludeUnusedCss = false } = options || {};
    const acc = {
        css: [],
        fonts: fonts || []
    };
    const opts = {
        generateCss: getGenerateCss(modifyCss),
        excludeUnusedCss,
        detectFonts: !fonts,
        inlineAllFonts
    };
    const styles = await getStyleSheets();
    for (const { rules, href } of styles) {
        await processRuleList(rules, href, el, acc, opts);
    }
    const fontCss = await inlineFonts(acc.fonts);
    return acc.css.join("\n") + fontCss;
}

function isExternal(url) {
    return Boolean(url && url.lastIndexOf("http", 0) === 0 && url.lastIndexOf(location.host) === -1);
}
function inlineImage(image, href) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d").drawImage(img, 0, 0);
            image.removeAttribute("href");
            image.setAttributeNS(xlinkNs, "href", canvas.toDataURL("image/png"));
            resolve();
        };
        img.onerror = () => {
            reject(new Error(`Could not load ${href}`));
        };
        img.src = href;
    });
}
function inlineImages(el) {
    const toLoad = [];
    for (const image of el.querySelectorAll("image")) {
        let href = image.getAttribute("href") || image.getAttributeNS(xlinkNs, "href") || "";
        if (href) {
            if (isExternal(href)) {
                href += (href.indexOf("?") === -1 ? "?" : "&") + "t=" + new Date().valueOf();
            }
            toLoad.push(inlineImage(image, href));
        }
    }
    return Promise.all(toLoad);
}

function getDimension(el, dim) {
    let attr;
    const v = (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
        ((attr = el.getAttribute(dim)) && attr.match(/%$/) && parseInt(attr)) ||
        el.getBoundingClientRect()[dim] ||
        parseInt(el.style[dim]) ||
        parseInt(getComputedStyle(el).getPropertyValue(dim));
    return v === undefined || v === null || isNaN(Number(v)) ? 0 : v;
}
function getDimensions(el, w, h, clone) {
    if (el instanceof SVGSVGElement) {
        return {
            width: w || getDimension(el, "width"),
            height: h || getDimension(el, "height"),
            svg: clone
        };
    }
    if (el instanceof SVGGraphicsElement) {
        if (clone.hasAttribute("transform")) {
            clone.setAttribute("transform", clone.getAttribute("transform").replace(/translate\(.*?\)/, ""));
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
function ensureAttributeNS(el, namespace, qualifiedName, value) {
    if (!el.getAttribute(qualifiedName)) {
        el.setAttributeNS(namespace, qualifiedName, value);
    }
}
async function svgToInlinedSvg(el, options) {
    if (!(el instanceof HTMLElement || el instanceof SVGElement))
        throw new TypeError(`an HTMLElement or SVGElement is required; got ${el}`);
    const { left = 0, top = 0, width: w, height: h, scale = 1, backgroundColor, responsive = false, excludeCss = false, } = options || {};
    const clone = el.cloneNode(true);
    await inlineImages(clone);
    clone.style.backgroundColor = backgroundColor || el.style.backgroundColor;
    const { svg, width, height } = getDimensions(el, w, h, clone);
    svg.setAttribute("version", "1.1");
    svg.setAttribute("viewBox", [left, top, width, height].join(" "));
    ensureAttributeNS(svg, xmlNs, "xmlns", svgNs);
    ensureAttributeNS(svg, xmlNs, "xmlns:xlink", xlinkNs);
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
        ensureAttributeNS(svgContent, xmlNs, "xmlns:xlink", xlinkNs);
    }
    for (const htmlContent of svg.querySelectorAll("foreignObject > *:not(svg)")) {
        ensureAttributeNS(htmlContent, xmlNs, "xmlns", xhtmlNs);
    }
    if (!excludeCss) {
        const css = await inlineCss(el, options);
        const style = createStylesheet(`<![CDATA[\n${css}\n]]>`);
        const defs = document.createElement("defs");
        defs.appendChild(style);
        svg.insertBefore(defs, svg.firstChild);
    }
    return svg;
}

const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
function reEncode(data) {
    return decodeURIComponent(encodeURIComponent(data)
        .replace(/%([0-9A-F]{2})/g, (_, p1) => {
        const c = String.fromCharCode(Number("0x" + p1));
        return c === "%" ? "%25" : c;
    }));
}
function inlinedSvgToDataUri(el) {
    return `data:image/svg+xml;base64,${btoa(reEncode(doctype + el.outerHTML))}`;
}
async function svgToInlinedSvgDataUri(el, options) {
    const svg = await svgToInlinedSvg(el, options);
    return inlinedSvgToDataUri(svg);
}
async function dataUriToImage(dataUri) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve(img);
        };
        img.onerror = () => {
            reject(`Error loading data uri as image:\n${atob(dataUri.slice(26))}\nOpen the following link to see browser's diagnosis\n${dataUri}`);
        };
        img.src = dataUri;
    });
}
function imageToCanvas(img, options) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", options && options.canvasSettings || undefined);
    const pixelRatio = devicePixelRatio || 1;
    canvas.width = img.width * pixelRatio;
    canvas.height = img.height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.drawImage(img, 0, 0);
    return canvas;
}
const defaultEncoderOptions = Object.freeze({
    type: "image/png",
    quality: .8
});
function ensureOptions(options) {
    return Object.assign({}, defaultEncoderOptions, options);
}
function canvasToRasterDataUri(canvas, options) {
    const { type, quality } = ensureOptions(options);
    return canvas.toDataURL(type, quality);
}
async function canvasToRasterBlob(canvas, options) {
    const { type, quality } = ensureOptions(options);
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob
            ? resolve(blob)
            : reject(`Error converting SVG data URI to blob`), type, quality);
    });
}

async function svgToCanvas(el, options) {
    const dataUri = await svgToInlinedSvgDataUri(el, options);
    const image = await dataUriToImage(dataUri);
    return imageToCanvas(image);
}
async function svgToRasterDataUri(el, options) {
    return canvasToRasterDataUri(await svgToCanvas(el, options), options);
}
async function svgToRasterBlob(el, options) {
    return canvasToRasterBlob(await svgToCanvas(el, options), options);
}

async function download(name, content) {
    const saveLink = document.createElement("a");
    saveLink.download = name;
    saveLink.style.display = "none";
    document.body.appendChild(saveLink);
    const blob = content instanceof Blob
        ? content
        : await (await fetch(content)).blob();
    const url = URL.createObjectURL(blob);
    saveLink.href = url;
    saveLink.onclick = () => requestAnimationFrame(() => {
        document.body.removeChild(saveLink);
        URL.revokeObjectURL(url);
    });
    saveLink.click();
}
async function downloadSvg(el, name, options) {
    return download(name, await svgToInlinedSvgDataUri(el, options));
}
async function downloadSvgAsRaster(el, name, options) {
    return download(name, await svgToRasterBlob(el, options));
}

export { canvasToRasterBlob, canvasToRasterDataUri, dataUriToImage, download, downloadSvg, downloadSvgAsRaster, imageToCanvas, inlinedSvgToDataUri, svgNs, svgToInlinedSvg, svgToInlinedSvgDataUri, svgToRasterBlob, svgToRasterDataUri, xhtmlNs, xlinkNs, xmlNs };
