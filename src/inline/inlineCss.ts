import { detectCssFont, inlineFonts } from "./inlineFonts";
import type { CssOptions, FontInfo, Nullable } from "../interfaces";
import { getStyleSheets, loadRemoteStyleSheet } from "./styleSheetCache";

function query(
    this: void,
    el: Element,
    selector: string
): Nullable<Element> {
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
    href: Nullable<string>,
    fontList: FontInfo[],
    options: CssFontLoadingOptions
): boolean {
    if (options.detectFonts) {
        const font = detectCssFont(rule.cssText, href, options.inlineAllFonts);
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

interface CssFontLoadingOptions {
    detectFonts: boolean;
    inlineAllFonts: boolean;
}

interface CssLoadingOptions extends CssFontLoadingOptions {
    generateCss: (selector: string, properties: string) => string;
    excludeUnusedCss: boolean;
}

function processCssMediaRule(
    this: void,
    rule: CSSMediaRule,
    el: Element,
    href: Nullable<string>,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
): boolean {
    if (window.matchMedia(rule.conditionText).matches) {
        processRuleList(rule.cssRules, href, el, accumulator, options);
    }
    return true;
}

function processCssSupportsRule(
    this: void,
    rule: CSSSupportsRule,
    el: Element,
    href: Nullable<string>,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
): boolean {
    if ("supports" in CSS && CSS.supports(rule.conditionText)) {
        processRuleList(rule.cssRules, href, el, accumulator, options);
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
    if (!rule.media.length || Array.from(rule.media).some(medium => window.matchMedia(medium).matches)) {
        try {
            const style = await loadRemoteStyleSheet(rule.href);
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
    href: Nullable<string>,
    el: Element,
    accumulator: CssLoadingAccumulator,
    options: CssLoadingOptions
): Promise<void> {
    for (const rule of rules) {
        let isProcessed = false;
        if (rule instanceof CSSStyleRule) {
            isProcessed = processCssRule(rule, el, options.generateCss, accumulator.css);
        }
        else if (rule instanceof CSSFontFaceRule) {
            isProcessed = processCssFontFaceRule(rule, href, accumulator.fonts, options);
        }
        else if (rule instanceof CSSMediaRule) {
            isProcessed = processCssMediaRule(rule, el, href, accumulator, options);
        }
        else if (rule instanceof CSSSupportsRule) {
            isProcessed = processCssSupportsRule(rule, el, href, accumulator, options);
        }
        else if (rule instanceof CSSImportRule) {
            isProcessed = await processCssImportRule(rule, el, accumulator, options);
        }

        if (!isProcessed && !options.excludeUnusedCss) {
            accumulator.css.push(rule.cssText);
        }
    }
}

/** @internal */

export async function inlineCss(
    this: void,
    el: Element,
    options?: Nullable<CssOptions>
): Promise<string> {
    const {
        selectorRemap,
        modifyStyle,
        modifyCss,
        fonts,
        inlineAllFonts = false,
        excludeUnusedCss = false
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
        detectFonts: !fonts,
        inlineAllFonts
    };

    const styles = await getStyleSheets();
    for (const { rules, href } of styles) {
        await processRuleList(rules, href, el, acc, opts);
    }
    const fontCss = await inlineFonts(acc.fonts);
    return acc.css.join("\n") + fontCss;
}
