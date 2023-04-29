import type { Nullable } from "../interfaces";
import { xlinkNs } from "../namespaces";

function isExternal(
    url: Nullable<string>
): url is string {
    return Boolean(url && url.lastIndexOf("http", 0) === 0 && url.lastIndexOf(window.location.host) === -1);
}

/** @internal */

function inlineImage(
    this: void,
    href: string
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onerror = () => reject(new Error(`Could not load ${href}`));
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d")!.drawImage(img, 0, 0);
            img.setAttributeNS(xlinkNs, "href", canvas.toDataURL("image/png"));
            resolve();
        };
        img.src = href;
    })
}

export function inlineImages(
    this: void,
    el: SVGElement
): Promise<void[]> {
    const toLoad: Promise<void>[] = [];
    for (const image of el.querySelectorAll("image")) {
        let href = image.getAttributeNS(xlinkNs, "href") || image.getAttribute("href") || "";
        if (href) {
            if (isExternal(href)) {
                href += (href.indexOf("?") === -1 ? "?" : "&") + "t=" + new Date().valueOf();
            }
            toLoad.push(inlineImage(href));
        }
    }
    return Promise.all(toLoad);
}
