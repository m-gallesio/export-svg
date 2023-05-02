export interface FontInfo {
    text: string;
    format: string;
    url: string;
}
export interface FontOptions {
    fonts?: FontInfo[];
    inlineAllFonts?: boolean;
}
export interface CssOptions extends FontOptions {
    excludeUnusedCss?: boolean;
    modifyCss?: ((selector: string, properties: string) => string) | Readonly<{
        modifyStyle?(properties: string): string;
        selectorRemap?(selector: string): string;
    }>;
}
export interface SvgToInlinedSvgOptions extends CssOptions {
    backgroundColor?: string;
    excludeCss?: boolean;
    height?: number;
    left?: number;
    responsive?: boolean;
    scale?: number;
    top?: number;
    width?: number;
}
export interface ImageToCanvasOptions {
    canvasSettings?: CanvasRenderingContext2DSettings;
}
export interface CanvasEncoderOptions {
    type?: string;
    quality?: number;
}
export interface SvgExportOptions extends CanvasEncoderOptions, ImageToCanvasOptions, SvgToInlinedSvgOptions {
}
