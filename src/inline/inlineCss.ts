import { detectCssFont, inlineFonts } from "./inlineFonts";
import type { CssOptions, FontInfo } from "../interfaces";
import { getStyleSheets, styleCache } from "./styleSheetHelper";

interface CssLoadingAccumulator {
    css: string[],
    fonts: FontInfo[];
}

interface CssFontLoadingOptions {
    detectFonts: boolean;
}

interface CssLoadingOptions extends CssFontLoadingOptions {
    generateCss: (selector: string, properties: string) => string;
    excludeUnusedCss: boolean;
}

function query(
    this: void,
    el: Element,
    selector: string
): Element | null {
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

function processCssRule(
    this: void,
    rule: CSSStyleRule,
    el: Element,
    generateCss: (selector: string, properties: string) => string,
    css: string[]
): boolean {
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
    href: string | null,
    fontList: FontInfo[],
    options: CssFontLoadingOptions
): boolean {
    if (options.detectFonts) {
        const font = detectCssFont(rule.cssText, href);
        if (font) {
            fontList.push(font);
        }
    }
    return true;
}

async function processCssMediaRule(
    this: void,
    rule: CSSMediaRule,
    el: Element,
    href: string | null,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
): Promise<boolean> {
    if (matchMedia(rule.conditionText).matches) {
        await processRuleList(rule.cssRules, href, el, accumulator, options);
    }
    return true;
}

async function processCssSupportsRule(
    this: void,
    rule: CSSSupportsRule,
    el: Element,
    href: string | null,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
): Promise<boolean> {
    if ("supports" in CSS && CSS.supports(rule.conditionText)) {
        await processRuleList(rule.cssRules, href, el, accumulator, options);
    }
    return true;
}

async function processCssImportRule(
    this: void,
    rule: CSSImportRule,
    el: Element,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
): Promise<boolean> {
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

async function processRuleList(
    this: void,
    rules: CSSRuleList | CSSRule[],
    href: string | null,
    el: Element,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
): Promise<void> {
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

const defaultGenerateCss = (selector: string, properties: string) => `${selector}{${properties}}\n`;

function getGenerateCss(
    this: void,
    modifyCss: CssOptions["modifyCss"]
): CssLoadingOptions["generateCss"] {
    if (typeof modifyCss === "function") {
        return modifyCss;
    }
    if (modifyCss) {
        const identity = (s: string) => s;
        const {
            selectorRemap = identity,
            modifyStyle = identity
        } = modifyCss;
        return (selector: string, properties: string) => defaultGenerateCss(
            selectorRemap(selector),
            modifyStyle(properties)
        );
    }
    return defaultGenerateCss;
}

/** @internal */

export async function inlineCss(
    this: void,
    el: Element,
    options?: Readonly<CssOptions> | null
): Promise<string> {
    const {
        modifyCss,
        fonts,
        excludeUnusedCss = false
    } = options || {};

    const acc: CssLoadingAccumulator = {
        css: [],
        fonts: fonts || []
    };

    const opts: CssLoadingOptions = {
        generateCss: getGenerateCss(modifyCss),
        excludeUnusedCss,
        detectFonts: !fonts,
    };

    const styles = await getStyleSheets();
    for (const { rules, href } of styles) {
        await processRuleList(rules, href, el, acc, opts);
    }
    const fontCss = await inlineFonts(acc.fonts);
    return acc.css.join("\n") + fontCss;
}
