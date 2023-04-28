import { toSvgText } from "./buildSvg";
import { downloadRaster, downloadSvg } from "./download";
import { toCanvas, toImage, toRasterBlob, toRasterDataUri, toSvgDataUri } from "./render";

export default Object.freeze({
    toSvgText,
    toSvgDataUri,
    toImage,
    toCanvas,
    toRasterDataUri,
    toRasterBlob,
    downloadSvg,
    downloadRaster
});
