document.getElementById("file").addEventListener("change", function handleFileSelect(evt) {
    const element = document.getElementById("filereader");
    const file = evt.target.files[0];
    if (!file)
        return;

    const reader = new FileReader();
    reader.onload = e => {
        element.querySelector(".load-target").innerHTML = e.target.result;
        exportSvg
            .svgToRasterDataUri(element.querySelector(".load-target svg"), null)
            .then(uri => {
                element.querySelector("input").style.display = "none";
                element.querySelector(".preview").innerHTML = `<div><img src="${uri}" /></div>`;
            });
        element.querySelector(".savePng").onclick = () => {
            exportSvg.downloadSvgAsRaster(element.querySelector(".load-target svg"), "test.png");
        }
    };
    reader.readAsText(file);
}, false);

function inlineTest(title, selector, saveOptions, testOptions) {
    const element = document.querySelector(selector);
    if (!element)
        return;

    const svg = element.innerHTML;
    const template = document.getElementById("inline-template").innerHTML;
    element.innerHTML = template;

    element.querySelector("h2").innerText = title;
    element.querySelector(".canvas").innerHTML = svg;

    const canvas = element.querySelector(testOptions && testOptions.selector || "svg");
    exportSvg
        .svgToRasterDataUri(canvas, saveOptions)
        .then(uri => {
            element.querySelector(".preview").innerHTML = `<div><img src="${uri}" /></div>`;
        });
    element.querySelector(".savePng").onclick = () => {
        exportSvg.downloadSvgAsRaster(canvas, "test.png", saveOptions);
    };
    element.querySelector(".saveSvg").onclick = () => {
        exportSvg.downloadSvg(canvas, "test.svg", saveOptions);
    };
}

inlineTest("Directly in the HTML", "#inline");
inlineTest("With linked PNG image", "#embedded-png");
inlineTest("With linked SVG image", "#embedded-svg");
inlineTest("Sized with pixels", "#sized-with-pixels");
inlineTest("Sized with style", "#sized-with-style");
inlineTest("Sized with CSS", "#sized-with-css");
inlineTest("At a higher resolution", "#scaling", { scale: 2 });
inlineTest("When CSS styling selectors are prefixed", "#selectors-prefixed", {
    modifyCss: {
        selectorRemap: s => s.replace("#selectors-prefixed ", "")
    }
});
inlineTest("Modifying the style", "#modified-style", {
    modifyCss: {
        modifyStyle: s => s.replace("green", "red")
    }
});
inlineTest("Modifying the whole CSS rule", "#modified-css", {
    modifyCss: (selector, properties) => {
        selector = selector.replace("#selectors-prefixed ", "");
        properties = properties.replace("green", "blue");
        return selector + "{" + properties + "}";
    }
});
inlineTest("Exporting a group within an SVG", "#group", null, {
    selector: "#sub-group"
});
inlineTest("Percentage Height and Width", "#percentage-size");
inlineTest("Background color", "#background-color", { backgroundColor: "lightblue" });
inlineTest("Pan and Zoom", "#pan-and-zoom", {
    left: -50,
    top: -50,
    width: 300,
    height: 300
});
inlineTest("With Unicode characters", "#unicode");
inlineTest("With gradients", "#gradient");
inlineTest("With foreign objects", "#foreign-object");
inlineTest("With foreign objects: img", "#foreign-object-html-img");
inlineTest("With foreign objects: image in svg", "#foreign-object-svg-image");
inlineTest("With opacity", "#opacity");
inlineTest("When setting xmlns on foreign object children", "#xmlns-override");
inlineTest("When using HTML entites", "#entities");
inlineTest("Transformed text", "#transformed-text");
inlineTest("With marker-end", "#marker-end");
inlineTest("SVG style attribute", "#style-background");
inlineTest("SVG within SVG", "#svg-in-svg");
inlineTest("excluding unused CSS", "#exclude-unused-css", { excludeUnusedCss: true });
inlineTest("With custom fonts", "#custom-font");
inlineTest("With custom fonts (crossorigin CSS)", "#custom-font-crossorigin-css");
inlineTest("With @import css", "#import-css");

const sandbox = document.getElementById("sandbox");

sandbox.querySelector(".render").addEventListener("click", () => {
    const error = sandbox.querySelector(".error");
    error.style.display = "none";
    error.innerText = "";
    sandbox.querySelector(".load-target").innerHTML = sandbox.querySelector("textarea").value;
    const canvas = sandbox.querySelector(".load-target svg");
    const preview = sandbox.querySelector(".preview");
    exportSvg
        .svgToRasterDataUri(canvas, null)
        .then(uri => {
            preview.innerHTML = `<div><img src="${uri}" /></div>`;
            sandbox.querySelector(".saveSvg").onclick = () => {
                exportSvg.downloadSvg(canvas, "test.svg");
            };
            sandbox.querySelector(".savePng").onclick = () => {
                exportSvg.downloadSvgAsRaster(canvas, "test.png");
            };
        })
        .catch(err => {
            error.innerText = err.message;
            error.style.display = "block";
            preview.innerHTML = "";
        });
});
