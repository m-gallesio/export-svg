import { downloadRaster, downloadSvg } from "./download";
import { toRasterBlob, toRasterDataUri, toSvgDataUri } from "./render";

export default Object.freeze({
    toSvgDataUri,
    toRasterDataUri,
    toRasterBlob,
    downloadSvg,
    downloadRaster
});
