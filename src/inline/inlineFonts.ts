import type { FontInfo } from "../interfaces";
import { RemoteCache } from "./cache";

const urlRegex = /url\(["']?(.+?)["']?\)/;
const fontFormats: Readonly<Record<string, string>> = Object.freeze({
    woff2: "font/woff2",
    woff: "font/woff",
    otf: "application/x-font-opentype",
    ttf: "application/x-font-ttf",
    eot: "application/vnd.ms-fontobject",
    sfnt: "application/font-sfnt",
    svg: "image/svg+xml"
});

function getFontMimeTypeFromUrl(
    this: void,
    fontUrl: string
): string {
    for (const entry of Object.entries(fontFormats)) {
        if (fontUrl.endsWith(`.${entry[0]}`))
            return entry[1];
    }
    console.error(`Unknown font format for ${fontUrl}. Fonts may not be working correctly.`);
    return "application/octet-stream";
}

function arrayBufferToBase64(
    this: void,
    buffer: ArrayBufferLike
): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++)
        binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

/** @internal */

export function detectCssFont(
    this: void,
    cssText: string,
    href: string | null,
    inlineAllFonts: boolean
): FontInfo | null {
    // TODO: implement this
    if (inlineAllFonts)
        throw new Error("The option 'inlineAllFonts' is not implemented yet.");

    const match = cssText.match(urlRegex);
    const url = match && match[1] || "";
    if (!url || url.match(/^data:/) || url === "about:blank")
        return null;

    let fullUrl: string;
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

const fontCache = new RemoteCache<FontInfo, string>(
    font => font.url,
    async function (
        this: void,
        font,
        response
    ) {
        const contents = await response.arrayBuffer();
        // TODO: it may also be worth it to wait until fonts are fully loaded before
        // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
        const fontInBase64 = arrayBufferToBase64(contents);
        return font.text.replace(urlRegex, `url("data:${font.format};base64,${fontInBase64}")`) + "\n";
    }
);

/** @internal */

export async function inlineFonts(
    this: void,
    fonts: FontInfo[]
): Promise<string> {
    return (await Promise.all(fonts.map(font => fontCache.get(font)))).join("");
}