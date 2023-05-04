import { RemoteCache } from "./cache";

type CSSRules = CSSRuleList | CSSRule[];

interface LoadedCssStyleSheet {
    rules: CSSRules;
    href: string | null;
}

/** @internal */

export const styleCache = new RemoteCache<string, LoadedCssStyleSheet>(
    href => href,
    async function (
        this: void,
        href,
        response
    ) {
        const contents = await response.text();
        // needs to be in the DOM to be read
        const element = document.body.appendChild(createStylesheet(contents));
        const loadedStyle: LoadedCssStyleSheet = {
            href,
            rules: (element.sheet && element.sheet.cssRules)
                // make collection concrete
                ? Array.from(element.sheet.cssRules)
                : []
        };
        element.remove();
        return loadedStyle;
    }
);

async function loadStyleSheetRules(
    this: void,
    sheet: CSSStyleSheet
): Promise<LoadedCssStyleSheet | null> {
    // can fail due to cross-origin requests...
    try {
        if (sheet.cssRules)
            return { rules: sheet.cssRules, href: sheet.href };
    }
    // ...in which case we fetch and build the style
    catch (e) {
        if (sheet.href) {
            return styleCache.get(sheet.href);
        }
        console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
    }
    return null;
}

/** @internal */

export async function getStyleSheets(
    this: void
): Promise<LoadedCssStyleSheet[]> {
    return Promise
        .all(Array.from(document.styleSheets)
            .filter(sheet => !sheet.media.length || matchMedia(sheet.media.mediaText).matches)
            .map(loadStyleSheetRules))
        .then(all => all.filter(x => x) as LoadedCssStyleSheet[]);
}

/** @internal */

export function createStylesheet(
    this: void,
    css: string
): HTMLStyleElement {
    const style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.innerHTML = css;
    return style;
}
