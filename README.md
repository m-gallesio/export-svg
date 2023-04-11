# export-svg

An attempt to modernize save-svg-as-png:
- Convert to TypeScript
- Split code for easier maintenance
- Drop IE support
- Revision the API
- Handle crossorigin resources

Please note that this package **IS STILL IN ALPHA** and subject to breaking changes. Its public API is also under development and not yet fully designed. Use it at your own risk and feel free to report any issues.

TODO:
- handle multiple font urls (under a flag since it costs bandwidth)
- more export types, e.g. blob
- hook to post-process canvas
