import { xlinkNs } from "../namespaces";

function isExternal(
    url: string | null | undefined
): url is string {
    return Boolean(url && url.lastIndexOf('http', 0) === 0 && url.lastIndexOf(window.location.host) === -1);
}

/** @internal */

export function inlineImages(
    this: void,
    el: SVGElement
) {
    return Promise.all(Array.from(el.querySelectorAll('image')).map(image => {
        let href = image.getAttributeNS(xlinkNs, 'href') || image.getAttribute('href') || '';
        if (!href) {
            return Promise.resolve(null);
        }
        if (isExternal(href)) {
            href += (href.indexOf('?') === -1 ? '?' : '&') + 't=' + new Date().valueOf();
        }
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onerror = () => reject(new Error(`Could not load ${href}`));
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d')!.drawImage(img, 0, 0);
                image.setAttributeNS(xlinkNs, 'href', canvas.toDataURL('image/png'));
                resolve(true);
            };
            img.src = href;
        });
    }));
}
