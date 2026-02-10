# Graph Maker CEP Extension

This is an Adobe Illustrator CEP Extension converted from the original `GraphMaker.jsx` script.

## Installation

### 1. Enable Debug Mode (Required for unsigned extensions)
Since this extension is not digitally signed, you must enable "PlayerDebugMode" in your system registry/plist.

**macOS:**
Open Terminal and run:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.10 PlayerDebugMode 1
```
(You may need to do this for other versions like CSXS.9, CSXS.8 depending on your Illustrator version).

**Windows:**
Open Registry Editor (`regedit`), go to `HKEY_CURRENT_USER/Software/Adobe/CSXS.11`, add a String value named `PlayerDebugMode` and set it to `1`.

### 2. Move to Extensions Folder
Move the entire `testes_plugin_illustrator` folder to the Adobe extensions directory:

**macOS:**
`/Library/Application Support/Adobe/CEP/extensions/`
or
`~/Library/Application Support/Adobe/CEP/extensions/`

**Windows:**
`C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`

### 3. Usage
1. Open Adobe Illustrator.
2. Go to `Window > Extensions > Graph Maker`.
3. The panel should appear.

## Project Structure
- `CSXS/manifest.xml`: Extension configuration.
- `client/`: HTML, CSS, and JavaScript for the panel.
- `host/`: ExtendScript (JSX) files that interact with Illustrator.
