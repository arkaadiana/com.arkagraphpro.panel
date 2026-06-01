function arkaGraphApplyTextEffect(absoluteFfxPath) {
    var undoStarted = false;

    try {
        var comp = app.project.activeItem;
        var layer;
        var ffxFile;

        if (!comp) return "ERROR: No active composition.";

        layer = comp.selectedLayers[0];
        if (!layer) return "ERROR: Please select a layer.";

        ffxFile = File(absoluteFfxPath);
        if (!ffxFile.exists) return "ERROR: Preset file does not exist at path: " + absoluteFfxPath;

        app.beginUndoGroup("ArkaGraph: Apply FFX Effect");
        undoStarted = true;

        layer.applyPreset(ffxFile);

        app.endUndoGroup();
        undoStarted = false;
        return "OK";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}
