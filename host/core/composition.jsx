function arkaGraphGetActiveComposition() {
    var comp = app.project.activeItem;
    if (comp instanceof CompItem) return comp;
    return null;
}

function arkaGraphGetFPS() {
    try {
        var comp = app.project.activeItem;
        if (comp && comp.frameRate) return String(comp.frameRate);
        return "24";
    } catch (e) {
        return "ERROR: " + e.toString();
    }
}
