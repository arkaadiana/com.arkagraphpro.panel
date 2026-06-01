function arkaGraphApplyAudioSync(absoluteFfxPath) {
    var undoStarted = false;

    try {
        var comp = app.project.activeItem;
        var selectedLayers;
        var sortedLayers;
        var targetLayer;
        var audioLayer;
        var ffxFile;
        var cleanAudioName;
        var uniqueAmpName;
        var ampLayerExists;
        var layerIndex;
        var newAmpLayer;

        if (!comp) return "ERROR: No active composition.";

        selectedLayers = comp.selectedLayers;
        if (selectedLayers.length !== 2) {
            return "ERROR: Please select exactly 2 layers (1 Visual Target and 1 Audio Reference).";
        }

        sortedLayers = [selectedLayers[0], selectedLayers[1]];
        sortedLayers.sort(function (a, b) {
            return a.index - b.index;
        });

        targetLayer = sortedLayers[0];
        audioLayer = sortedLayers[1];

        if (!audioLayer.hasAudio) {
            return "ERROR: The bottom layer does not have an Audio component.";
        }

        ffxFile = File(absoluteFfxPath);
        if (!ffxFile.exists) return "ERROR: FFX preset file not found.";

        app.beginUndoGroup("ArkaGraph: Apply Audio Sync");
        undoStarted = true;

        cleanAudioName = audioLayer.name.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "");
        uniqueAmpName = "AG_Amp_" + cleanAudioName;
        ampLayerExists = false;

        for (layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
            if (comp.layer(layerIndex).name === uniqueAmpName) {
                ampLayerExists = true;
                break;
            }
        }

        if (!ampLayerExists) {
            targetLayer.selected = false;
            audioLayer.selected = true;

            app.executeCommand(app.findMenuCommandId("Convert Audio to Keyframes"));

            newAmpLayer = comp.layer(1);
            if (newAmpLayer && newAmpLayer.name === "Audio Amplitude") {
                newAmpLayer.name = uniqueAmpName;
                newAmpLayer.moveToEnd();
                newAmpLayer.enabled = false;
            }
        }

        for (layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
            comp.layer(layerIndex).selected = false;
        }

        targetLayer.selected = true;
        targetLayer.applyPreset(ffxFile);
        arkaGraphUpdateAudioExpressions(targetLayer, uniqueAmpName);

        app.endUndoGroup();
        undoStarted = false;
        return "OK";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}

function arkaGraphUpdateAudioExpressions(propGroup, uniqueAmpName) {
    var propertyIndex;
    var prop;
    var newExpression;

    for (propertyIndex = 1; propertyIndex <= propGroup.numProperties; propertyIndex++) {
        prop = propGroup.property(propertyIndex);

        if (prop.numProperties > 0) {
            arkaGraphUpdateAudioExpressions(prop, uniqueAmpName);
        } else if (prop.canSetExpression && prop.expression !== "") {
            if (prop.expression.indexOf("Audio Amplitude") !== -1) {
                newExpression = prop.expression.replace(/"Audio Amplitude"/g, "\"" + uniqueAmpName + "\"");
                newExpression = newExpression.replace(/'Audio Amplitude'/g, "'" + uniqueAmpName + "'");
                prop.expression = newExpression;
            }
        }
    }
}
