// Main JS for Graph Maker


document.addEventListener('DOMContentLoaded', () => {
    // Initial rows
    addRow();
    addRow();
    addRow();

    document.getElementById('add-row').addEventListener('click', () => addRow());
    document.getElementById('create-chart').addEventListener('click', createChart);
});

function addRow() {
    const tbody = document.getElementById('data-body');
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td><input type="text" placeholder="Label"></td>
        <td><input type="number" value="0" placeholder="Value"></td>
        <td style="text-align: center;"><button class="remove-row-btn">×</button></td>
    `;

    tr.querySelector('.remove-row-btn').addEventListener('click', () => {
        tr.remove();
    });

    tbody.appendChild(tr);
}

function getData() {
    const rows = document.querySelectorAll('#data-body tr');
    const data = [];

    rows.forEach(row => {
        const label = row.querySelector('input[type="text"]').value;
        const value = parseFloat(row.querySelector('input[type="number"]').value) || 0;
        if (label || value !== 0) {
            data.push({ label, value });
        }
    });

    return data;
}

async function createChart() {
    const data = getData();
    if (data.length === 0) {
        console.warn("No data to chart");
        return;
    }

    // Access Illustrator Application
    const { app } = require("illustrator");

    if (!app.documents.length) {
        await app.documents.add();
    }
    const doc = app.activeDocument;

    // Draw Bar Chart
    // We assume a baseline at Y = 0 for simplicity, or we can pick a coordinate.
    // In Illustrator scripting: shape.position = [x, y] (where y is usually top).
    // Or method: pathItems.rectangle(top, left, width, height).
    // To make bars stand on a common baseline (let's say Y=0), 
    // we need the 'top' of the bar to be equal to its height.
    // rectangle(height, x, width, height) -> goes from y=height down to y=0.

    // Let's create a chart starting at some position on the artboard.
    // We'll define an origin for the chart.
    const originX = 100;
    const originY = 400; // If Y-axis increases upwards, this is a line. 
    // Note: In some Illus versions/scripting contexts, rulers can be changed.
    // But usually 'rectangle' parameters are consistent relative to each other.

    const barWidth = 30;
    const gap = 10;
    const maxVal = Math.max(...data.map(d => d.value));
    const scaleFactor = 200 / (maxVal || 1); // Avoid divide by zero

    const chartGroup = doc.groupItems.add();
    chartGroup.name = "UXP Bar Chart";

    data.forEach((item, index) => {
        const barHeight = item.value * scaleFactor;
        const x = originX + (index * (barWidth + gap));

        // Calculate 'top' so that the bottom of the rect lands on 'originY'.
        // If coordinate system is Y-up (Cartesian): Top = OriginY + BarHeight
        // If coordinate system is Y-down (Web/Screen): Top = OriginY - BarHeight

        // Let's assume typical Cartesian for Illustrator scripting (though Y is sometimes inverted in UI).
        // Safest bet for "standing" bars:
        // We want the rect to span from OriginY to (OriginY + BarHeight).
        // Since 'rectangle' takes TOP as first arg:
        // Top = OriginY + BarHeight. 
        // Then it draws DOWN 'BarHeight' amount, ending at OriginY.

        const top = originY + barHeight;
        const left = x;

        const rect = chartGroup.pathItems.rectangle(top, left, barWidth, barHeight);

        // Color (Cyan-ish)
        const color = new app.CMYKColor();
        color.cyan = 85;
        color.magenta = 10;
        color.yellow = 0;
        color.black = 0;

        rect.fillColor = color;
        rect.stroked = false;

        // Label
        const textFrame = chartGroup.textFrames.add();
        textFrame.contents = item.label;

        // Position label below the bar
        // If baseline is OriginY, we want label at OriginY - something?
        // Or if Y is up, OriginY - 10.
        textFrame.top = originY - 10;
        textFrame.left = x;
    });
}
