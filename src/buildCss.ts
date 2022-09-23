import type { CssOptions, FontInfo } from "./interfaces";

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
    buffer: ArrayBufferLike
) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++)
        binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
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
    cssText: string,
    href: string | null | undefined
): FontInfo | null | undefined {
    // Match CSS font-face rules to external links.
    // @font-face {
    //   src: local('Abel'), url(https://fonts.gstatic.com/s/abel/v6/UzN-iejR1VoXU2Oc-7LsbvesZW2xOQ-xsNqO47m55DA.woff2);
    // }
    const url = cssText.match(urlRegex)?.[1] || '';
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
        text: cssText,
        format: getFontMimeTypeFromUrl(fullUrl),
        url: fullUrl
    };
}

const cachedFonts: { [key: string]: string | null; } = {};

function loadFont(
    this: void,
    font: FontInfo
) {
    if (cachedFonts[font.url])
        return Promise.resolve(cachedFonts[font.url]);

    return fetch(font.url)
        .then(response => response.ok ? response.arrayBuffer() : Promise.reject())
        .then(responseContent => {
            // TODO: it may also be worth it to wait until fonts are fully loaded before
            // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
            const fontInBase64 = arrayBufferToBase64(responseContent);
            const fontUri = font.text.replace(urlRegex, `url("data:${font.format};base64,${fontInBase64}")`) + '\n';
            cachedFonts[font.url] = fontUri;
            return fontUri;
        })
        .catch(e => {
            console.warn(`Failed to load font from: ${font.url}`, e);
            cachedFonts[font.url] ||= '';
            return '';
        })
        .then(() => cachedFonts[font.url]);
}

function inlineFonts(
    this: void,
    fonts: FontInfo[]
) {
    return Promise
        .all(fonts.map(loadFont))
        .then(fontCss => fontCss.join(''));
}

interface LoadedCssStyleSheet {
    rules: CSSRuleList;
    href: string | null | undefined;
}

let cachedRules: LoadedCssStyleSheet[] | null | undefined = null;
function styleSheetRules(
    this: void
) {
    if (!cachedRules) {
        const rules: LoadedCssStyleSheet[] = [];
        for (const sheet of document.styleSheets) {
            try {
                if (sheet.cssRules)
                    rules.push({ rules: sheet.cssRules, href: sheet.href });
                // TODO: manual remote loading
            }
            catch (e) {
                console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
            }
        }
        cachedRules = rules;
    }
    return cachedRules;
}

function processCssRule(
    this: void,
    rule: CSSStyleRule,
    el: Element,
    generateCss: (selector: string, properties: string) => string,
    css: string[]
) {
    if (rule.style) {
        if (query(el, rule.selectorText)) {
            css.push(generateCss(rule.selectorText, rule.style.cssText));
            return true;
        }
        return false;
    }
    return true;
}

function processCssFontFaceRule(
    this: void,
    rule: CSSFontFaceRule,
    href: string | null | undefined,
    fontList: FontInfo[]
) {
    const font = detectCssFont(rule.cssText, href);
    if (font) {
        fontList.push(font);
    }
    return true;
}

function processCssMediaRule(
    this: void,
    rule: CSSMediaRule,
) {
    // TODO recurse
}

/** @internal */

export function inlineCss(
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
    const detectFonts = !Boolean(fonts);
    const fontList = fonts || [];

    for (const { rules, href } of styleSheetRules()) {
        // TODO:
        // - split rule types
        // - do something for @media rules
        for (const rule of rules) {
            let isProcessed = false;
            if (rule instanceof CSSStyleRule) {
                isProcessed = processCssRule(rule, el, generateCss, css);
            }
            else if (rule instanceof CSSFontFaceRule) {
                if (detectFonts)
                    processCssFontFaceRule(rule, href, fontList);
                isProcessed = true;
            }
            else if (rule instanceof CSSMediaRule) {
                // TODO
            }
            else if (rule instanceof CSSSupportsRule) {
                // TODO
            }
            else if (rule instanceof CSSImportRule) {
                // TODO
            }

            if (!isProcessed && !excludeUnusedCss) {
                css.push(rule.cssText);
            }
        }
    }

    return inlineFonts(fontList).then(fontCss => css.join('\n') + fontCss);
}

/** @internal */

export function createStylesheet(
    this: void,
    css: string
) {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = `<![CDATA[\n${css}\n]]>`;
    return style;
}
