import { detectCssFont, inlineFonts } from "./inlineFonts";
import type { CssOptions, FontInfo } from "../interfaces";
import { getStyleSheets } from "./styleSheetCache";

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
    detectFonts: boolean,
    href: string | null | undefined,
    fontList: FontInfo[]
) {
    if (detectFonts) {
        const font = detectCssFont(rule.cssText, href);
        if (font) {
            fontList.push(font);
        }
    }
    return true;
}

interface CssLoadingAccumulator {
    css: string[],
    fonts: FontInfo[];
}

interface CssLoadingOptions {
    generateCss: (selector: string, properties: string) => string,
    detectFonts: boolean,
    excludeUnusedCss: boolean | null | undefined;
}

function processCssMediaRule(
    this: void,
    rule: CSSMediaRule,
    el: Element,
    href: string | null | undefined,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
) {
    if (window.matchMedia(rule.conditionText).matches) {
        processRuleList(rule.cssRules, href, el, accumulator, options);
    }
    return true;
}

function processCssSupportsRule(
    this: void,
    rule: CSSSupportsRule,
    el: Element,
    href: string | null | undefined,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
) {
    if ('supports' in CSS && CSS.supports(rule.conditionText)) {
        processRuleList(rule.cssRules, href, el, accumulator, options);
    }
    return true;
}

function processRuleList(
    this: void,
    rules: CSSRuleList | CSSRule[],
    href: string | null | undefined,
    el: Element,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
) {
    for (const rule of rules) {
        let isProcessed = false;
        if (rule instanceof CSSStyleRule) {
            isProcessed = processCssRule(rule, el, options.generateCss, accumulator.css);
        }
        else if (rule instanceof CSSFontFaceRule) {
            isProcessed = processCssFontFaceRule(rule, options.detectFonts, href, accumulator.fonts);
        }
        else if (rule instanceof CSSMediaRule) {
            isProcessed = processCssMediaRule(rule, el, href, accumulator, options);
        }
        else if (rule instanceof CSSSupportsRule) {
            isProcessed = processCssSupportsRule(rule, el, href, accumulator, options);
        }
        else if (rule instanceof CSSImportRule) {
            // TODO
        }

        if (!isProcessed && !options.excludeUnusedCss) {
            accumulator.css.push(rule.cssText);
        }
    }
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

    const acc: CssLoadingAccumulator = {
        css: [] as string[],
        fonts: fonts || []
    };

    const opts: CssLoadingOptions = {
        generateCss: modifyCss || ((selector: string, properties: string) => {
            const sel = selectorRemap ? selectorRemap(selector) : selector;
            const props = modifyStyle ? modifyStyle(properties) : properties;
            return `${sel}{${props}}\n`;
        }),
        excludeUnusedCss,
        detectFonts: !Boolean(fonts)
    };

    return getStyleSheets()
        .then(styles => {
            for (const { rules, href } of styles) {
                processRuleList(rules, href, el, acc, opts);
            }
        })
        .then(() => inlineFonts(acc.fonts))
        .then(fontCss => acc.css.join('\n') + fontCss);
}
