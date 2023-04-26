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

TODO:
- handle multiple font urls (under a flag since it costs bandwidth)
- more export types, e.g. blob
- hook to post-process canvas

# Example usage

Via import:

```javascript

import { exportSvg } from "export-svg";

exportSvg.downloadRaster(document.getElementById("mySvgElement"));

```

Via `script` tag:

```html

<script src="/path/to/export-svg.js"></script>

<script>

exportSvg.downloadRaster(document.getElementById("mySvgElement"));

</script>

```

# API

Please note that this package **IS STILL IN ALPHA** and its API is not yet fully designed,
so versions earlier than the eventual 1.0.0 **WILL** break without warning.
Use it at your own risk and feel free to report any issues.

## Rendering methods

Rendering methods convert a SVG into another form.
The all are in the form `exportSvg.method(svgElement, options)` and return a `Promise` which resolves with an object with the following attributes:
- `data`: the rendered image in a form dependent on the method
- `width`: the width in pixels of the image
- `height`: the height in pixels of the image

The methods are:
- `toSvgDataUri`: converts a SVG element to a data URI
- `toRasterDataUri`: converts a SVG element to a raster image (PNG by default) as a data URI
- `toRasterBlob`: converts a SVG element to a raster image (PNG by default) as a `Blob`

## Download methods

Download methods render the image and download it directly.
They all are in the form `downloadSvg(svgElement, fileName, options)` and return a `Promise` which resolves with no result.

The methods are:
- `downloadSvg`: downloads the SVG
- `downloadRaster`: converts the SVG to a raster image (PNG by default) and downloads it