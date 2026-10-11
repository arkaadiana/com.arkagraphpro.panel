function arkaGraphApplyAudioSync(absoluteFfxPath) {
    var undoStarted = false;

    try {
        var comp = app.project.activeItem;
        var selectedLayers;
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
        if (!selectedLayers || selectedLayers.length === 0) {
            return "ERROR: Please select a layer.";
        }

        if (selectedLayers.length === 2) {
            var layerA = selectedLayers[0];
            var layerB = selectedLayers[1];

            if (layerA.hasAudio && !layerB.hasAudio) {
                audioLayer = layerA;
                targetLayer = layerB;
            } else if (layerB.hasAudio && !layerA.hasAudio) {
                audioLayer = layerB;
                targetLayer = layerA;
            } else if (layerA.hasAudio && layerB.hasAudio) {
                if (layerA.index < layerB.index) {
                    targetLayer = layerA;
                    audioLayer = layerB;
                } else {
                    targetLayer = layerB;
                    audioLayer = layerA;
                }
            } else {
                return "ERROR: None of selected layers have Audio.";
            }
        } else if (selectedLayers.length === 1) {
            targetLayer = selectedLayers[0];
            var candidateAudio = [];
            for (layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
                var l = comp.layer(layerIndex);
                if (l !== targetLayer && l.hasAudio && l.audioEnabled) {
                    candidateAudio.push(l);
                }
            }
            if (candidateAudio.length === 1) {
                audioLayer = candidateAudio[0];
            } else if (candidateAudio.length > 1) {
                return "ERROR: Select 2 layers (Target + Audio).";
            } else {
                return "ERROR: No audio layer found in composition.";
            }
        } else {
            return "ERROR: Select max 2 layers (Target + Audio).";
        }

        ffxFile = File(absoluteFfxPath);
        if (!ffxFile.exists) {
            var altDist = absoluteFfxPath.replace("/src/assets/", "/dist/assets/");
            if (File(altDist).exists) {
                ffxFile = File(altDist);
            } else {
                var altAssets = absoluteFfxPath.replace("/src/assets/", "/assets/");
                if (File(altAssets).exists) {
                    ffxFile = File(altAssets);
                }
            }
        }
        if (!ffxFile.exists) return "ERROR: FFX preset file not found.";

        app.beginUndoGroup("ArkaGraph: Apply Audio Sync");
        undoStarted = true;

        cleanAudioName = audioLayer.name.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "");
        if (!cleanAudioName || cleanAudioName.replace(/\s/g, "") === "") {
            cleanAudioName = "Layer" + audioLayer.index;
        }
        uniqueAmpName = "AG_Amp_" + cleanAudioName;
        ampLayerExists = false;

        for (layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
            if (comp.layer(layerIndex).name === uniqueAmpName) {
                ampLayerExists = true;
                break;
            }
        }

        if (!ampLayerExists) {
            for (layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
                comp.layer(layerIndex).selected = false;
            }
            audioLayer.selected = true;

            var cmdId = app.findMenuCommandId("Convert Audio to Keyframes");
            if (cmdId !== 0) {
                app.executeCommand(cmdId);
            }

            newAmpLayer = comp.layer(1);
            if (newAmpLayer && (newAmpLayer.name === "Audio Amplitude" || newAmpLayer.name.indexOf("Audio Amplitude") !== -1)) {
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
                prop.expressionEnabled = true;
            }
        }
    }
}
