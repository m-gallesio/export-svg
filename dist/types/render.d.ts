import type { CanvasEncoderOptions, ImageToCanvasOptions, SvgExportOptions } from "./interfaces";
export declare function inlinedSvgToDataUri(this: void, el: SVGElement): string;
export declare function svgToInlinedSvgDataUri(this: void, el: SVGGraphicsElement, options?: Readonly<SvgExportOptions> | null): Promise<string>;
export declare function dataUriToImage(this: void, dataUri: string): Promise<HTMLImageElement>;
export declare function imageToCanvas(this: void, img: HTMLImageElement, options?: Readonly<ImageToCanvasOptions> | null): HTMLCanvasElement;
export declare function canvasToRasterDataUri(this: void, canvas: HTMLCanvasElement, options?: Readonly<CanvasEncoderOptions> | null): string;
export declare function canvasToRasterBlob(this: void, canvas: HTMLCanvasElement, options?: Readonly<CanvasEncoderOptions> | null): Promise<Blob>;
