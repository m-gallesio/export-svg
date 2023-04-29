/** @internal */

export type Nullable<T> = T | null | undefined;

export interface FontInfo {
    text: string;
    format: string;
    url: string;
}

export interface FontOptions {
    /**
     * A list of `{text, url, format}` objects the specify what fonts to inline in the SVG.
     * Omitting this option defaults to auto-detecting font rules.
     */
    fonts?: FontInfo[];
    /**
     * WARNING: NOT IMPLEMENTED YET.
     * Inlines all fonts included in the @font-face src declaration instead of only the first.
     * This is off by default to save bandwidth.
     */
    inlineAllFonts?: boolean;
}

export interface CssOptions extends FontOptions {
    /**
     * Exclude CSS rules that don't match any elements in the SVG.
     */
    excludeUnusedCss?: boolean;
    /**
     * A function that takes a CSS rule's selector and properties and returns a string of CSS.
     * Supercedes `selectorRemap` and `modifyStyle`.
     * Useful for modifying properties only for certain CSS selectors.
     */
    modifyCss?(selector: string, properties: string): string;
    /**
     * A function that takes a CSS rule's properties and returns a string of CSS.
     * Useful for modifying properties before they're inlined into the SVG.
     */
    modifyStyle?(properties: string): string;
    /**
     * A function that takes a CSS selector and produces its replacement in the CSS that's inlined into the SVG.
     * Useful if your SVG style selectors are scoped by ancestor elements in your HTML document.
     */
    selectorRemap?(selector: string): string;
}

export interface SvgToInlinedSvgOptions extends CssOptions {
    /**
     * Creates a PNG with the given background color. Defaults to transparent.
     */
    backgroundColor?: string;
    /**
     * Exclude all CSS rules
     */
    excludeCss?: boolean;
    /**
     * Specify the image's height.
     * Defaults to the first of:
     * 1. the viewbox's height
     * 2. the element's non-percentage height
     * 3. the element's bounding box's height
     * 4. the element's CSS height
     * 5. the computed style's height
     * 6. `0`
     */
    height?: number;
    /**
     * Specify the viewbox's left position.
     * Defaults to `0`.
     */
    left?: number;
    /**
     * TODO: understand what this does.
     */
    responsive?: boolean;
    /**
     * Changes the resolution of the output PNG.
     * Defaults to `1`, the same dimensions as the source SVG.
     */
    scale?: number;
    /**
     * Specify the viewbox's top position.
     * Defaults to `0`.
     */
    top?: number;
    /**, or
     * Specify the image's width.
     * Defaults to the first of:
     * 1. the viewbox's width
     * 2. the element's non-percentage width
     * 3. the element's bounding box's width
     * 4. the element's CSS width
     * 5. the computed style's width
     * 6. `0`.
     */
    width?: number;
}

export interface ImageToCanvasOptions {
    /**
     * Settings used in the creation of the canvas's 2D rendering context.
     * For more information about supported values, see:
     * - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
     * - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
     */
    canvasSettings?: CanvasRenderingContext2DSettings;
}

/**
 * Options to be passed when extracting a data URI or a `Blob` from a canvas.
 * For more information about supported values, see:
 * - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
 * - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
 */
export interface CanvasEncoderOptions {
    /**
     * The image's format.
     * Defaults to `image/png`.
     */
    type?: string;
    /**
     * The image's quality, between `0` and `1`.
     * This is only applicable to lossy formats like `image/jpeg`.
     * Defaults to `0.8`.
     */
    quality?: number;
}

export interface SvgExportOptions extends
    CanvasEncoderOptions,
    ImageToCanvasOptions,
    SvgToInlinedSvgOptions {
}
