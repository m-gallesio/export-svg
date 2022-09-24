interface LoadedCssStyleSheet {
    rules: CSSRuleList | CSSRule[];
    href: string | null | undefined;
}

function loadRemoteStyleSheet(
    this: void,
    href: string
) {
    return fetch(href)
        .then(response => response.text())
        .then(contents => {
            // needs to be in the DOM to be read
            const element = document.body.appendChild(createStylesheet(contents));
            let loadedStyle: LoadedCssStyleSheet | null = null;
            if (element.sheet && element.sheet.cssRules) {
                loadedStyle = { rules: Array.from(element.sheet.cssRules), href };
            }
            element.remove();
            return loadedStyle;
        })
        .catch(e => {
            console.warn(`Stylesheet could not be loaded: ${href}`, e);
            return null;
        });
}

function loadStyleSheetRules(
    this: void,
    sheet: CSSStyleSheet
) {
    try {
        if (sheet.cssRules)
            return Promise.resolve({ rules: sheet.cssRules, href: sheet.href });
    }
    catch (e) {
        if (sheet.href) {
            return loadRemoteStyleSheet(sheet.href);
        }
        console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
    }
    return Promise.resolve(null);
}

let styleCache: LoadedCssStyleSheet[] | null | undefined = null;

/** @internal */

export function getStyleSheets(
    this: void
) {
    return styleCache
        ? Promise.resolve(styleCache)
        : Promise
            .all(Array.from(document.styleSheets)
                .filter(sheet => !sheet.media || window.matchMedia(sheet.media.toString()).matches)
                .map(loadStyleSheetRules))
            .then(all => {
                styleCache = all.filter(x => x) as LoadedCssStyleSheet[];
                return styleCache;
            });
}

/** @internal */

export function createStylesheet(
    this: void,
    css: string
) {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = css;
    return style;
}
