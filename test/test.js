const test = require('tape');

test('Is loadable using requirejs', function (assert) {
	const requirejs = require('requirejs');
	requirejs(['../build/exportSvg'], function(exportSvg) {
		assert.ok(exportSvg, 'Loads exportSvg module.');

		const contract = {
			'svgAsDataUri': 'function',
			'svgAsPngUri': 'function',
			'exportSvg': 'function',
			'download': 'function',
			'prepareSvg': 'function',
			'saveSvg': 'function',
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
