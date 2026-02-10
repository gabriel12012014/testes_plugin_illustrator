#target illustrator
var GLOBAL_DOC = null;

// --- Entry Points for CEP ---

function getFontsJSON() {
    try {
        var fontNames = [];
        var defaultValIndex = 0;
        var defaultLblIndex = 0;

        // Safety check
        if (typeof app === "undefined" || !app.textFonts) {
            return '{"fonts":["Arial"], "defaultValIndex":0, "defaultLblIndex":0}';
        }

        // --- STRICT FILTERING MODE ---
        // To prevent crashes/errors with thousands of fonts, we ONLY load:
        // 1. Fonts containing "Globotipo"
        // 2. A few safe system defaults

        var safeDefaults = ["ArialMT", "Arial-BoldMT", "MyriadPro-Regular", "MyriadPro-Bold"];
        var addedMap = {}; // To avoid duplicates

        // 1. Add Defaults first
        for (var d = 0; d < safeDefaults.length; d++) {
            try {
                // Check if default exists
                app.textFonts.getByName(safeDefaults[d]);
                fontNames.push('"' + safeDefaults[d] + '"');
                addedMap[safeDefaults[d]] = true;
            } catch (e) { /* font not found, skip */ }
        }

        // 2. Add Globotipo Fonts
        for (var i = 0; i < app.textFonts.length; i++) {
            var fName = app.textFonts[i].name;
            // Case-insensitive check for "Globotipo"
            if (fName.toLowerCase().indexOf("globotipo") > -1) {
                if (!addedMap[fName]) {
                    // Escape just in case, though usually clean
                    var safeName = fName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                    fontNames.push('"' + safeName + '"');
                    addedMap[fName] = true;
                }
            }
        }

        // 3. Determine Defaults indices
        // Try to find specifically requested defaults
        for (var i = 0; i < fontNames.length; i++) {
            var nameClean = fontNames[i].replace(/"/g, "");
            if (nameClean === "GlobotipoTexto-Bold") {
                defaultLblIndex = i;
                defaultValIndex = i; // Default to bold for both if found? Or Regular.
            }
        }

        // If Globotipo not found, standard logic might have set 0 (Arial)

        if (fontNames.length === 0) {
            fontNames.push('"Arial"');
        }

        var json = '{';
        json += '"fonts":[' + fontNames.join(',') + '],';
        json += '"defaultValIndex":' + defaultValIndex + ',';
        json += '"defaultLblIndex":' + defaultLblIndex;
        json += '}';

        return json;
    } catch (e) {
        return '{"fonts":["Error: ' + e.toString().replace(/"/g, '') + '"], "defaultValIndex":0, "defaultLblIndex":0}';
    }
}

function initGraphMaker(jsonConfigStr) {
    try {
        var config = eval("(" + jsonConfigStr + ")"); // Standard ExtendScript JSON parsing
        drawChart(config.data, config);
        return "Success";
    } catch (e) {
        return "Error: " + e.toString();
    }
}

function checkSelection() {
    try {
        if (app.documents.length === 0) return "false";
        var doc = app.activeDocument;
        if (doc.selection && doc.selection.length === 1 && doc.selection[0].typename === "GroupItem") {
            try {
                if (doc.selection[0].tags.getByName("GraphMakerConfig")) {
                    return "true";
                }
            } catch (e) { }
        }
        return "false";
    } catch (e) {
        return "false";
    }
}

// --- Main Drawing Logic ---


function drawChart(data, config) {
    if (!data || data.length === 0) return;
    try {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var chartLayer = doc.activeLayer;

        // --- CHECK SELECTION FOR EDIT ---
        var existingItem = null;
        if (doc.selection && doc.selection.length === 1 && doc.selection[0].typename === "GroupItem") {
            try {
                if (doc.selection[0].tags.getByName("GraphMakerConfig")) {
                    existingItem = doc.selection[0];
                }
            } catch (e) { }
        }

        var originX, originY;
        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect; // [left, top, right, bottom]

        // 1. Horizontal Center
        originX = (abRect[0] + abRect[2]) / 2 - (config.totalWidth / 2);

        // 2. Vertical Fixed Position (130px from Top) - ALWAYS
        originY = abRect[1] - 130;

        if (existingItem) {
            existingItem.remove(); // Delete old
        }

        var mainGroup = chartLayer.groupItems.add();
        mainGroup.name = (config.chartType === "table") ? "Tabela" : "Gráfico Horizontal";

        // --- SAVE METADATA (TAG) ---
        var jsonStr = "{";
        jsonStr += "chartType:'" + (config.chartType || "bar") + "',";
        jsonStr += "totalWidth:" + config.totalWidth + ",";
        jsonStr += "barThickness:" + config.barThickness + ",";
        jsonStr += "barGap:" + config.barGap + ",";

        if (config.palette) {
            jsonStr += "palette:['" + config.palette.join("','") + "'],";
        }
        jsonStr += "labelPos:" + config.labelPos + ",";
        jsonStr += "valuePos:" + config.valuePos + ",";
        jsonStr += "fontNameVal:'" + config.fontNameVal + "',";
        jsonStr += "fontSizeVal:" + config.fontSizeVal + ",";
        jsonStr += "fontNameLbl:'" + config.fontNameLbl + "',";
        jsonStr += "fontSizeLbl:" + config.fontSizeLbl + ",";
        jsonStr += "prefix:'" + (config.prefix || "") + "',";
        jsonStr += "suffix:'" + (config.suffix || "") + "',";
        jsonStr += "showAxisX:" + (config.showAxisX || false) + ",";
        jsonStr += "hasHeader:" + (config.hasHeader || false) + ",";

        if (config.legendLabels && config.legendLabels.length > 0) {
            var llStr = "['" + config.legendLabels.join("','") + "']";
            jsonStr += "legendLabels:" + llStr + ",";
        }

        var dataStr = "[";
        for (var i = 0; i < data.length; i++) {
            var vStr = "[" + data[i].values.join(",") + "]";
            dataStr += "{label:'" + data[i].label + "',values:" + vStr + "},";
        }
        if (dataStr.length > 1) dataStr = dataStr.substring(0, dataStr.length - 1);
        dataStr += "]";

        jsonStr += "data:" + dataStr;
        jsonStr += "}";

        var tag = mainGroup.tags.add();
        tag.name = "GraphMakerConfig";
        tag.value = jsonStr;

        // --- Colors ---
        var dividerColor = new RGBColor();
        dividerColor.red = 200; dividerColor.green = 200; dividerColor.blue = 200;

        var whiteColor = new RGBColor();
        whiteColor.red = 255; whiteColor.green = 255; whiteColor.blue = 255;

        var blackColor = new RGBColor();
        blackColor.red = 62; blackColor.green = 62; blackColor.blue = 62;

        var axisColor = new RGBColor();
        axisColor.red = 60; axisColor.green = 60; axisColor.blue = 60;

        // --- Fonts Setup ---
        function getFont(name) {
            try { return app.textFonts.getByName(name); }
            catch (e) { return app.textFonts[0]; }
        }
        var fontVal = getFont(config.fontNameVal);
        var fontLbl = getFont(config.fontNameLbl);

        // Helper: Style Text
        function styleText(tf, color, content, size, font) {
            tf.contents = content;
            var attr = tf.textRange.characterAttributes;
            attr.size = size;
            attr.textFont = font;
            attr.fillColor = color;
            tf.zOrder(ZOrderMethod.BRINGTOFRONT);
            return tf;
        }

        // Helper: Format Number
        function formatNumber(num) {
            var parts = num.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            return parts.join(",");
        }

        // Helper: Palette Color
        function getPaletteColor(hexStr) {
            if (!hexStr) return new RGBColor();
            var expand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            var hex = hexStr.replace(expand, function (m, r, g, b) {
                return r + r + g + g + b + b;
            });
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            var rgbVal = result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };

            var col = new RGBColor();
            col.red = rgbVal.r;
            col.green = rgbVal.g;
            col.blue = rgbVal.b;
            return col;
        }

        var padding = 18;
        var drawX = originX + padding;
        var drawY = originY - padding;
        var count = data.length;
        var numSeries = data[0].values.length;

        // --- CHART TYPE BRANCHING ---
        if (config.chartType === "table") {
            // --- TABLE VISUALIZATION ---
            var rowGap = config.barGap;

            // Calculate column widths
            var tTemp = mainGroup.textFrames.add();
            var maxLblW = 0;
            for (var i = 0; i < count; i++) {
                styleText(tTemp, blackColor, data[i].label, config.fontSizeLbl, fontLbl);
                if (tTemp.width > maxLblW) maxLblW = tTemp.width;
            }

            var col1Width = maxLblW + 30;
            var remainingW = config.totalWidth - (padding * 2) - col1Width;
            if (remainingW < 50) remainingW = 50 * numSeries;
            var colWidth = remainingW / numSeries;

            tTemp.remove();

            var currentY = drawY;

            // Draw Header if needed
            if (config.hasHeader || (config.legendLabels && config.legendLabels.length > 0)) {
                var headers = config.legendLabels || [];

                for (var s = 0; s < numSeries; s++) {
                    var hText = (headers[s]) ? headers[s] : "Series " + (s + 1);
                    var tHead = mainGroup.textFrames.add();
                    styleText(tHead, blackColor, hText, config.fontSizeLbl, fontLbl);

                    var cx = drawX + col1Width + (s * colWidth) + (colWidth / 2);
                    tHead.left = cx - (tHead.width / 2);
                    tHead.top = currentY;
                }

                currentY -= (config.fontSizeLbl + 10);

                var lineH = mainGroup.pathItems.add();
                lineH.setEntirePath([[drawX, currentY], [drawX + config.totalWidth - (padding * 2), currentY]]);
                lineH.stroked = true;
                lineH.strokeColor = dividerColor;
                lineH.strokeWidth = 1;
                try { lineH.strokeDashes = [2, 4]; } catch (e) { }

                currentY -= 15;
            }

            // Draw table rows
            var labelColor = (config.palette && config.palette.length > 0) ? getPaletteColor(config.palette[0]) : blackColor;

            for (var i = 0; i < count; i++) {
                var item = data[i];
                var rowCenterY = currentY - (config.fontSizeLbl / 2);

                // Label (colored)
                var tLbl = mainGroup.textFrames.add();
                styleText(tLbl, labelColor, item.label, config.fontSizeLbl, fontLbl);
                tLbl.top = rowCenterY + (tLbl.height / 2);
                tLbl.left = drawX;

                // Values (black)
                for (var s = 0; s < numSeries; s++) {
                    var val = item.values[s];
                    var formattedNum = formatNumber(val);
                    var displayVal = (config.prefix || "") + formattedNum + (config.suffix || "");

                    var tVal = mainGroup.textFrames.add();
                    styleText(tVal, blackColor, displayVal, config.fontSizeVal, fontVal);

                    var cx = drawX + col1Width + (s * colWidth) + (colWidth / 2);
                    tVal.left = cx - (tVal.width / 2);
                    tVal.top = rowCenterY + (tVal.height / 2);
                }

                currentY -= (config.fontSizeLbl + rowGap);

                // Dotted divider
                var divY = currentY + (rowGap / 2);
                var line = mainGroup.pathItems.add();
                line.setEntirePath([[drawX, divY], [drawX + config.totalWidth - (padding * 2), divY]]);
                line.stroked = true;
                line.strokeColor = dividerColor;
                line.strokeWidth = 1;
                try { line.strokeDashes = [2, 4]; } catch (e) { }
            }

        } else {
            // --- BAR CHART VISUALIZATION ---
            var isGrouped = (numSeries > 1);

            var maxVal = 0;
            for (var i = 0; i < data.length; i++) {
                for (var j = 0; j < data[i].values.length; j++) {
                    if (data[i].values[j] > maxVal) maxVal = data[i].values[j];
                }
            }
            if (maxVal === 0) maxVal = 1;

            // Legend for grouped charts
            var legendHeight = 0;
            if (isGrouped) {
                var lX = drawX;
                var lY = drawY;
                var lineHeight = 20;
                legendHeight = lineHeight + 20;

                for (var s = 0; s < numSeries; s++) {
                    var palIndex = s % config.palette.length;
                    var sColor = getPaletteColor(config.palette[palIndex]);
                    var lName = (config.legendLabels && config.legendLabels[s]) ? config.legendLabels[s] : ("Serie " + (s + 1));

                    var tTemp = mainGroup.textFrames.add();
                    styleText(tTemp, blackColor, lName, 18, fontLbl);
                    var tW = tTemp.width;
                    tTemp.remove();

                    var sqSize = 15;
                    var itemTotalW = sqSize + 8 + tW + 30;
                    var maxW = config.totalWidth - (padding * 2);

                    if ((lX - drawX) + itemTotalW > maxW) {
                        lX = drawX;
                        lY -= lineHeight;
                        legendHeight += lineHeight;
                    }

                    var sq = mainGroup.pathItems.rectangle(lY, lX, sqSize, sqSize);
                    sq.fillColor = sColor;
                    sq.stroked = false;

                    var lText = mainGroup.textFrames.add();
                    styleText(lText, blackColor, lName, 18, fontLbl);
                    lText.top = lY - (sqSize / 2) + (lText.height / 2);
                    lText.left = lX + sqSize + 8;

                    lX = lText.left + lText.width + 30;
                }
                drawY -= legendHeight + 18;
            }

            // Measure text widths
            var maxLabelW = 0;
            var maxValueW = 0;
            var tTemp = mainGroup.textFrames.add();
            for (var i = 0; i < count; i++) {
                styleText(tTemp, blackColor, data[i].label, config.fontSizeLbl, fontLbl);
                if (tTemp.width > maxLabelW) maxLabelW = tTemp.width;
                for (var j = 0; j < data[i].values.length; j++) {
                    styleText(tTemp, blackColor, data[i].values[j].toString(), config.fontSizeVal, fontVal);
                    if (tTemp.width > maxValueW) maxValueW = tTemp.width;
                }
            }
            tTemp.remove();

            // Calculate layout
            var availableContentWidth = config.totalWidth - (padding * 2);
            var reservedW = 0;
            var margin = 10;

            var barsStartX = drawX;
            if (config.labelPos === 0) {
                barsStartX += maxLabelW + margin;
                reservedW += maxLabelW + margin;
            }

            if (config.valuePos === 0) {
                reservedW += maxValueW + margin;
            }

            var availableSizeForBars = availableContentWidth - reservedW;
            if (availableSizeForBars < 50) availableSizeForBars = 50;

            var scaleFactor = availableSizeForBars / Math.ceil(maxVal);

            var userBarH = config.barThickness;
            var userGap = config.barGap;
            var groupThickness, groupGap;

            if (isGrouped) {
                var innerGap = 2;
                groupThickness = (userBarH * numSeries) + (innerGap * (numSeries - 1));
            } else {
                groupThickness = userBarH;
            }
            groupGap = userGap;

            // Draw bars
            for (var i = 0; i < count; i++) {
                var item = data[i];
                var groupTop = drawY - (i * (groupThickness + groupGap));

                var singleBarThick = groupThickness;
                if (isGrouped) {
                    var subGap = 2;
                    singleBarThick = (groupThickness - (subGap * (numSeries - 1))) / numSeries;
                }

                var groupMidY = groupTop - groupThickness / 2;

                for (var s = 0; s < numSeries; s++) {
                    var val = item.values[s];
                    var barSize = val * scaleFactor;
                    var finalColor;

                    if (isGrouped) {
                        var palIndex = s % config.palette.length;
                        finalColor = getPaletteColor(config.palette[palIndex]);
                    } else {
                        var isMax = (val === maxVal);
                        var hexCode = isMax ? config.palette[0] : config.palette[3];
                        finalColor = getPaletteColor(hexCode);
                    }

                    var rHeight = singleBarThick;
                    var rWidth = barSize;

                    var startY = drawY - (i * (groupThickness + groupGap));
                    var rTop = startY - (s * (singleBarThick + (isGrouped ? 2 : 0)));
                    var rLeft = barsStartX;

                    var rect = mainGroup.pathItems.rectangle(rTop, rLeft, rWidth, rHeight);
                    rect.fillColor = finalColor;
                    rect.stroked = false;

                    // Value text
                    var valTextColor = (config.valuePos === 1) ? whiteColor : finalColor;
                    var tValue = mainGroup.textFrames.add();
                    var formattedNum = formatNumber(val);
                    var displayVal = (config.prefix || "") + formattedNum + (config.suffix || "");
                    styleText(tValue, valTextColor, displayVal, config.fontSizeVal, fontVal);

                    var bCenterY = rTop - rHeight / 2;
                    if (config.valuePos === 1) {
                        tValue.top = bCenterY + tValue.height / 2;
                        tValue.left = (rLeft + rWidth) - tValue.width - 5;
                    } else {
                        tValue.top = bCenterY + tValue.height / 2;
                        tValue.left = rLeft + rWidth + 8;
                    }
                }

                // Label
                var tLabel = mainGroup.textFrames.add();
                styleText(tLabel, blackColor, item.label, config.fontSizeLbl, fontLbl);

                if (config.labelPos === 1) {
                    var grTop = drawY - (i * (groupThickness + groupGap));
                    tLabel.top = grTop + tLabel.height + 2;
                    tLabel.left = (config.labelPos === 0) ? (drawX + maxLabelW + 10) : drawX;
                } else {
                    tLabel.top = groupMidY + (tLabel.height / 2);
                    tLabel.left = barsStartX - tLabel.width - 10;
                }

                // Divider
                if (i < count - 1) {
                    var groupBottom = groupTop - groupThickness;
                    var divY = groupBottom - (groupGap / 2);

                    if (config.labelPos === 1) {
                        var nextGroupTop = groupTop - groupThickness - groupGap;
                        var estLabelH = config.fontSizeLbl;
                        var nextLabelTop = nextGroupTop + estLabelH + 2;
                        divY = (groupBottom + nextLabelTop) / 2;
                    }

                    var line = mainGroup.pathItems.add();
                    var lineStartX = drawX;
                    var lineEndX = drawX + availableContentWidth;
                    line.setEntirePath([[lineStartX, divY], [lineEndX, divY]]);
                    line.stroked = true;
                    line.filled = false;
                    line.strokeColor = dividerColor;
                    line.strokeWidth = 0.5;
                }
            }

            // X Axis
            if (config.showAxisX) {
                var lastGroupBottom = drawY - ((count - 1) * (groupThickness + groupGap)) - groupThickness;
                var axisYPos = lastGroupBottom - 20;

                var axisX = mainGroup.pathItems.add();
                var axisStart = barsStartX;
                var axisEnd = barsStartX + availableSizeForBars;

                axisX.setEntirePath([[axisStart, axisYPos], [axisEnd, axisYPos]]);
                axisX.stroked = true;
                axisX.filled = false;
                axisX.strokeColor = axisColor;
                axisX.strokeWidth = 1;

                var steps = 5;
                var valStep = Math.ceil(maxVal) / steps;

                for (var k = 0; k <= steps; k++) {
                    var cVal = Math.round(valStep * k);
                    var cX = axisStart + (cVal * scaleFactor);

                    var tick = mainGroup.pathItems.add();
                    tick.setEntirePath([[cX, axisYPos], [cX, axisYPos - 5]]);
                    tick.stroked = true;
                    tick.strokeColor = axisColor;

                    var tNum = mainGroup.textFrames.add();
                    styleText(tNum, axisColor, formatNumber(cVal), 14, fontVal);
                    tNum.top = axisYPos - 8;
                    tNum.left = cX - (tNum.width / 2);
                }
            }
        }

    } catch (e) {
        alert("Error in drawChart: " + e);
    }
}
