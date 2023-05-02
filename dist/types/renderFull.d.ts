import type { SvgExportOptions } from "./interfaces";
export declare function svgToRasterDataUri(this: void, el: SVGGraphicsElement, options?: Readonly<SvgExportOptions> | null): Promise<string>;
export declare function svgToRasterBlob(this: void, el: SVGGraphicsElement, options?: Readonly<SvgExportOptions> | null): Promise<Blob>;
