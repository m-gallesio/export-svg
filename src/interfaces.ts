export interface FontInfo {
    text: string;
    format: string;
    url: string;
}

export interface CanvasEncoderOptions {
    /// A Number between 0 and 1 indicating image quality. The default is 0.8
    quality?: number;
    /// A string indicating the image format. The default type is image/png.
    type?: string;
    /// Settings used in the creation of the canvas's 2D rendering context.
    canvasSettings?: CanvasRenderingContext2DSettings;
}

export interface FontOptions {
    /// A list of `{text, url, format}` objects the specify what fonts to inline in the SVG. Omitting this option defaults to auto-detecting font rules.
    fonts?: FontInfo[];
    /// Inlines all fonts included in the @font-face src declaration instead of only the first. This is off by default to save bandwidth.
    inlineAllFonts?: boolean;
}

export interface CssOptions extends FontOptions {
    /// Exclude CSS rules that don't match any elements in the SVG.
    excludeUnusedCss?: boolean;
    /// A function that takes a CSS rule's selector and properties and returns a string of CSS. Supercedes `selectorRemap` and `modifyStyle`. Useful for modifying properties only for certain CSS selectors.
    modifyCss?(selector: string, properties: string): string;
    /// A function that takes a CSS rule's properties and returns a string of CSS. Useful for modifying properties before they're inlined into the SVG.
    modifyStyle?(properties: string): string;
    /// A function that takes a CSS selector and produces its replacement in the CSS that's inlined into the SVG. Useful if your SVG style selectors are scoped by ancestor elements in your HTML document.
    selectorRemap?(selector: string): string;
}

export interface SvgExportOptions extends CanvasEncoderOptions, CssOptions {
    /// Creates a PNG with the given background color. Defaults to transparent.
    backgroundColor?: string;
    /// Exclude all CSS rules
    excludeCss?: boolean;
    /// Specify the image's height. Defaults to the viewbox's height if given, or the element's non-percentage height, or the element's bounding box's height, or the element's CSS height, or the computed style's height, or 0.
    height?: number;
    /// Specify the viewbox's left position. Defaults to 0.
    left?: number;
    /// TODO
    responsive?: boolean;
    /// Changes the resolution of the output PNG. Defaults to `1`, the same dimensions as the source SVG.
    scale?: number;
    /// Specify the viewbox's top position. Defaults to 0.
    top?: number;
    /// Specify the image's width. Defaults to the viewbox's width if given, or the element's non-percentage width, or the element's bounding box's width, or the element's CSS width, or the computed style's width, or 0.
    width?: number;
}

export interface ImageInfo<T> {
    /// The rendered image
    image: T;
    width: number;
    height: number;
}
