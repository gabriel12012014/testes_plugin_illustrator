var csInterface = new CSInterface();
var currentPalette = ["#c3190a", "#3e3e3e", "#79a5c2", "#bebebe", "#d49187", "#7f7f7f"];

window.onload = function () {
    initPalette();
    loadFonts();

    document.getElementById("create-btn").addEventListener("click", createChart);
    document.getElementById("chartType").addEventListener("change", updateConfigOptions);

    // Poll for selection changes to update button text
    setInterval(checkSelectionState, 1000);

    // Initialize config options visibility
    updateConfigOptions();
};

function updateConfigOptions() {
    var chartType = document.getElementById("chartType").value;
    var barOptions = document.getElementById("barChartOptions");
    var tableOptions = document.getElementById("tableOptions");

    if (chartType === "table") {
        barOptions.style.display = "none";
        tableOptions.style.display = "block";
    } else {
        barOptions.style.display = "block";
        tableOptions.style.display = "none";
    }
}

function checkSelectionState() {
    csInterface.evalScript("checkSelection()", function (res) {
        var btn = document.getElementById("create-btn");
        if (!btn) return; // Safety check

        if (res === "true") {
            btn.innerText = "ATUALIZAR GRÁFICO";
            btn.style.backgroundColor = "#2680eb"; // Lighter blue for update? Or same.
        } else {
            btn.innerText = "CRIAR GRÁFICO";
            btn.style.backgroundColor = ""; // Reset
        }
    });
}

function initPalette() {
    var container = document.getElementById("paletteContainer");
    container.innerHTML = "";

    currentPalette.forEach(function (color, index) {
        var wrapper = document.createElement("div");
        wrapper.className = "color-swatch-wrapper";

        var swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = color;

        // Hidden color input
        var input = document.createElement("input");
        input.type = "color";
        input.value = color; // Expects #RRGGBB
        input.className = "color-input-hex";
        input.onchange = function (e) {
            currentPalette[index] = e.target.value;
            swatch.style.backgroundColor = e.target.value;
        };

        wrapper.appendChild(swatch);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    });
}

function loadFonts() {
    csInterface.evalScript("getFontsJSON()", function (result) {
        // Check for EvalScript error
        if (result === "EvalScript error.") {
            alert("Erro crítico: O script do Illustrator não pôde ser carregado. Verifique se a instalação foi feita corretamente e se o Illustrator foi reiniciado.");
            return;
        }

        try {
            var data = JSON.parse(result);
            // Check for internal error forwarded
            if (data.fonts && data.fonts[0] && data.fonts[0].indexOf("Error:") === 0) {
                alert("Erro interno no script: " + data.fonts[0]);
                return;
            }

            var fonts = data.fonts;

            var lblSelect = document.getElementById("dropFontLbl");
            var valSelect = document.getElementById("dropFontVal");

            lblSelect.innerHTML = "";
            valSelect.innerHTML = "";

            fonts.forEach(function (fontName, index) {
                var opt1 = document.createElement("option");
                opt1.value = fontName;
                opt1.text = fontName;
                lblSelect.add(opt1);

                var opt2 = document.createElement("option");
                opt2.value = fontName;
                opt2.text = fontName;
                valSelect.add(opt2);
            });

            // Set Defaults
            if (data.defaultLblIndex < fonts.length) lblSelect.selectedIndex = data.defaultLblIndex;
            if (data.defaultValIndex < fonts.length) valSelect.selectedIndex = data.defaultValIndex;

        } catch (e) {
            alert("Erro ao processar lista de fontes.\nRetorno bruto: " + result + "\nErro JS: " + e);
        }
    });
}

function createChart() {
    // 1. Parse Data
    var rawText = document.getElementById("inputData").value;
    var lines = rawText.split("\n");
    var data = [];
    var legendLabels = [];
    var hasHeader = document.getElementById("checkHeader").checked;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.trim().length === 0) continue;

        var parts = line.indexOf("\t") > -1 ? line.split("\t") : line.split(",");

        if (parts.length >= 2) {
            if (hasHeader && i === 0 && legendLabels.length === 0) {
                for (var h = 1; h < parts.length; h++) {
                    legendLabels.push(parts[h].trim());
                }
                continue;
            }

            var label = parts[0].trim();
            var values = [];
            for (var j = 1; j < parts.length; j++) {
                var valStr = parts[j].trim();
                if (valStr === "") continue;
                // Handle 1.000,00 format if present, simple cleanup
                var cleanVal = valStr.replace(/\./g, "").replace(",", ".");
                var val = parseFloat(cleanVal);
                if (!isNaN(val)) values.push(val);
            }

            if (values.length > 0) {
                data.push({ label: label, values: values });
            }
        }
    }

    if (data.length === 0) {
        alert("Nenhum dado válido encontrado.");
        return;
    }

    // Auto-fill legend labels if missing
    if (legendLabels.length === 0) {
        var numSeries = data[0].values.length;
        for (var s = 0; s < numSeries; s++) legendLabels.push("Série " + (s + 1));
    }

    // 2. Build Config Object
    var chartType = document.getElementById("chartType").value || "bar";

    // For table mode, use tableRowGapInput instead of barGapInput
    var gapValue = (chartType === "table")
        ? parseFloat(document.getElementById("tableRowGapInput").value) || 40
        : parseFloat(document.getElementById("barGapInput").value) || 40;

    var config = {
        chartType: chartType,
        totalWidth: parseFloat(document.getElementById("totalWidthInput").value) || 650,
        barThickness: parseFloat(document.getElementById("barThickInput").value) || 30,
        barGap: gapValue,
        palette: currentPalette,
        labelPos: parseInt(document.getElementById("dropLabel").value),
        valuePos: parseInt(document.getElementById("dropValue").value),
        fontNameLbl: document.getElementById("dropFontLbl").value,
        fontSizeLbl: parseFloat(document.getElementById("lblSizeInput").value) || 20,
        fontNameVal: document.getElementById("dropFontVal").value,
        fontSizeVal: parseFloat(document.getElementById("valSizeInput").value) || 22,
        prefix: document.getElementById("prefixInput").value,
        suffix: document.getElementById("suffixInput").value,
        showAxisX: document.getElementById("checkAxisX").checked,
        showAxisY: document.getElementById("checkAxisY").checked,
        hasHeader: hasHeader,
        legendLabels: legendLabels,
        data: data
    };

    // 3. Send to Host
    // We must escape backslashes in the JSON string for EvalScript
    var jsonStr = JSON.stringify(config);
    // Replace double quote with single quote hack if needed, or just pass correctly.
    // EvalScript takes a string. If we pass a JSON string, we need to be careful.
    // Easiest is to wrap in single quotes and escape existing single quotes.

    var scriptCall = "initGraphMaker('" + jsonStr.replace(/'/g, "\\'") + "')";

    csInterface.evalScript(scriptCall, function (res) {
        if (res.indexOf("Error") > -1) {
            alert(res);
        }
    });
}
