import { xlinkNs } from "../namespaces";

function isExternal(
    url: string | null
): url is string {
    return Boolean(url && url.lastIndexOf("http", 0) === 0 && url.lastIndexOf(location.host) === -1);
}

/** @internal */

function inlineImage(
    this: void,
    image: SVGImageElement,
    href: string
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d")!.drawImage(img, 0, 0);
            image.removeAttribute("href");
            image.removeAttributeNS(xlinkNs, "href");
            image.setAttribute("href", canvas.toDataURL("image/png"));
            resolve();
        };
        img.onerror = () => {
            reject(new Error(`Could not load ${href}`));
        }
        img.src = href;
    })
}

export function inlineImages(
    this: void,
    el: SVGElement
): Promise<void[]> {
    const toLoad: Promise<void>[] = [];
    for (const image of el.querySelectorAll("image")) {
        let href = image.getAttribute("href") || image.getAttributeNS(xlinkNs, "href") || "";
        if (href) {
            if (isExternal(href)) {
                href += (href.indexOf("?") === -1 ? "?" : "&") + "t=" + new Date().valueOf();
            }
            toLoad.push(inlineImage(image, href));
        }
    }
    return Promise.all(toLoad);
}
