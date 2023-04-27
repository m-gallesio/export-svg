import { toSvgText } from "./buildSvg";
import { downloadRaster, downloadSvg } from "./download";
import { toCanvas, toRasterBlob, toRasterDataUri, toSvgDataUri } from "./render";

export const exportSvg = Object.freeze({
    toSvgText,
    toSvgDataUri,
    toCanvas,
    toRasterDataUri,
    toRasterBlob,
    downloadSvg,
    downloadRaster
});
