import type { CssOptions, FontQueueElement } from "./interfaces";

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
    buffer: Iterable<number>
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

export function createStylesheet(
    this: void,
    css: string
) {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = `<![CDATA[\n${css}\n]]>`;
    return style;
}

