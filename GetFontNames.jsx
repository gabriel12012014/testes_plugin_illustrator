#target illustrator

function main() {
    var fontList = [];
    // Loop through all installed fonts
    for (var i = 0; i < app.textFonts.length; i++) {
        var f = app.textFonts[i];
        // Filter for "Globo" to make it easier to find, or list all if empty.
        if (f.name.indexOf("Globo") > -1 || f.name.indexOf("Tx") > -1) {
            fontList.push(f.name + " (" + f.family + " " + f.style + ")");
        }
    }

    if (fontList.length === 0) {
        alert("Não encontrei nenhuma fonte com 'Globo' ou 'Tx' no nome.\nVou listar as primeiras 20 fontes para teste.");
        for (var i = 0; i < 20 && i < app.textFonts.length; i++) {
            fontList.push(app.textFonts[i].name);
        }
    }

    var result = fontList.join("\n");

    // Save to desktop or show in dialog (Dialog might be too small for long list)
    // Let's copy to clipboard or show in a big input box

    var w = new Window("dialog", "Descobridor de Fontes");
    w.add("statictext", undefined, "Esses são os nomes EXATOS (PostScript) encontrados:");
    var txt = w.add("edittext", [0, 0, 400, 300], result, { multiline: true });
    w.add("statictext", undefined, "Copie o nome que aparece antes do parenteses e use no script.");
    w.add("button", undefined, "OK", { name: "ok" });
    w.show();
}

main();
