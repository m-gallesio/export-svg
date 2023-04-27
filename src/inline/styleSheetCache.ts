interface LoadedCssStyleSheet {
    rules: CSSRuleList | CSSRule[];
    href: string | null | undefined;
}

/** @internal */

export async function loadRemoteStyleSheet(
    this: void,
    href: string
): Promise<LoadedCssStyleSheet | null> {
    try {
        const response = await fetch(href);
        const contents = await response.text();
        // needs to be in the DOM to be read
        const element = document.body.appendChild(createStylesheet(contents));
        let loadedStyle: LoadedCssStyleSheet | null = null;
        if (element.sheet && element.sheet.cssRules) {
            loadedStyle = { rules: Array.from(element.sheet.cssRules), href };
        }
        element.remove();
        return loadedStyle;
    } 
    catch (e) {
        console.warn(`Stylesheet could not be loaded: ${href}`, e);
        return null;
    }
}

async function loadStyleSheetRules(
    this: void,
    sheet: CSSStyleSheet
): Promise<LoadedCssStyleSheet | null> {
    try {
        if (sheet.cssRules)
            return { rules: sheet.cssRules, href: sheet.href };
    }
    catch (e) {
        if (sheet.href) {
            return loadRemoteStyleSheet(sheet.href);
        }
        console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
    }
    return null;
}

let styleCache: LoadedCssStyleSheet[] | null | undefined = null;

/** @internal */

export async function getStyleSheets(
    this: void
): Promise<LoadedCssStyleSheet[]> {
    styleCache = styleCache || await Promise
        .all(Array.from(document.styleSheets)
            .filter(sheet => !sheet.media || window.matchMedia(sheet.media.toString()).matches)
            .map(loadStyleSheetRules))
        .then(all => all.filter(x => x) as LoadedCssStyleSheet[]);
    return styleCache!;
}

/** @internal */

export function createStylesheet(
    this: void,
    css: string
): HTMLStyleElement {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = css;
    return style;
}
