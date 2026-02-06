#target illustrator

function main() {
    if (app.documents.length === 0) {
        alert("Por favor, abra um documento primeiro.");
        return;
    }

    var doc = app.activeDocument;

    // --- 0. CHECK FOR EXISTING SELECTION (EDIT MODE) ---
    var existingGroup = null;
    var existingConfig = null;
    var existingDataStr = "";

    if (doc.selection.length === 1 && doc.selection[0].typename === "GroupItem") {
        var sel = doc.selection[0];
        // Check for our Tag
        try {
            var tag = sel.tags.getByName("GraphMakerConfig");
            if (tag) {
                existingGroup = sel;
                var jsonStr = tag.value;
                existingConfig = eval("(" + jsonStr + ")");

                // Reconstruct Data String for UI
                var dataArr = existingConfig.data || [];
                var strBuilder = [];

                // Reconstruct Header if present
                if (existingConfig.legendLabels && existingConfig.legendLabels.length > 0) {
                    strBuilder.push("HEADER\t" + existingConfig.legendLabels.join("\t"));
                }

                // Helper: Format number with thousand separators (Brazilian format)
                function formatNumber(num) {
                    var parts = num.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    return parts.join(",");
                }

                for (var d = 0; d < dataArr.length; d++) {
                    var formattedVals = [];
                    for (var v = 0; v < dataArr[d].values.length; v++) {
                        formattedVals.push(formatNumber(dataArr[d].values[v]));
                    }
                    strBuilder.push(dataArr[d].label + "\t" + formattedVals.join("\t"));
                }
                existingDataStr = strBuilder.join("\n");
            }
        } catch (e) {
            // No tag found
        }
    }

    // --- 1. PRE-LOAD FONTS ---
    var installedFonts = [];
    var fontNames = [];
    var defaultValIndex = 0;
    var defaultLblIndex = 0;

    for (var i = 0; i < app.textFonts.length; i++) {
        var f = app.textFonts[i];
        installedFonts.push(f);
        fontNames.push(f.name);

        if (existingConfig) {
            if (f.name === existingConfig.fontNameVal) defaultValIndex = i;
            if (f.name === existingConfig.fontNameLbl) defaultLblIndex = i;
        } else {
            // Default Logic: GlobotipoTexto-Bold for both
            if (f.name === "GlobotipoTexto-Bold") {
                defaultValIndex = i;
                defaultLblIndex = i;
            }
        }
    }

    // UNICODE STRINGS:
    // Configurações -> Configura\u00E7\u00F5es
    // Rótulo -> R\u00F3tulo
    // Gráfico -> Gr\u00E1fico
    // Cabeçalho -> Cabe\u00E7alho
    // Série -> S\u00E9rie

    var title = existingGroup ? "Graph Maker Pro - EDITAR" : "Graph Maker Pro - NOVO";
    var dialog = new Window("dialog", title);
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 5; // Compact spacing
    dialog.margins = 10; // Compact margins

    // --- Data Input ---
    // State
    var currentType = "horizontal";

    // Data Input
    dialog.add("statictext", undefined, "Dados (Nome, Valor) - Tab separa as colunas:");
    var defaultDataText = existingGroup ? existingDataStr : "Item A\t50\nItem B\t80\nItem C\t30";
    var inputData = dialog.add("edittext", [0, 0, 450, 80], defaultDataText, { multiline: true });

    // HEADER always true (User request)
    var checkHeader = { value: true };

    // --- PANEL 1: CONFIGURAÇÕES (Type & Width) ---
    var pConfig = dialog.add("panel", undefined, "Configura\u00E7\u00F5es");
    pConfig.orientation = "column";
    pConfig.alignChildren = ["left", "top"];
    pConfig.spacing = 2; // Compact
    pConfig.margins = 4; // Compact

    var row1 = pConfig.add("group");
    // Removed Radio Buttons (Moved to Top Tabs)

    var stWidth = row1.add("statictext", undefined, "   Largura Total (px):");
    stWidth.characters = 20;
    var defWidth = existingConfig ? existingConfig.totalWidth : "650";
    var totalWidthInput = row1.add("edittext", undefined, defWidth.toString());
    totalWidthInput.characters = 6;


    // --- PANEL 2: BARRA (Size, Gap, Labels) ---
    var pBar = dialog.add("panel", undefined, "Barra");
    pBar.orientation = "column";
    pBar.alignChildren = ["left", "top"];
    pBar.spacing = 2; // Compact
    pBar.margins = 4; // Compact

    var rowMetrics = pBar.add("group");
    rowMetrics.add("statictext", undefined, "Tamanho da Barra:");
    var defThick = (existingConfig && existingConfig.barThickness) ? existingConfig.barThickness : "30";
    var barThickInput = rowMetrics.add("edittext", undefined, defThick.toString());
    barThickInput.characters = 4;

    var stGap = rowMetrics.add("statictext", undefined, "   Esp. Entrelinha (px):");
    stGap.characters = 20;
    var defGap = (existingConfig && existingConfig.barGap) ? existingConfig.barGap : "40";
    var barGapInput = rowMetrics.add("edittext", undefined, defGap.toString());
    barGapInput.characters = 4;

    var row2 = pBar.add("group");
    row2.add("statictext", undefined, "R\u00F3tulo:");
    var dropLabel = row2.add("dropdownlist", undefined, ["Ao lado/Abaixo", "Acima/Topo"]);
    // Default to 1 (Acima/Topo) if new, or respect existing
    dropLabel.selection = existingConfig ? existingConfig.labelPos : 1;

    row2.add("statictext", undefined, "   Valor:");
    var dropValue = row2.add("dropdownlist", undefined, ["Fora da Barra", "Dentro da Barra"]);
    dropValue.selection = existingConfig ? existingConfig.valuePos : 0;

    // Axis Options
    var rowAxis = pBar.add("group");
    var checkAxisX = rowAxis.add("checkbox", undefined, "Mostrar Eixo X");
    checkAxisX.value = existingConfig ? existingConfig.showAxisX : false;
    rowAxis.add("statictext", undefined, "   ");
    var checkAxisY = rowAxis.add("checkbox", undefined, "Mostrar Eixo Y");
    checkAxisY.value = existingConfig ? existingConfig.showAxisY : false;


    // --- PANEL 3: TIPOGRAFIA (Fonts) ---
    var pTypo = dialog.add("panel", undefined, "Tipografia");
    pTypo.orientation = "column";
    pTypo.alignChildren = ["left", "top"];
    pTypo.spacing = 2; // Compact
    pTypo.margins = 4; // Compact

    var fontGroup = pTypo.add("group");
    fontGroup.orientation = "column";
    fontGroup.alignChildren = ["left", "center"];
    fontGroup.spacing = 0; // Tighter

    var fRow1 = fontGroup.add("group");
    fRow1.add("statictext", undefined, "Fonte R\u00F3tulo:");
    var dropFontLbl = fRow1.add("dropdownlist", undefined, fontNames);
    dropFontLbl.selection = defaultLblIndex;
    dropFontLbl.size = [250, 25];

    // Font Size Input for Label
    fRow1.add("statictext", undefined, "Tam:");
    var defLblSize = (existingConfig && existingConfig.fontSizeLbl) ? existingConfig.fontSizeLbl : "20";
    var lblSizeInput = fRow1.add("edittext", undefined, defLblSize.toString());
    lblSizeInput.characters = 3;


    var fRow2 = fontGroup.add("group");
    fRow2.add("statictext", undefined, "Fonte Valor:");
    var dropFontVal = fRow2.add("dropdownlist", undefined, fontNames);
    dropFontVal.selection = defaultValIndex;
    dropFontVal.size = [250, 25];

    // Font Size Input for Value
    fRow2.add("statictext", undefined, "Tam:");
    var defValSize = (existingConfig && existingConfig.fontSizeVal) ? existingConfig.fontSizeVal : "22";
    var valSizeInput = fRow2.add("edittext", undefined, defValSize.toString());
    valSizeInput.characters = 3;


    // --- PANEL 4: NUMBERS (Prefix/Suffix) ---
    var pNum = dialog.add("panel", undefined, "N\u00FAmeros");
    pNum.orientation = "row";
    pNum.alignChildren = ["left", "center"];
    pNum.spacing = 10;
    pNum.margins = 10;

    var grpPref = pNum.add("group");
    grpPref.add("statictext", undefined, "Prefixo:");
    var defPrefix = (existingConfig && existingConfig.prefix) ? existingConfig.prefix : "";
    var prefixInput = grpPref.add("edittext", undefined, defPrefix);
    prefixInput.characters = 6;

    var grpSuff = pNum.add("group");
    grpSuff.add("statictext", undefined, "Sufixo:");
    var defSuffix = (existingConfig && existingConfig.suffix) ? existingConfig.suffix : "";
    var suffixInput = grpSuff.add("edittext", undefined, defSuffix);
    suffixInput.characters = 6;


    // --- PANEL 5: CORES (PALETTE System) ---
    var pColor = dialog.add("panel", undefined, "Cores da Paleta (Clique para Editar)");
    pColor.orientation = "column";
    pColor.alignChildren = ["left", "top"];
    pColor.spacing = 2;
    pColor.margins = 8;

    // Palette Data
    var defaultPalette = ["c3190a", "3e3e3e", "79a5c2", "bebebe", "d49187", "7f7f7f"];
    var currentPalette = (existingConfig && existingConfig.palette) ? existingConfig.palette : defaultPalette.slice();
    var paletteSwatches = [];

    // Helper: Create Swatch
    function createSwatch(parent, index) {
        var grp = parent.add("group");
        grp.size = [30, 30]; // Square size
        var btn = grp.add("button", [0, 0, 30, 30], ""); // Invisible button for click

        // Draw Color
        var gfx = grp.graphics;
        var rHex = currentPalette[index];
        var rgb = hexToRgb(rHex);

        // Hack: Use 'onDraw' to fill background
        btn.onDraw = function () {
            var g = this.graphics;
            var r = hexToRgb(currentPalette[index]);
            var brush = g.newBrush(g.BrushType.SOLID_COLOR, [r.r / 255, r.g / 255, r.b / 255, 1]);
            g.newPath();
            g.rectPath(0, 0, 30, 30);
            g.fillPath(brush);
        }

        // Click Handler
        btn.onClick = function () {
            var input = prompt("Digite o c\u00F3digo HEX da cor (sem #):", currentPalette[index]);
            if (input && /^[0-9A-F]{6}$/i.test(input)) {
                currentPalette[index] = input;
                // Redraw
                this.notify("onDraw"); // Trigger redraw attempt if supported, or just let UI refresh naturally
                this.parent.layout.layout(true); // Force Layout refresh
            }
        }
        return grp;
    }

    var paletteGroup = pColor.add("group");
    paletteGroup.spacing = 5;

    for (var i = 0; i < 6; i++) {
        createSwatch(paletteGroup, i);
    }

    // Helper functions
    function hexToRgb(hex) {
        var expand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(expand, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }


    // --- Buttons ---
    var btnGroup = dialog.add("group");
    btnGroup.alignment = ["right", "bottom"];
    btnGroup.add("button", undefined, "Cancelar", { name: "cancel" });
    var okBtnName = existingGroup ? "ATUALIZAR Gr\u00E1fico" : "Criar Gr\u00E1fico";
    var okBtn = btnGroup.add("button", undefined, okBtnName, { name: "ok" });

    // updateUI(); // Removed

    okBtn.onClick = function () {
        var rawText = inputData.text;
        var lines = rawText.split("\n");
        var data = [];
        var legendLabels = [];

        // Save position for Edit Mode Logic
        var savedLeft = null;
        var savedTop = null;
        if (existingGroup) {
            savedLeft = existingGroup.left;
            savedTop = existingGroup.top;
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.replace(/\s/g, '').length === 0) continue;
            var parts = [];
            if (line.indexOf("\t") > -1) parts = line.split("\t");
            else if (line.indexOf(",") > -1) parts = line.split(",");
            else continue;

            if (parts.length >= 2) {
                // Header Check
                if (checkHeader.value && i === 0 && legendLabels.length === 0) {
                    for (var h = 1; h < parts.length; h++) {
                        legendLabels.push(parts[h].replace(/^\s+|\s+$/g, ''));
                    }
                    continue;
                }

                var label = parts[0].replace(/^\s+|\s+$/g, '');
                var values = [];
                for (var j = 1; j < parts.length; j++) {
                    var valStr = parts[j].replace(/^\s+|\s+$/g, '');
                    if (valStr === "") continue;
                    var cleanVal = valStr.replace(/\./g, "").replace(",", ".");
                    var val = parseFloat(cleanVal);
                    if (!isNaN(val)) values.push(val);
                }
                if (values.length > 0) {
                    data.push({ label: label, values: values });
                }
            }
        }

        if (data.length > 0) {
            if (legendLabels.length === 0) {
                var numSeries = data[0].values.length;
                for (var s = 0; s < numSeries; s++) legendLabels.push("S\u00E9rie " + (s + 1));
            }

            // Validar Tamanho Fonte
            var fValSize = parseFloat(valSizeInput.text) || 22;
            if (fValSize < 22) fValSize = 22; // Hardfloor
            var fLblSize = parseFloat(lblSizeInput.text) || 20;

            var config = {
                totalWidth: parseFloat(totalWidthInput.text) || 650,
                isVertical: false, // ALWAYS FALSE
                barThickness: parseFloat(barThickInput.text) || 30,
                barGap: parseFloat(barGapInput.text) || 25,
                palette: currentPalette,
                // rgb/hex removed - use palette
                labelPos: dropLabel.selection.index,
                valuePos: dropValue.selection.index,
                fontNameVal: installedFonts[dropFontVal.selection.index].name,
                fontNameLbl: installedFonts[dropFontLbl.selection.index].name,
                fontSizeVal: fValSize,
                fontSizeVal: fValSize,
                fontSizeLbl: fLblSize,
                prefix: prefixInput.text,
                suffix: suffixInput.text,
                showAxisX: checkAxisX.value,
                showAxisY: checkAxisY.value,
                data: data,
                legendLabels: legendLabels,
                hasHeader: checkHeader.value,
                savedLeft: savedLeft,
                savedTop: savedTop,
                isEdit: (existingGroup !== null)
            };
            dialog.close();

            if (existingGroup) existingGroup.remove();

            drawChart(data, config);
        } else {
            alert("Nenhum dado v\u00E1lido encontrado.");
        }
    };
    dialog.show();
}

function drawChart(data, config) {
    if (!data || data.length === 0) return;
    try {

        var doc = app.activeDocument;
        var chartLayer = doc.activeLayer;
        var mainGroup = chartLayer.groupItems.add();
        mainGroup.name = "Gr\u00E1fico Horizontal";

        // --- SAVE METADATA (TAG) ---
        var jsonStr = "{";
        jsonStr += "totalWidth:" + config.totalWidth + ",";
        jsonStr += "isVertical:" + config.isVertical + ",";
        jsonStr += "barThickness:" + config.barThickness + ",";
        jsonStr += "barGap:" + config.barGap + ",";
        // Convert palette array to string
        if (config.palette) {
            jsonStr += "palette:['" + config.palette.join("','") + "'],";
        }
        jsonStr += "labelPos:" + config.labelPos + ",";
        jsonStr += "valuePos:" + config.valuePos + ",";
        jsonStr += "fontNameVal:'" + config.fontNameVal + "',";
        jsonStr += "fontSizeVal:" + config.fontSizeVal + ",";
        jsonStr += "fontNameLbl:'" + config.fontNameLbl + "',";
        jsonStr += "fontSizeLbl:" + config.fontSizeLbl + ",";
        jsonStr += "prefix:'" + config.prefix + "',";
        jsonStr += "suffix:'" + config.suffix + "',";
        jsonStr += "showAxisX:" + config.showAxisX + ",";
        jsonStr += "showAxisY:" + config.showAxisY + ",";
        jsonStr += "hasHeader:" + config.hasHeader + ",";

        // Serialize Legend Labels
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

        var whiteColor = new RGBColor(); whiteColor.red = 255; whiteColor.green = 255; whiteColor.blue = 255;

        // Updated Black Color #3e3e3e (62, 62, 62)
        var blackColor = new RGBColor();
        blackColor.red = 62; blackColor.green = 62; blackColor.blue = 62;

        // --- Fonts Setup ---
        function getFont(name) {
            try { return app.textFonts.getByName(name); }
            catch (e) { return app.textFonts[0]; }
        }
        var fontVal = getFont(config.fontNameVal);
        var fontLbl = getFont(config.fontNameLbl);

        // --- Origin ---
        // --- Origin (Local drawing space) ---
        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect;
        // Draw at 0,0 locally, then center later
        var originX = 0;
        var originY = 0;

        // --- Metrics ---
        var numSeries = data[0].values.length;
        var isGrouped = (numSeries > 1);

        var maxVal = 0;
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].values.length; j++) {
                if (data[i].values[j] > maxVal) maxVal = data[i].values[j];
            }
        }
        if (maxVal === 0) maxVal = 1;
        var count = data.length;
        var gapRatio = 0.2;

        // Helper: Style Text
        function styleText(tf, color, content, size, font) {
            tf.contents = content;
            var attr = tf.textRange.characterAttributes;
            attr.size = size;
            attr.textFont = font;
            attr.fillColor = color;
            tf.zOrder(ZOrderMethod.BRINGTOFRONT);
            return tf;
            return tf;
        }

        // Helper: Format Number (Brazilian format: 1.000,50)
        function formatNumber(num) {
            var parts = num.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            return parts.join(",");
        }

        // Helper: Palette Color (Safe)
        function getPaletteColor(hexStr) {
            if (!hexStr) return new RGBColor(); // Return Black if undefined
            // Inline hexToRgb logic
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

        // --- LEGEND RENDERING ---
        var legendHeight = 0;

        if (isGrouped) {
            var lX = originX;
            var lY = originY;
            var lineHeight = 20;
            var currentRelY = 0; // Relative Y drop

            // Initial Height (at least one line)
            legendHeight = lineHeight + 20;

            for (var s = 0; s < numSeries; s++) {
                // UPDATE LEGEND COLORS TO PALETTE
                var palIndex = s % config.palette.length;
                var sColor = getPaletteColor(config.palette[palIndex]);

                var lName = (config.legendLabels && config.legendLabels[s]) ? config.legendLabels[s] : ("Serie " + (s + 1));

                // Create temp text to measure width BEFORE placing
                var tTemp = mainGroup.textFrames.add();
                styleText(tTemp, blackColor, lName, 18, fontLbl);
                var tW = tTemp.width;
                tTemp.remove();

                var sqSize = 15;
                var itemTotalW = sqSize + 8 + tW + 30; // Square + pad + text + gap

                // CHECK WRAP
                // If explicit width is set, use it. Otherwise use 650 safe limit? 
                // config.totalWidth is available.
                var maxW = config.totalWidth;
                if ((lX - originX) + itemTotalW > maxW) {
                    // Wrap
                    lX = originX;
                    lY -= lineHeight;
                    currentRelY += lineHeight;
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

            originY -= legendHeight + 18; // Added 18px margin
        }


        // Measure Texts 
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

        // --- Calculate Layout ---
        var padding = 18;
        var availableContentWidth = config.totalWidth - (padding * 2);

        var availableSizeForBars = availableContentWidth;
        var availableSizeForBars = availableContentWidth;

        var reservedW = 0;
        var margin = 10;
        if (config.labelPos === 0) reservedW += maxLabelW + margin;
        if (config.valuePos === 0) reservedW += maxValueW + margin;
        availableSizeForBars = availableContentWidth - reservedW;
        if (availableSizeForBars < 50) availableSizeForBars = 50;

        var scaleFactor = 1, groupThickness = 0, groupGap = 0;

        // --- DYNAMIC MEASUREMENTS ---
        if (false) { // Vertical Disabled
            // HYBRID LOGIC: Preferred Size OR Fit to Width
            var userGap = config.barGap;
            var userThick = config.barThickness; // Use user thickness preference
            var minBarThick = 5;

            // 1. Calculate ideal width
            var idealW = (count * userThick) + ((count - 1) * userGap);

            if (idealW <= availableSizeForBars) {
                // FITS! Use user values. (Solves "Fat Bars")
                groupThickness = userThick;
                groupGap = userGap;
            } else {
                // DOES NOT FIT -> COMPRESS
                var widthBarsOnly = count * userThick;

                if (widthBarsOnly < availableSizeForBars) {
                    // Fits if we shrink gaps
                    var spaceForGaps = availableSizeForBars - widthBarsOnly;
                    var newGap = spaceForGaps / (count - 1);

                    // Limit Gap
                    if (newGap < 2) {
                        // Too tight, force min gap and shrink bars
                        groupGap = 2;
                        var usedByGaps = (count - 1) * 2;
                        groupThickness = (availableSizeForBars - usedByGaps) / count;
                    } else {
                        groupGap = newGap;
                        groupThickness = userThick;
                    }
                } else {
                    // Even with 0 gap, bars are too fat. Shrink Bars.
                    groupGap = 2; // Min gap
                    var usedByGaps = (count - 1) * 2;
                    groupThickness = (availableSizeForBars - usedByGaps) / count;
                }
            }

            scaleFactor = 400 / Math.ceil(maxVal);
        } else {
            scaleFactor = availableSizeForBars / Math.ceil(maxVal);

            var userBarH = config.barThickness;
            var userGap = config.barGap;

            if (isGrouped) {
                var innerGap = 2;
                groupThickness = (userBarH * numSeries) + (innerGap * (numSeries - 1));
            } else {
                groupThickness = userBarH;
            }
            groupGap = userGap;
        }

        // --- DRAW LOOP ---
        for (var i = 0; i < count; i++) {
            var item = data[i];

            // Position
            var groupLeft, groupTop;

            var barSpace = groupThickness + groupGap;
            groupTop = originY - (i * barSpace);

            // Sub-bar calculations
            var singleBarThick = groupThickness;
            if (isGrouped) {
                var subGap = 2;
                singleBarThick = (groupThickness - (subGap * (numSeries - 1))) / numSeries;
            }


            // groupMidX removed (Vertical only)
            var groupMidY = groupTop - groupThickness / 2;

            // --- DRAW SERIES ---
            for (var s = 0; s < numSeries; s++) {
                var val = item.values[s];
                var barSize = val * scaleFactor;

                var finalColor;



                if (isGrouped) {
                    // Grouped: Cycle through palette based on series index
                    var palIndex = s % config.palette.length;
                    finalColor = getPaletteColor(config.palette[palIndex]);
                } else {
                    // Single Series: Highlight Logic
                    // Max Value = Palette[0] (Red/Color 1)
                    // Others = Palette[3] (LightGrey/Color 4/Old Secondary)
                    var isMax = (val === maxVal);
                    var hexCode = isMax ? config.palette[0] : config.palette[3];
                    finalColor = getPaletteColor(hexCode);
                }

                var rect, rTop, rLeft, rWidth, rHeight;

                var rHeight = singleBarThick;
                var rWidth = barSize;
                var startY = originY - (i * (groupThickness + groupGap));
                var rTop = startY - (s * (singleBarThick + (isGrouped ? 2 : 0)));
                var barStartX = originX;
                if (config.labelPos === 0) barStartX += maxLabelW + 10;
                var rLeft = barStartX;

                rect = mainGroup.pathItems.rectangle(rTop, rLeft, rWidth, rHeight);
                // groupMidY already calc

                rect.fillColor = finalColor; rect.stroked = false;

                // Value Text
                var valTextColor = (config.valuePos === 1) ? whiteColor : finalColor;
                var tValue = mainGroup.textFrames.add();
                var formattedNum = formatNumber(val);
                var displayVal = (config.prefix || "") + formattedNum + (config.suffix || "");
                styleText(tValue, valTextColor, displayVal, config.fontSizeVal, fontVal);
                tValue.zOrder(ZOrderMethod.BRINGTOFRONT);

                // Value Text Position (Horizontal)
                var bCenterY = rTop - rHeight / 2;
                if (config.valuePos === 1) { // Inside
                    tValue.top = bCenterY + tValue.height / 2;
                    tValue.left = (rLeft + rWidth) - tValue.width - 5;
                } else {
                    tValue.top = bCenterY + tValue.height / 2;
                    tValue.left = rLeft + rWidth + 8;
                }
            } // end series

            // --- GROUP LABEL ---
            var tLabel = mainGroup.textFrames.add();
            styleText(tLabel, blackColor, item.label, config.fontSizeLbl, fontLbl);
            tLabel.zOrder(ZOrderMethod.BRINGTOFRONT);

            // --- GROUP LABEL (Horizontal) ---
            if (config.labelPos === 1) {
                var grTop = originY - (i * (groupThickness + groupGap));
                tLabel.top = grTop + tLabel.height + 2;
                tLabel.left = (config.labelPos === 0) ? (originX + maxLabelW + 10) : originX;
                // Align left to bars
            } else {
                tLabel.top = groupMidY + (tLabel.height / 2);
                var barSX = originX + maxLabelW + 10;
                tLabel.left = barSX - tLabel.width - 10;
            }

            // --- DIVIDER LINE (Horizontal) ---
            if (i < count - 1) {
                var groupBottom = groupTop - groupThickness;
                var divY = groupBottom - (groupGap / 2);

                // SMART DIVIDER LOGIC
                if (config.labelPos === 1) { // Top
                    var nextGroupTop = groupTop - groupThickness - groupGap;
                    var estLabelH = config.fontSizeLbl;
                    var nextLabelTop = nextGroupTop + estLabelH + 2;

                    divY = (groupBottom + nextLabelTop) / 2;
                }

                var line = mainGroup.pathItems.add();
                var lineStartX = originX;
                var lineEndX = originX + availableContentWidth;
                line.setEntirePath([[lineStartX, divY], [lineEndX, divY]]);
                line.stroked = true; line.filled = false;
                line.strokeColor = dividerColor;
                line.strokeWidth = 0.5;
            }

        } // end main loop

        // --- AXES (Conditional) ---
        var axisColor = new RGBColor();
        axisColor.red = 62; axisColor.green = 62; axisColor.blue = 62; // Same as blackColor

        // Determine Bar Start Position
        var barStartX = originX;
        if (config.labelPos === 0) barStartX += maxLabelW + 10;

        // Y Axis (Vertical - Left edge)
        if (config.showAxisY) {
            var lastGroupBottom = originY - ((count - 1) * (groupThickness + groupGap)) - groupThickness;
            var axisY = mainGroup.pathItems.add();
            axisY.setEntirePath([[barStartX, originY], [barStartX, lastGroupBottom]]);
            axisY.stroked = true; axisY.filled = false;
            axisY.strokeColor = axisColor;
            axisY.strokeWidth = 1;
        }

        // X Axis (Horizontal - Bottom baseline)
        if (config.showAxisX) {
            var lastGroupBottom = originY - ((count - 1) * (groupThickness + groupGap)) - groupThickness;
            var axisXEndX = barStartX + availableSizeForBars;
            var axisX = mainGroup.pathItems.add();
            axisX.setEntirePath([[barStartX, lastGroupBottom], [axisXEndX, lastGroupBottom]]);
            axisX.stroked = true; axisX.filled = false;
            axisX.strokeColor = axisColor;
            axisX.strokeWidth = 1;

            // Add scale labels (rounded to integers)
            var scaleMax = Math.ceil(maxVal); // Round up to next integer
            var numTicks = 5; // 0, 25%, 50%, 75%, 100%
            for (var t = 0; t <= numTicks; t++) {
                var tickValue = Math.round((scaleMax / numTicks) * t); // Integer values
                var tickX = barStartX + (availableSizeForBars / numTicks) * t;

                // Tick mark
                var tick = mainGroup.pathItems.add();
                tick.setEntirePath([[tickX, lastGroupBottom], [tickX, lastGroupBottom - 5]]);
                tick.stroked = true; tick.filled = false;
                tick.strokeColor = axisColor;
                tick.strokeWidth = 1;

                // Tick label
                var tickLabel = mainGroup.textFrames.add();
                var formattedTickVal = formatNumber(tickValue);
                var displayTickVal = (config.prefix || "") + formattedTickVal + (config.suffix || "");
                var axisFont = getFont("GlobotipoTexto-Regular");
                styleText(tickLabel, blackColor, displayTickVal, 18, axisFont);
                tickLabel.top = lastGroupBottom - 10;
                tickLabel.left = tickX - (tickLabel.width / 2);
            }
        }

        // --- 4. BORDER (Invisible) ---
        var contentBounds = mainGroup.geometricBounds;
        var cLeft = contentBounds[0];
        var cTop = contentBounds[1];
        var cRight = contentBounds[2];
        var cBottom = contentBounds[3];

        var borderTop = cTop + padding;
        var borderLeft = cLeft - padding;
        var borderRight = cRight + padding;
        var borderBottom = cBottom - padding;

        var borderWidth = borderRight - borderLeft;
        var borderHeight = borderTop - borderBottom;

        var borderRect = mainGroup.pathItems.rectangle(borderTop, borderLeft, borderWidth, borderHeight);
        borderRect.fillColor = new NoColor();
        borderRect.stroked = false;
        borderRect.zOrder(ZOrderMethod.SENDTOBACK);

        // --- 5. POSITIONING ---
        // If Edit Mode: restore original position (Left/Top anchor)
        // If New Mode: Center Horizontally, Top = 150px below Artboard Top

        var gBounds = mainGroup.geometricBounds;
        var gLeft = gBounds[0];
        var gTop = gBounds[1];
        var gRight = gBounds[2];
        var gBottom = gBounds[3];

        if (config.isEdit && config.savedLeft !== null && config.savedTop !== null) {
            // Move new group so its Left/Top matches savedLeft/savedTop
            var currentLeft = gLeft;
            var currentTop = gTop;

            var dx = config.savedLeft - currentLeft;
            var dy = config.savedTop - currentTop;

            mainGroup.translate(dx, dy);
        } else {
            // FIXED POS: Center X, Top = AB_Top - 130px
            var gWidth = gRight - gLeft;

            // Horizontal Center
            var gCenterX = gLeft + (gWidth / 2);
            var abCenterX = abRect[0] + ((abRect[2] - abRect[0]) / 2);
            var dx = abCenterX - gCenterX;

            // Vertical Fixed Top
            var targetTop = abRect[1] - 130;
            var dy = targetTop - gTop;

            mainGroup.translate(dx, dy);
        }
    } catch (e) {
        alert("Erro inesperado ao criar o gr\u00E1fico:\n" + e);
    }
}
main();
