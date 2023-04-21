import { saveSvg, saveSvgAsPng } from "./download";
import { svgAsDataUri, svgAsPngBlob, svgAsPngUri } from "./render";

export default Object.freeze({
    asDataUri: svgAsDataUri,
    asRasterDataUri: svgAsPngUri,
    asRasterBlob: svgAsPngBlob,
    downloadSvg : saveSvg,
    downloadRaster: saveSvgAsPng,
});
