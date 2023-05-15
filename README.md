This is a fork of [saveSvgAsPng](https://github.com/exupero/saveSvgAsPng) with the following changes:
- Convert to TypeScript
- Split code for easier maintenance
- Drop IE support
- Revision the API
- Handle crossorigin resources

This library requires the following functionalities in the runtime:
- `async` functions (see support on [Can I use](https://caniuse.com/async-functions))
- `Promise`s (see support on [Can I use](https://caniuse.com/promises))
- `fetch` (see support on [Can I use](https://caniuse.com/fetch))
- `Object.entries` (see support on [Can I use](https://caniuse.com/object-entries))

Essentially, a browser compatible with [ES2017/ES8](https://caniuse.com/sr_es8) should work.

TODO:
- handle multiple font urls (under a flag since it costs bandwidth)
- review responsive flag
- consider providing a flag to output the deprecated xlink attributes

# Example usage

Via import:

```javascript

import { downloadSvgAsRaster } from "export-svg";

downloadSvgAsRaster(document.getElementById("mySvgElement"));

```

Via `script` tag:

```html

<script src="/path/to/export-svg.js"></script>

<script>

exportSvg.downloadSvgAsRaster(document.getElementById("mySvgElement"));

</script>

```

# API

Please note that this package **IS STILL IN ALPHA** and its API is not yet fully designed,
so versions earlier than the eventual 1.0.0 **WILL** break without warning.
Use it at your own risk and feel free to report any issues or ideas.

All functions are made available:
- when using modules: as direct imports
- when using `script` tags: as methods of a global `exportSvg` object

*All* rendering and download methods inline all external resources into the SVG before exporting it,
thus making it fully standalone.

## Main functions

These functions cover the most basic use cases, which are:
- rendering a SVG
- downloading a SVG

### Rendering functions

Rendering functions convert a SVG into another form.
The all are in the form `function(svgElement: SVGGraphicsElement, options)`
and return a `Promise` which resolves with the rendered image,
whose format depends on the method.
Note that this does *not* modify the original SVG.

- `svgToInlinedSvgDataUri`: converts a SVG element to a data URI
- `svgToRasterDataUri`: converts a SVG element to a raster image (PNG by default) as a data URI
- `svgToRasterBlob`: converts a SVG element to a raster image (PNG by default) as a `Blob`

### Download functions

Download methods render the image and download it directly.
They all are in the form `function(svgElement, fileName, options)`
and return a `Promise` which resolves with no result.

- `downloadSvg`: downloads the SVG
- `downloadRaster`: converts the SVG to a raster image (PNG by default) which is then downloaded

## Intermediate rendering pipeline

All steps of the internal rendering pipeline are exported as functions.
They should not usually be needed unless you are interested in intermediate results
(e.g. obtaining the drawing canvas or an `img` element).

1. `svgToInlinedSvg(svgElement: SVGGraphicsElement, options?): Promise<SVGSVGElement>`
Inlines all external resources into the SVG.
2. `inlinedSvgToDataUri(svgElement: SVGElement): string`
Converts a SVG element (assumed to be already inlined) to a data URI.
3. `dataUriToImage(dataUri: string): Promise<HTMLImageElement>`
Creates a `HTMLImageElement` (`<img>`) with the given data URI as its `src`.
4. `imageToCanvas(image: HTMLImageElement, options?): HTMLCanvasElement`
Creates a `HTMLCanvasElement` (`<canvas>`) tailored to the given image and draws the image on it.
5. `canvasToRasterDataUri(canvas: HTMLCanvasElement, options?): string`
Gets the content of a canvas as a data URI.
5. `canvasToRasterBlob(canvas: HTMLCanvasElement, options?): Promise<Blob>`
Gets the content of a canvas as a `Blob`.
6. `download(name: string, content: string | Blob)`
Downloads the given content (data URI or `Blob`) with the given file name.

### Default pipelines

Note that all "main" functions are simply shortcuts for:

- `svgToInlinedSvgDataUri`: `svgToInlinedSvg` | `inlinedSvgToDataUri`
- `svgToRasterDataUri`: `svgToInlinedSvg` | `inlinedSvgToDataUri` | `dataUriToImage` | `imageToCanvas` | `canvasToRasterDataUri`
- `svgToRasterBlob`: `svgToInlinedSvg` | `inlinedSvgToDataUri` | `dataUriToImage` | `imageToCanvas` | `canvasToRasterBlob`

Download methods render the image and download it directly.
They all are in the form `function(svgElement, fileName, options)`
and return a `Promise` which resolves with no result.

- `downloadSvg`: `svgToInlinedSvg` | `inlinedSvgToDataUri` | `download`
- `downloadRaster`: `svgToInlinedSvg` | `inlinedSvgToDataUri` | `dataUriToImage` | `imageToCanvas` | `canvasToRasterBlob` | `download`

### Customized pipeline

As an example, if for some reason you need to alter the canvas before exporting it you can express it as such:

```js

const svg = document.getElementById("mySvgElement");
const dataUri = await svgToInlinedSvgDataUri(svg);
const image = await dataUriAsImage(dataUri);
const canvas = imageToCanvas(image);

// do something with the canvas here, then:

const pngUri = canvasToRasterDataUri(canvas);
download("myEditedImage.png", pngUri);

```