import type { FontInfo } from "../interfaces";

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

/** @internal */

export function detectCssFont(
    this: void,
    cssText: string,
    href: string | null | undefined,
    inlineAllFonts: boolean
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

async function loadFont(
    this: void,
    font: FontInfo
) {
    if (!cachedFonts[font.url]) {
        try {
            const response = await fetch(font.url);
            const responseContent = await (response.ok ? response.arrayBuffer() : Promise.reject());
            // TODO: it may also be worth it to wait until fonts are fully loaded before
            // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
            const fontInBase64 = arrayBufferToBase64(responseContent);
            const fontUri = font.text.replace(urlRegex, `url("data:${font.format};base64,${fontInBase64}")`) + '\n';
            cachedFonts[font.url] = fontUri;
        } 
        catch (e) {
            console.warn(`Failed to load font from: ${font.url}`, e);
            cachedFonts[font.url] ||= '';
            '';
        }
    }
    return cachedFonts[font.url];
}

/** @internal */

export async function inlineFonts(
    this: void,
    fonts: FontInfo[]
) {
    const fontCss = await Promise
        .all(fonts.map(loadFont));
    return fontCss.join('');
}