const test = require('tape');
const requirejs = require('requirejs');

test('Is loadable using requirejs', function (assert) {
	requirejs(['../dist/index'], function (exportSvg) {
		assert.ok(exportSvg, 'Loads exportSvg module.');

		const contract = {
			'toSvgText': 'function',
			'toSvgDataUri': 'function',
			'toImage': 'function',
			'toCanvas': 'function',
			'toRasterDataUri': 'function',
			'toRasterBlob': 'function',
			'downloadSvg': 'function',
			'downloadRaster': 'function',
		};

		for (const property in exportSvg) {
			if (exportSvg.hasOwnProperty(property)) {
				const expectedType = contract[property];
				const message = 'Has ' + property + ' of type ' + expectedType;
				assert.equals(typeof exportSvg[property], expectedType, message);
			}
		}

		assert.end();
	});
});
