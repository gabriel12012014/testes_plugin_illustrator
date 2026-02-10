/* =========================================================
   preview.js — Canvas Preview for GraphMaker CEP Plugin
   ========================================================= */

var PreviewEngine = (function () {

    var canvas, ctx;
    var zoomLevel = 1.0;
    var MIN_ZOOM = 0.25;
    var MAX_ZOOM = 3.0;
    var ZOOM_STEP = 0.25;

    // Base dimensions (will be scaled by zoom)
    var BASE_WIDTH = 650;

    // Debounce timer
    var debounceTimer = null;

    function init() {
        canvas = document.getElementById("previewCanvas");
        ctx = canvas.getContext("2d");
        updateZoomLabel();
        render();
    }

    /* ---------- Zoom Controls ---------- */

    function zoomIn() {
        if (zoomLevel < MAX_ZOOM) {
            zoomLevel = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
            updateZoomLabel();
            render();
        }
    }

    function zoomOut() {
        if (zoomLevel > MIN_ZOOM) {
            zoomLevel = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP);
            updateZoomLabel();
            render();
        }
    }

    function resetZoom() {
        zoomLevel = 1.0;
        updateZoomLabel();
        render();
    }

    function updateZoomLabel() {
        var label = document.getElementById("zoomLabel");
        if (label) label.textContent = Math.round(zoomLevel * 100) + "%";
    }

    /* ---------- Debounced Render ---------- */

    function scheduleRender() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { render(); }, 150);
    }

    /* ---------- Main Render ---------- */

    function render() {
        if (!canvas || !ctx) return;

        var config = getConfig();
        var parsed = parseInputData();
        var data = parsed.data;
        var legendLabels = parsed.legendLabels;

        if (data.length === 0) {
            // Draw empty state
            canvas.width = 300 * zoomLevel;
            canvas.height = 80 * zoomLevel;
            ctx.setTransform(zoomLevel, 0, 0, zoomLevel, 0, 0);
            ctx.fillStyle = "#3a3a3a";
            ctx.fillRect(0, 0, 300, 80);
            ctx.fillStyle = "#888";
            ctx.font = "13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Insira dados para ver o preview", 150, 45);
            return;
        }

        config.legendLabels = legendLabels;
        config.data = data;

        var numSeries = data[0].values.length;

        if (config.chartType === "table") {
            renderTable(data, config, numSeries);
        } else {
            renderBarChart(data, config, numSeries);
        }
    }

    /* ---------- Bar Chart Renderer ---------- */

    function renderBarChart(data, config, numSeries) {
        var padding = 18;
        var count = data.length;
        var isGrouped = numSeries > 1;

        var maxVal = 0;
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].values.length; j++) {
                if (data[i].values[j] > maxVal) maxVal = data[i].values[j];
            }
        }
        if (maxVal === 0) maxVal = 1;

        // Measure text widths
        ctx.font = config.fontSizeLbl + "px sans-serif";
        var maxLabelW = 0;
        for (var i = 0; i < count; i++) {
            var w = ctx.measureText(data[i].label).width;
            if (w > maxLabelW) maxLabelW = w;
        }

        ctx.font = "bold " + config.fontSizeVal + "px sans-serif";
        var maxValueW = 0;
        for (var i = 0; i < count; i++) {
            for (var j = 0; j < data[i].values.length; j++) {
                var w = ctx.measureText(formatNumber(data[i].values[j])).width;
                if (w > maxValueW) maxValueW = w;
            }
        }

        // Layout
        var availableContentWidth = config.totalWidth - (padding * 2);
        var reservedW = 0;
        var margin = 10;
        var barsStartX = padding;

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
        var groupThickness;

        if (isGrouped) {
            var innerGap = 2;
            groupThickness = (userBarH * numSeries) + (innerGap * (numSeries - 1));
        } else {
            groupThickness = userBarH;
        }
        var groupGap = userGap;

        // Legend height
        var legendHeight = 0;
        if (isGrouped) {
            legendHeight = 40;
        }

        // Calculate canvas size
        var labelAboveExtra = (config.labelPos === 1) ? (config.fontSizeLbl + 6) : 0;
        var totalHeight = padding + legendHeight
            + count * (groupThickness + labelAboveExtra)
            + (count - 1) * groupGap
            + (config.showAxisX ? 50 : 0)
            + padding;

        canvas.width = config.totalWidth * zoomLevel;
        canvas.height = totalHeight * zoomLevel;
        ctx.setTransform(zoomLevel, 0, 0, zoomLevel, 0, 0);

        // Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, config.totalWidth, totalHeight);

        var drawY = padding;

        // Legend
        if (isGrouped) {
            var lX = padding;
            for (var s = 0; s < numSeries; s++) {
                var palIndex = s % config.palette.length;
                var color = config.palette[palIndex];
                var lName = (config.legendLabels && config.legendLabels[s]) ? config.legendLabels[s] : ("Série " + (s + 1));

                // Square
                ctx.fillStyle = color;
                ctx.fillRect(lX, drawY, 15, 15);

                // Label
                ctx.fillStyle = "#3e3e3e";
                ctx.font = "bold 14px sans-serif";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(lName, lX + 23, drawY + 8);
                lX += 23 + ctx.measureText(lName).width + 30;
            }
            drawY += legendHeight;
        }

        // Draw bars
        for (var i = 0; i < count; i++) {
            var item = data[i];
            var singleBarThick = groupThickness;
            if (isGrouped) {
                var subGap = 2;
                singleBarThick = (groupThickness - (subGap * (numSeries - 1))) / numSeries;
            }

            var rowY = drawY;

            // Label above
            if (config.labelPos === 1) {
                ctx.fillStyle = "#3e3e3e";
                ctx.font = config.fontSizeLbl + "px sans-serif";
                ctx.textAlign = "left";
                ctx.textBaseline = "bottom";
                ctx.fillText(item.label, padding, rowY + config.fontSizeLbl);
                rowY += config.fontSizeLbl + 4;
            }

            var groupMidY = rowY + groupThickness / 2;

            for (var s = 0; s < numSeries; s++) {
                var val = item.values[s];
                var barSize = val * scaleFactor;
                var finalColor;

                if (isGrouped) {
                    var palIndex = s % config.palette.length;
                    finalColor = config.palette[palIndex];
                } else {
                    var isMax = (val === maxVal);
                    finalColor = isMax ? config.palette[0] : config.palette[3];
                }

                var rTop = rowY + (s * (singleBarThick + (isGrouped ? 2 : 0)));
                var rLeft = barsStartX;

                // Draw bar
                ctx.fillStyle = finalColor;
                ctx.fillRect(rLeft, rTop, barSize, singleBarThick);

                // Value text
                var formattedNum = formatNumber(val);
                var displayVal = (config.prefix || "") + formattedNum + (config.suffix || "");
                ctx.font = "bold " + config.fontSizeVal + "px sans-serif";
                var bCenterY = rTop + singleBarThick / 2;

                if (config.valuePos === 1) {
                    // Inside bar
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "right";
                    ctx.textBaseline = "middle";
                    ctx.fillText(displayVal, rLeft + barSize - 5, bCenterY);
                } else {
                    // Outside bar
                    ctx.fillStyle = finalColor;
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    ctx.fillText(displayVal, rLeft + barSize + 8, bCenterY);
                }
            }

            // Label on the side
            if (config.labelPos === 0) {
                ctx.fillStyle = "#3e3e3e";
                ctx.font = config.fontSizeLbl + "px sans-serif";
                ctx.textAlign = "right";
                ctx.textBaseline = "middle";
                ctx.fillText(item.label, barsStartX - margin, groupMidY);
            }

            drawY = rowY + groupThickness + labelAboveExtra;

            // Divider
            if (i < count - 1) {
                var divY = drawY + groupGap / 2;
                ctx.beginPath();
                ctx.strokeStyle = "#c8c8c8";
                ctx.lineWidth = 0.5;
                ctx.moveTo(padding, divY);
                ctx.lineTo(padding + availableContentWidth, divY);
                ctx.stroke();
            }

            drawY += groupGap;
        }

        // X Axis
        if (config.showAxisX) {
            var axisYPos = drawY + 5;

            ctx.beginPath();
            ctx.strokeStyle = "#3c3c3c";
            ctx.lineWidth = 1;
            ctx.moveTo(barsStartX, axisYPos);
            ctx.lineTo(barsStartX + availableSizeForBars, axisYPos);
            ctx.stroke();

            var steps = 5;
            var valStep = Math.ceil(maxVal) / steps;
            for (var k = 0; k <= steps; k++) {
                var cVal = Math.round(valStep * k);
                var cX = barsStartX + (cVal * scaleFactor);

                // Tick
                ctx.beginPath();
                ctx.moveTo(cX, axisYPos);
                ctx.lineTo(cX, axisYPos + 5);
                ctx.stroke();

                // Number
                ctx.fillStyle = "#3c3c3c";
                ctx.font = "12px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(formatNumber(cVal), cX, axisYPos + 8);
            }
        }
    }

    /* ---------- Table Renderer ---------- */

    function renderTable(data, config, numSeries) {
        var padding = 18;
        var count = data.length;
        var rowGap = config.barGap;

        // Measure label width
        ctx.font = config.fontSizeLbl + "px sans-serif";
        var maxLblW = 0;
        for (var i = 0; i < count; i++) {
            var w = ctx.measureText(data[i].label).width;
            if (w > maxLblW) maxLblW = w;
        }

        var col1Width = maxLblW + 30;
        var remainingW = config.totalWidth - (padding * 2) - col1Width;
        if (remainingW < 50) remainingW = 50 * numSeries;
        var colWidth = remainingW / numSeries;

        var hasHeader = config.hasHeader || (config.legendLabels && config.legendLabels.length > 0);
        var headerHeight = hasHeader ? (config.fontSizeLbl + 30) : 0;

        var totalHeight = padding + headerHeight
            + count * (config.fontSizeLbl + rowGap)
            + padding;

        canvas.width = config.totalWidth * zoomLevel;
        canvas.height = totalHeight * zoomLevel;
        ctx.setTransform(zoomLevel, 0, 0, zoomLevel, 0, 0);

        // Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, config.totalWidth, totalHeight);

        var currentY = padding;

        // Header
        if (hasHeader) {
            var headers = config.legendLabels || [];
            ctx.fillStyle = "#3e3e3e";
            ctx.font = "bold " + config.fontSizeLbl + "px sans-serif";
            ctx.textBaseline = "top";

            for (var s = 0; s < numSeries; s++) {
                var hText = (headers[s]) ? headers[s] : "Series " + (s + 1);
                var cx = padding + col1Width + (s * colWidth) + (colWidth / 2);
                ctx.textAlign = "center";
                ctx.fillText(hText, cx, currentY);
            }

            currentY += config.fontSizeLbl + 10;

            // Header divider
            ctx.beginPath();
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = "#c8c8c8";
            ctx.lineWidth = 1;
            ctx.moveTo(padding, currentY);
            ctx.lineTo(padding + config.totalWidth - (padding * 2), currentY);
            ctx.stroke();
            ctx.setLineDash([]);

            currentY += 15;
        }

        // Rows
        var labelColor = (config.palette && config.palette.length > 0) ? config.palette[0] : "#3e3e3e";

        for (var i = 0; i < count; i++) {
            var item = data[i];

            // Label
            ctx.fillStyle = labelColor;
            ctx.font = config.fontSizeLbl + "px sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(item.label, padding, currentY);

            // Values
            ctx.fillStyle = "#3e3e3e";
            ctx.font = "bold " + config.fontSizeVal + "px sans-serif";
            ctx.textAlign = "center";

            for (var s = 0; s < numSeries; s++) {
                var val = item.values[s];
                var formattedNum = formatNumber(val);
                var displayVal = (config.prefix || "") + formattedNum + (config.suffix || "");
                var cx = padding + col1Width + (s * colWidth) + (colWidth / 2);
                ctx.fillText(displayVal, cx, currentY);
            }

            currentY += config.fontSizeLbl + rowGap;

            // Divider
            var divY = currentY - (rowGap / 2);
            ctx.beginPath();
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = "#c8c8c8";
            ctx.lineWidth = 1;
            ctx.moveTo(padding, divY);
            ctx.lineTo(padding + config.totalWidth - (padding * 2), divY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    /* ---------- Helpers ---------- */

    function formatNumber(num) {
        var parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return parts.join(",");
    }

    /* ---------- Public API ---------- */

    return {
        init: init,
        render: render,
        scheduleRender: scheduleRender,
        zoomIn: zoomIn,
        zoomOut: zoomOut,
        resetZoom: resetZoom
    };

})();
