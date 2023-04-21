# export-svg

This is a fork of [saveSvgAsPng](https://github.com/exupero/saveSvgAsPng) with the following changes:
- Convert to TypeScript
- Split code for easier maintenance
- Drop IE support
- Revision the API
- Handle crossorigin resources

This library requires the following functionalities in the runtime:
- `async` functions ((Can I use)[https://caniuse.com/async-functions])
- `Promise`s ((Can I use)[https://caniuse.com/promises])
- `fetch` ((Can I use)[https://caniuse.com/fetch])

Please note that this package **IS STILL IN ALPHA** and subject to breaking changes. Its public API is also under development and not yet fully designed. Use it at your own risk and feel free to report any issues.

TODO:
- handle multiple font urls (under a flag since it costs bandwidth)
- more export types, e.g. blob
- hook to post-process canvas
