import type { SvgExportOptions } from "./interfaces";
export declare function download(this: void, name: string, content: string | Blob): Promise<void>;
export declare function downloadSvg(this: void, el: SVGGraphicsElement, name: string, options?: Readonly<SvgExportOptions> | null): Promise<void>;
export declare function downloadSvgAsRaster(this: void, el: SVGGraphicsElement, name: string, options?: Readonly<SvgExportOptions> | null): Promise<void>;
