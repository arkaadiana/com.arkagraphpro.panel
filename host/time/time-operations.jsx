function arkaGraphGetSelectedAvLayers(comp) {
    var layers = [];
    var selectedLayers;
    var index;
    var layer;

    if (!comp || !(comp instanceof CompItem)) return layers;

    selectedLayers = comp.selectedLayers;
    for (index = 0; index < selectedLayers.length; index++) {
        layer = selectedLayers[index];
        if (layer instanceof AVLayer) layers.push(layer);
    }

    return layers;
}

function arkaGraphGetTimeRemapProperty(layer) {
    var prop = null;

    if (!layer) return null;
    try {
        if (!layer.timeRemapEnabled) layer.timeRemapEnabled = true;
        prop = layer.property("ADBE Time Remapping");
    } catch (e) {
        prop = null;
    }

    return prop;
}

function arkaGraphLayerSourceTimeAt(layer, compTime) {
    try {
        return layer.sourceTime(compTime);
    } catch (e) {
        return Math.max(0, compTime - layer.startTime);
    }
}

function arkaGraphSetTimeRemapEase(prop, keyIndex, easeIn, easeOut) {
    try {
        prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setTemporalContinuousAtKey(keyIndex, true);
        prop.setTemporalAutoBezierAtKey(keyIndex, false);
        prop.setTemporalEaseAtKey(keyIndex, easeIn, easeOut);
    } catch (e) {
    }
}

function arkaGraphSetEffectValue(effect, matchNames, value) {
    var i;
    var prop;
    var matchName;

    if (!effect) return false;

    for (i = 0; i < matchNames.length; i++) {
        matchName = matchNames[i];
        prop = effect.property(matchName);
        if (prop) {
            try {
                prop.setValue(value);
                return true;
            } catch (e) {
            }
        }
    }

    for (i = 1; i <= effect.numProperties; i++) {
        prop = effect.property(i);
        if (!prop) continue;
        for (matchName = 0; matchName < matchNames.length; matchName++) {
            if (prop.name === matchNames[matchName]) {
                try {
                    prop.setValue(value);
                    return true;
                } catch (e2) {
                }
            }
        }
    }

    return false;
}

function arkaGraphAddTimewarp(layer) {
    var effects;
    var effect;

    try {
        effects = layer.property("ADBE Effect Parade");
        if (!effects) return null;

        effect = effects.property("ADBE Timewarp");
        if (!effect) effect = effects.addProperty("ADBE Timewarp");

        if (effect) {
            arkaGraphSetEffectValue(effect, ["Method", "ADBE Timewarp-0001"], 3);
            arkaGraphSetEffectValue(effect, ["Vector Detail", "ADBE Timewarp-0015"], 50);
        }
    } catch (e) {
        effect = null;
    }

    return effect;
}

function arkaGraphApplyReverse() {
    var undoStarted = false;

    try {
        var comp = arkaGraphGetActiveComposition();
        var layers;
        var commandId;

        if (!comp) return "ERROR: No active composition.";
        layers = arkaGraphGetSelectedAvLayers(comp);
        if (layers.length === 0) return "ERROR: Select at least one layer.";

        app.beginUndoGroup("ArkaGraph: Reverse Layer");
        undoStarted = true;

        commandId = app.findMenuCommandId("Time-Reverse Layer");
        if (!commandId) commandId = app.findMenuCommandId("Time Reverse Layer");
        if (!commandId) {
            app.endUndoGroup();
            undoStarted = false;
            return "ERROR: Time-Reverse Layer command unavailable.";
        }

        app.executeCommand(commandId);

        app.endUndoGroup();
        undoStarted = false;
        return "OK";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}

function arkaGraphApplyFreezeFrame() {
    var undoStarted = false;

    try {
        var comp = arkaGraphGetActiveComposition();
        var layers;
        var layerIndex;
        var layer;
        var remap;
        var freezeTime;
        var freezeValue;
        var outTime;
        var keyIndex;
        var outKeyIndex;

        if (!comp) return "ERROR: No active composition.";
        layers = arkaGraphGetSelectedAvLayers(comp);
        if (layers.length === 0) return "ERROR: Select at least one layer.";

        app.beginUndoGroup("ArkaGraph: Freeze Frame");
        undoStarted = true;

        for (layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            layer = layers[layerIndex];
            if (comp.time < layer.inPoint || comp.time > layer.outPoint) continue;

            remap = arkaGraphGetTimeRemapProperty(layer);
            if (!remap) continue;

            freezeTime = comp.time;
            freezeValue = arkaGraphLayerSourceTimeAt(layer, freezeTime);
            outTime = Math.max(freezeTime + comp.frameDuration, layer.outPoint - comp.frameDuration);

            remap.setValueAtTime(freezeTime, freezeValue);
            remap.setValueAtTime(outTime, freezeValue);

            keyIndex = remap.nearestKeyIndex(freezeTime);
            outKeyIndex = remap.nearestKeyIndex(outTime);

            try {
                remap.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
                remap.setInterpolationTypeAtKey(outKeyIndex, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
            } catch (interpolationError) {
            }
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}

function arkaGraphGetRampOptions(optionsJSON) {
    var options = {};

    try {
        if (optionsJSON) options = JSON.parse(optionsJSON);
    } catch (e) {
        options = {};
    }

    if (!options.shape) options.shape = "fastSlowFast";
    options.intensity = Math.max(10, Math.min(100, Math.round(options.intensity || 80)));

    return options;
}

function arkaGraphApplyNativeSpeedRamp(optionsJSON) {
    var undoStarted = false;

    try {
        var comp = arkaGraphGetActiveComposition();
        var layers;
        var layerIndex;
        var layer;
        var options;

        if (!comp) return "ERROR: No active composition.";
        layers = arkaGraphGetSelectedAvLayers(comp);
        if (layers.length === 0) return "ERROR: Select at least one layer.";
        options = arkaGraphGetRampOptions(optionsJSON);

        app.beginUndoGroup("ArkaGraph: Native Speed Ramp");
        undoStarted = true;

        for (layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            layer = layers[layerIndex];
            arkaGraphApplySpeedRampToLayer(comp, layer, comp.time, true, options);
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}

function arkaGraphApplySpeedRampToLayer(comp, layer, center, addTimewarp, options) {
    if (!comp || !layer) return false;
    
    // Pengaman: pastikan layer mendukung Time Remap (bukan null/audio only)
    if (!layer.canSetTimeRemapEnabled) return false;

    var remap, startTime, endTime, val1, val2, k1, k2;
    options = options || arkaGraphGetRampOptions("");
    var shape = options.shape || "fastSlowFast";
    var intensity = options.intensity || 80; 

    if (shape === "constant") {
        layer.stretch = 10000 / intensity;
        if (addTimewarp) arkaGraphAddTimewarp(layer);
        return true;
    }

    startTime = layer.inPoint;
    endTime = layer.outPoint;
    if (endTime <= startTime) return false;

    // 1. Reset Time Remap untuk menghilangkan curve bekas pemakaian sebelumnya
    layer.timeRemapEnabled = false;
    layer.timeRemapEnabled = true;
    remap = layer.property("ADBE Time Remapping");

    // 2. Ambil nilai waktu asli sebelum dimanipulasi
    val1 = remap.valueAtTime(startTime, true);
    val2 = remap.valueAtTime(endTime, true);

    // 3. WAJIB: Tambahkan/kunci keyframe baru DULU sebelum menghapus yang lama
    // Agar properti Time Remap tidak pernah kosong (mencegah error 'hidden')
    remap.setValueAtTime(startTime, val1);
    remap.setValueAtTime(endTime, val2);

    // 4. Hapus keyframe default bawaan AE (yang berada di ujung source asli)
    for (var i = remap.numKeys; i >= 1; i--) {
        var kt = remap.keyTime(i);
        // Hapus jika keyframe bukan yang baru saja kita buat (toleransi 0.005 detik)
        if (Math.abs(kt - startTime) > 0.005 && Math.abs(kt - endTime) > 0.005) {
            remap.removeKey(i);
        }
    }

    // Ambil index dari 2 keyframe yang sudah bersih
    k1 = remap.nearestKeyIndex(startTime);
    k2 = remap.nearestKeyIndex(endTime);

    // 5. Kalkulasi S-Curve Aman
    var dt = endTime - startTime;
    var dv = val2 - val1;
    var vAvg = (dt > 0) ? (dv / dt) : 1.0;

    var safeInfluence = 15 + (intensity / 100) * 40; 
    var boostSpeed = vAvg + (intensity / 100) * (vAvg * 8); 

    var easeSteep = [new KeyframeEase(boostSpeed, safeInfluence)];
    var easeFlat = [new KeyframeEase(vAvg * 0.05, safeInfluence)];
    var easeNeutral = [new KeyframeEase(vAvg, 0.1)];

    if (shape === "fastSlow") {
        arkaGraphSetTimeRemapEase(remap, k1, easeNeutral, easeSteep);
        arkaGraphSetTimeRemapEase(remap, k2, easeFlat, easeNeutral);
    } 
    else if (shape === "slowFast") {
        arkaGraphSetTimeRemapEase(remap, k1, easeNeutral, easeFlat);
        arkaGraphSetTimeRemapEase(remap, k2, easeSteep, easeNeutral);
    } 
    else {
        arkaGraphSetTimeRemapEase(remap, k1, easeNeutral, easeSteep);
        arkaGraphSetTimeRemapEase(remap, k2, easeSteep, easeNeutral);
    }

    if (addTimewarp) arkaGraphAddTimewarp(layer);
    return true;
}

function arkaGraphSanitizeFileName(value) {
    return String(value || "layer").replace(/[\\\/\:\*\?\"\<\>\|]/g, "_").replace(/\s+/g, "_");
}

function arkaGraphPrepareAISpeedRampJob() {
    try {
        var comp = arkaGraphGetActiveComposition();
        var layers;
        var layer;
        var source;
        var sourceFile;

        if (!comp) return "ERROR: No active composition.";

        layers = arkaGraphGetSelectedAvLayers(comp);
        if (layers.length !== 1) return "ERROR: Select exactly one footage layer for AI mode.";

        layer = layers[0];
        source = layer.source;

        if (!source || !(source instanceof FootageItem) || !source.file) {
            return "ERROR: AI mode currently needs a selected video footage layer, not shape/text/precomp.";
        }

        sourceFile = source.file;
        if (!sourceFile.exists) return "ERROR: Source footage file was not found on disk.";

        return JSON.stringify({
            compName: comp.name,
            compFrameRate: comp.frameRate,
            compTime: comp.time,
            layerIndex: layer.index,
            layerName: layer.name,
            safeLayerName: arkaGraphSanitizeFileName(layer.name),
            sourcePath: sourceFile.fsName,
            sourceName: source.name,
            startTime: layer.startTime,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            stretch: layer.stretch,
            sourceDuration: source.duration,
            sourceFrameRate: source.frameRate
        });
    } catch (e) {
        return "ERROR: " + e.toString();
    }
}

function arkaGraphImportAISpeedRampResult(outputPath, jobJSON) {
    var undoStarted = false;

    try {
        var comp = arkaGraphGetActiveComposition();
        var job = JSON.parse(jobJSON);
        var outputFile = new File(outputPath);
        var importOptions;
        var footage;
        var aiLayer;
        var originalLayer;

        if (!comp) return "ERROR: No active composition.";
        if (!outputFile.exists) return "ERROR: AI output file was not found.";

        app.beginUndoGroup("ArkaGraph: Import AI Speed Ramp");
        undoStarted = true;

        importOptions = new ImportOptions(outputFile);
        footage = app.project.importFile(importOptions);
        aiLayer = comp.layers.add(footage);
        aiLayer.name = job.layerName + " - AI Speed Ramp";
        aiLayer.startTime = job.startTime;
        aiLayer.inPoint = job.inPoint;
        aiLayer.outPoint = job.outPoint;
        aiLayer.stretch = job.stretch;
        arkaGraphApplySpeedRampToLayer(comp, aiLayer, job.compTime, false, job.rampOptions);

        originalLayer = comp.layer(job.layerIndex + 1);
        if (originalLayer) {
            aiLayer.moveBefore(originalLayer);
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}

function applyReverse() {
    return arkaGraphApplyReverse();
}

function applyFreezeFrame() {
    return arkaGraphApplyFreezeFrame();
}

function applyNativeSpeedRamp() {
    return arkaGraphApplyNativeSpeedRamp();
}