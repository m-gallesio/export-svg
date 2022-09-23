import { detectCssFont, inlineFonts } from "./inlineFonts";
import type { CssOptions, FontInfo } from "./interfaces";

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
    return null;
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
