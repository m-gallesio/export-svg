# export-svg

An attempt to modernize save-svg-as-png:
- Convert to TypeScript
- Split code for easier maintenance
- Drop IE support
- Revision the API
- Handled crossorigin resources

TODO:
- handle multiple font urls (under a flag since it costs bandwidth)
- more export types, e.g. blob
- hook to post-process canvas
