import type { SvgExportOptions } from "./interfaces";
export declare function svgToRasterDataUri(this: void, el: SVGGraphicsElement, options?: SvgExportOptions): Promise<string>;
export declare function svgToRasterBlob(this: void, el: SVGGraphicsElement, options?: SvgExportOptions): Promise<Blob>;
