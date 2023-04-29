angular.module("ngRadialGauge", []).directive("ngRadialGauge", ["$window", "$timeout",
    function ($window, $timeout) {
        return {
            restrict: "EAC",
            scope: {
                data: "=",
                lowerLimit: "=",
                upperLimit: "=",
                ranges: "=",
                value: "=",
                valueUnit: "=",
                precision: "=",
                majorGraduationPrecision: "=",
                label: "=",// MODIFIED
                onClick: "&"
            },
            link: function (scope, ele, attrs) {
                const defaultUpperLimit = 100;
                const defaultLowerLimit = 0;
                let initialized = false;

                let renderTimeout;
                const gaugeAngle = parseInt(attrs.angle) || 120;

                //New width variable, now works in conjunction with fixed viewBox sizing
                const _width = attrs.width || "100%";

                /* Colin Bester
                   Width and height are not really such an issue with SVG but choose these values as
                   width of 300 seems to be pretty baked into code.
                   I took the easy path seeing as size is not that relevant and hard coded width and height
                   as I was too lazy to dig deep into code.
                   May be the wrong call, but seems safe option.
                */
                const view = {
                    width: 300,
                    height: 225
                };
                const innerRadius = Math.round((view.width * 130) / 300);
                const outerRadius = Math.round((view.width * 145) / 300);
                const majorGraduations = parseInt(attrs.majorGraduations - 1) || 5;
                const minorGraduations = parseInt(attrs.minorGraduations) || 10;
                const majorGraduationLength = Math.round((view.width * 16) / 300);
                const minorGraduationLength = Math.round((view.width * 10) / 300);
                const majorGraduationMarginTop = Math.round((view.width * 7) / 300);
                const majorGraduationColor = attrs.majorGraduationColor || "#B0B0B0";
                const minorGraduationColor = attrs.minorGraduationColor || "#D0D0D0";
                const majorGraduationTextColor = attrs.majorGraduationTextColor || "#6C6C6C";
                const needleColor = attrs.needleColor || "#416094";
                const valueVerticalOffset = Math.round((view.width * 30) / 300);
                const inactiveColor = "#D7D7D7";
                const transitionMs = parseInt(attrs.transitionMs) || 750;
                const majorGraduationTextSize = parseInt(attrs.majorGraduationTextSize);
                const needleValueTextSize = parseInt(attrs.needleValueTextSize);
                let needle = undefined;

                //The scope.data object might contain the data we need, otherwise we fall back on the scope.xyz property
                const extractData = function (prop) {
                    if (!scope.data) return scope[prop];
                    if (scope.data[prop] === undefined || scope.data[prop] == null) {
                        return scope[prop];
                    }
                    return scope.data[prop];
                };

                let maxLimit;
                let minLimit;
                let value;
                let valueUnit;
                let precision;
                let majorGraduationPrecision;
                let ranges;
                let label;

                const updateInternalData = function () {
                    maxLimit = extractData("upperLimit") ? extractData("upperLimit") : defaultUpperLimit;
                    minLimit = extractData("lowerLimit") ? extractData("lowerLimit") : defaultLowerLimit;
                    value = extractData("value");
                    valueUnit = extractData("valueUnit");
                    precision = extractData("precision");
                    majorGraduationPrecision = extractData("majorGraduationPrecision");
                    ranges = extractData("ranges");
                    label = extractData("label"); // MODIFIED
                };
                updateInternalData();

                /* Colin Bester
                   Add viewBox and width attributes.
                   Used view.width and view.height in case it"s decided that hardcoding these values is an issue.
                   Width can be specified as %, px etc and will scale image to fit.
                */
                const svg = d3.select(ele[0])
                    .append("svg")
                    .attr("width", _width)
                    .attr("viewBox", "0 0 " + view.width + " " + view.height);
                // .attr("view.width", view.width)
                // .attr("height", view.width * 0.75);
                const renderMajorGraduations = function (majorGraduationsAngles) {
                    const centerX = view.width / 2;
                    const centerY = view.width / 2;
                    //Render Major Graduations
                    majorGraduationsAngles.forEach(function (pValue, index) {
                        const cos1Adj = Math.round(Math.cos((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLength));
                        const sin1Adj = Math.round(Math.sin((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLength));
                        const cos2Adj = Math.round(Math.cos((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                        const sin2Adj = Math.round(Math.sin((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                        const x1 = centerX + cos1Adj;
                        const y1 = centerY + sin1Adj * -1;
                        const x2 = centerX + cos2Adj;
                        const y2 = centerY + sin2Adj * -1;
                        svg.append("svg:line")
                            .attr("x1", x1)
                            .attr("y1", y1)
                            .attr("x2", x2)
                            .attr("y2", y2)
                            .style("stroke", majorGraduationColor);

                        renderMinorGraduations(majorGraduationsAngles, index);
                    });
                };
                const renderMinorGraduations = function (majorGraduationsAngles, indexMajor) {
                    const minorGraduationsAngles = [];

                    if (indexMajor > 0) {
                        const minScale = majorGraduationsAngles[indexMajor - 1];
                        const maxScale = majorGraduationsAngles[indexMajor];
                        const scaleRange = maxScale - minScale;

                        for (let i = 1; i < minorGraduations; i++) {
                            const scaleValue = minScale + i * scaleRange / minorGraduations;
                            minorGraduationsAngles.push(scaleValue);
                        }

                        const centerX = view.width / 2;
                        const centerY = view.width / 2;
                        //Render Minor Graduations
                        minorGraduationsAngles.forEach(function (pValue, indexMinor) {
                            const cos1Adj = Math.round(Math.cos((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - minorGraduationLength));
                            const sin1Adj = Math.round(Math.sin((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - minorGraduationLength));
                            const cos2Adj = Math.round(Math.cos((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                            const sin2Adj = Math.round(Math.sin((90 - pValue) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop));
                            const x1 = centerX + cos1Adj;
                            const y1 = centerY + sin1Adj * -1;
                            const x2 = centerX + cos2Adj;
                            const y2 = centerY + sin2Adj * -1;
                            svg.append("svg:line")
                                .attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                                .style("stroke", minorGraduationColor);
                        });
                    }
                };
                const getMajorGraduationValues = function (pMinLimit, pMaxLimit, pPrecision) {
                    const scaleRange = pMaxLimit - pMinLimit;
                    const majorGraduationValues = [];
                    for (let i = 0; i <= majorGraduations; i++) {
                        const scaleValue = pMinLimit + i * scaleRange / (majorGraduations);
                        majorGraduationValues.push(scaleValue.toFixed(pPrecision));
                    }

                    return majorGraduationValues;
                };
                const getMajorGraduationAngles = function () {
                    const scaleRange = 2 * gaugeAngle;
                    const minScale = -1 * gaugeAngle;
                    const graduationsAngles = [];
                    for (let i = 0; i <= majorGraduations; i++) {
                        const scaleValue = minScale + i * scaleRange / (majorGraduations);
                        graduationsAngles.push(scaleValue);
                    }

                    return graduationsAngles;
                };
                const getNewAngle = function (pValue) {
                    const scale = d3.scale.linear().range([0, 1]).domain([minLimit, maxLimit]);
                    const ratio = scale(pValue);
                    const scaleRange = 2 * gaugeAngle;
                    const minScale = -1 * gaugeAngle;
                    const newAngle = minScale + (ratio * scaleRange);
                    return newAngle;
                };
                const renderMajorGraduationTexts = function (majorGraduationsAngles, majorGraduationValues, pValueUnit) {
                    if (!ranges) return;

                    const centerX = view.width / 2;
                    const centerY = view.width / 2;
                    const textVerticalPadding = 5;
                    const textHorizontalPadding = 5;

                    const lastGraduationValue = majorGraduationValues[majorGraduationValues.length - 1];
                    const textSize = isNaN(majorGraduationTextSize) ? (view.width * 12) / 300 : majorGraduationTextSize;
                    const fontStyle = textSize + "px Courier";

                    const dummyText = svg.append("text")
                        .attr("x", centerX)
                        .attr("y", centerY)
                        .attr("fill", "transparent")
                        .attr("text-anchor", "middle")
                        .style("font", fontStyle)
                        .text(lastGraduationValue + pValueUnit);

                    const textWidth = dummyText.node().getBBox().width;

                    for (let i = 0; i < majorGraduationsAngles.length; i++) {
                        const angle = majorGraduationsAngles[i];
                        let cos1Adj = Math.round(Math.cos((90 - angle) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLength - textHorizontalPadding));
                        let sin1Adj = Math.round(Math.sin((90 - angle) * Math.PI / 180) * (innerRadius - majorGraduationMarginTop - majorGraduationLength - textVerticalPadding));

                        let sin1Factor = 1;
                        if (sin1Adj < 0) sin1Factor = 1.1;
                        if (sin1Adj > 0) sin1Factor = 0.9;
                        if (cos1Adj > 0) {
                            if (angle > 0 && angle < 45) {
                                cos1Adj -= textWidth / 2;
                            } else {
                                cos1Adj -= textWidth;
                            }
                        }
                        if (cos1Adj < 0) {
                            if (angle < 0 && angle > -45) {
                                cos1Adj -= textWidth / 2;
                            }
                        }
                        if (cos1Adj == 0) {
                            cos1Adj -= angle == 0 ? textWidth / 4 : textWidth / 2;
                        }

                        const x1 = centerX + cos1Adj;
                        const y1 = centerY + sin1Adj * sin1Factor * -1;

                        svg.append("text")
                            .attr("class", "mtt-majorGraduationText")
                            .style("font", fontStyle)
                            .attr("text-align", "center")
                            .attr("x", x1)
                            .attr("dy", y1)
                            .attr("fill", majorGraduationTextColor)
                            .text(majorGraduationValues[i] + pValueUnit);
                    }
                };
                const renderGraduationNeedle = function (value, valueUnit, precision, minLimit, maxLimit) {
                    svg.selectAll(".mtt-graduation-needle").remove();
                    svg.selectAll(".mtt-graduationValueText").remove();
                    svg.selectAll(".mtt-graduation-needle-center").remove();

                    const centerX = view.width / 2;
                    const centerY = view.width / 2;
                    let centerColor;

                    if (typeof value === "undefined") {
                        centerColor = inactiveColor;
                    } else {
                        centerColor = needleColor;
                        const needleAngle = getNewAngle(value);
                        const needleLen = innerRadius - majorGraduationLength - majorGraduationMarginTop;
                        const needleRadius = (view.width * 2.5) / 300;
                        const textSize = isNaN(needleValueTextSize) ? (view.width * 12) / 300 : needleValueTextSize;
                        const fontStyle = textSize + "px Courier";

                        if (value >= minLimit && value <= maxLimit) {
                            const lineData = [
                                [needleRadius, 0],
                                [0, -needleLen],
                                [-needleRadius, 0],
                                [needleRadius, 0]
                            ];
                            const pointerLine = d3.svg.line().interpolate("monotone");
                            const pg = svg.append("g").data([lineData])
                                .attr("class", "mtt-graduation-needle")
                                .style("fill", needleColor)
                                .attr("transform", "translate(" + centerX + "," + centerY + ")");
                            needle = pg.append("path")
                                .attr("d", pointerLine)
                                .attr("transform", "rotate(" + needleAngle + ")");
                        }

                        svg.append("text")
                            .attr("x", centerX)
                            .attr("y", centerY + valueVerticalOffset)
                            .attr("class", "mtt-graduationValueText")
                            .attr("fill", needleColor)
                            .attr("text-anchor", "middle")
                            .attr("font-weight", "bold")
                            .style("font", fontStyle)
                            .text(value.toFixed(precision) + valueUnit);

                        // MODIFIED:   Added a customizable label
                        svg.append("text")
                            .attr("x", centerX)
                            .attr("y", centerY + valueVerticalOffset + 10)
                            .attr("class", "mtt-graduationValueText")
                            .attr("fill", needleColor)
                            .attr("text-anchor", "middle")
                            .attr("font-weight", "bold")
                            .style("font", fontStyle)
                            .text(label);
                    }

                    const circleRadius = (view.width * 6) / 300;

                    svg.append("circle")
                        .attr("r", circleRadius)
                        .attr("cy", centerX)
                        .attr("cx", centerY)
                        .attr("fill", centerColor)
                        .attr("class", "mtt-graduation-needle-center");
                };
                $window.onresize = function () {
                    scope.$apply();
                };
                scope.$watch(function () {
                    return angular.element($window)[0].innerWidth;
                }, function () {
                    scope.render();
                });

                scope.$watchCollection("[ranges, data.ranges]", function () {
                    scope.render();
                }, true);

                scope.render = function () {
                    updateInternalData();
                    svg.selectAll("*").remove();
                    if (renderTimeout) clearTimeout(renderTimeout);

                    renderTimeout = $timeout(function () {
                        const d3DataSource = [];

                        if (typeof ranges === "undefined") {
                            d3DataSource.push([minLimit, maxLimit, inactiveColor]);
                        } else {
                            //Data Generation
                            ranges.forEach(function (pValue, index) {
                                d3DataSource.push([pValue.min, pValue.max, pValue.color]);
                            });
                        }

                        //Render Gauge Color Area
                        const translate = "translate(" + view.width / 2 + "," + view.width / 2 + ")";
                        const cScale = d3.scale.linear().domain([minLimit, maxLimit]).range([-1 * gaugeAngle * (Math.PI / 180), gaugeAngle * (Math.PI / 180)]);
                        const arc = d3.svg.arc()
                            .innerRadius(innerRadius)
                            .outerRadius(outerRadius)
                            .startAngle(function (d) { return cScale(d[0]); })
                            .endAngle(function (d) { return cScale(d[1]); });
                        svg.selectAll("path")
                            .data(d3DataSource)
                            .enter()
                            .append("path")
                            .attr("d", arc)
                            .style("fill", function (d) { return d[2]; })
                            .attr("transform", translate);

                        const majorGraduationsAngles = getMajorGraduationAngles();
                        const majorGraduationValues = getMajorGraduationValues(minLimit, maxLimit, majorGraduationPrecision);
                        renderMajorGraduations(majorGraduationsAngles);
                        renderMajorGraduationTexts(majorGraduationsAngles, majorGraduationValues, valueUnit);
                        renderGraduationNeedle(value, valueUnit, precision, minLimit, maxLimit);
                        initialized = true;
                    }, 200);

                };
                const onValueChanged = function (pValue, pPrecision, pValueUnit) {
                    if (typeof pValue === "undefined" || pValue == null) return;

                    if (needle && pValue >= minLimit && pValue <= maxLimit) {
                        const needleAngle = getNewAngle(pValue);
                        needle.transition()
                            .duration(transitionMs)
                            .ease("elastic")
                            .attr("transform", "rotate(" + needleAngle + ")");
                        svg.selectAll(".mtt-graduationValueText")
                            .text("[ " + pValue.toFixed(pPrecision) + pValueUnit + " ]");
                    } else {
                        svg.selectAll(".mtt-graduation-needle").remove();
                        svg.selectAll(".mtt-graduationValueText").remove();
                        svg.selectAll(".mtt-graduation-needle-center").attr("fill", inactiveColor);
                    }
                };
                scope.$watchCollection("[value, data.value]", function () {
                    if (!initialized) return;
                    updateInternalData();
                    onValueChanged(value, precision, valueUnit);
                }, true);
            }
        };
    }]);

angular.module("RadialGaugeDemo", [
    "ngRadialGauge"
]);

angular.module("RadialGaugeDemo").controller("RadialGaugeDemoCtrl", ["$scope", "$timeout", function ($scope, $timeout) {
    $scope.value = 1.5;
    $scope.upperLimit = 6;
    $scope.lowerLimit = 0;
    $scope.unit = "kW";
    $scope.precision = 2;
    $scope.ranges = [
        {
            min: 0,
            max: 1.5,
            color: "#DEDEDE"
        },
        {
            min: 1.5,
            max: 2.5,
            color: "#8DCA2F"
        },
        {
            min: 2.5,
            max: 3.5,
            color: "#FDC702"
        },
        {
            min: 3.5,
            max: 4.5,
            color: "#FF7700"
        },
        {
            min: 4.5,
            max: 6.0,
            color: "#C50200"
        }
    ];
    $scope.OnClick = async function () {
        console.log("click");
        const uri = await exportSvg.svgToRasterDataUri(document.getElementsByTagName("svg")[0]);
        const img = `<img class="img-thumbnail" src="${uri}">`;
        d3.select("#svgpreview").html(img);
    }
}]);     