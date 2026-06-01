var PRESET_3D_IDS = {
    "zoomRandom3D": true,
    "zoomRotate3D": true,
    "zoomDive3D": true,
    "spiralVortex": true,
    "scatterExplode": true
};

function arkaGraphApplyTextAnimation(presetJSONString) {
    var undoStarted = false;

    try {
        var preset = JSON.parse(presetJSONString);
        var comp;
        var layer = null;
        var layerIndex;
        var animMode;
        var animatorData;
        var fxName;
        var inTag;
        var outTag;
        var inPowerName;
        var inDelayName;
        var outPowerName;
        var outDelayName;
        var is3DPreset;
        var textProps;
        var groupAlignX = 0;
        var groupAlignY = -50;
        var anchor;
        var rect;
        var moreOptions;
        var animators;
        var effectsGroup;
        var markerProp;
        var span;
        var safeDuration;
        var inPower;
        var inDelay;
        var inMarkerTime;
        var inAmountProp;
        var outPower;
        var outDelay;
        var outMarkerTime;
        var outAmountProp;

        if (!preset) return "ERROR: Invalid text preset.";

        comp = arkaGraphGetActiveComposition();
        if (!comp) return "ERROR: No active composition.";

        for (layerIndex = 0; layerIndex < comp.selectedLayers.length; layerIndex++) {
            if (comp.selectedLayers[layerIndex] instanceof TextLayer) {
                layer = comp.selectedLayers[layerIndex];
                break;
            }
        }

        if (!layer) return "ERROR: Please select a text layer first.";

        animMode = String(preset.animMode || "both").toLowerCase();
        animatorData = preset.animator || {};
        fxName = preset.name || "Custom";
        inTag = "IN [" + fxName + "]";
        outTag = "OUT [" + fxName + "]";
        inPowerName = "AG: IN Pow [" + fxName + "]";
        inDelayName = "AG: IN Del [" + fxName + "]";
        outPowerName = "AG: OUT Pow [" + fxName + "]";
        outDelayName = "AG: OUT Del [" + fxName + "]";
        is3DPreset = !!PRESET_3D_IDS[preset.id];

        app.beginUndoGroup("ArkaGraph: Apply Pro Text Animation");
        undoStarted = true;

        if (is3DPreset && preset.id !== "scatterExplode" && !layer.threeDLayer) {
            layer.threeDLayer = true;
        }

        textProps = layer.property("ADBE Text Properties");

        try {
            anchor = layer.property("ADBE Anchor Point").value;
            rect = layer.sourceRectAtTime(comp.time, false);
            groupAlignX = Math.max(-50, Math.min(50, ((anchor[0] - rect.left) / rect.width - 0.5) * 100));
            groupAlignY = Math.max(-50, Math.min(50, ((anchor[1] - rect.top) / rect.height - 0.5) * 100));
        } catch (alignError) {
        }

        moreOptions = arkaGraphGetTextProperty(textProps, ["ADBE Text More Options", "More Options"]);
        if (moreOptions) {
            arkaGraphSetTextProperty(moreOptions, ["ADBE Text Anchor Point Align", "Anchor Point Grouping"], 1);
            arkaGraphSetTextProperty(moreOptions, ["ADBE Text Grouping Alignment", "Grouping Alignment"], [groupAlignX, groupAlignY]);
        }

        animators = arkaGraphGetTextProperty(textProps, ["ADBE Text Animators", "Animators"]);
        if (!animators) {
            arkaGraphCloseUndoGroup(undoStarted);
            undoStarted = false;
            return "ERROR: Text animators group unavailable.";
        }

        effectsGroup = layer.property("ADBE Effect Parade");
        markerProp = layer.property("ADBE Marker") || layer.property("Marker");

        if (animMode === "in" || animMode === "both") {
            arkaGraphRemoveTextPresetPhase(animators, effectsGroup, markerProp, fxName, "IN");
        }
        if (animMode === "out" || animMode === "both") {
            arkaGraphRemoveTextPresetPhase(animators, effectsGroup, markerProp, fxName, "OUT");
        }

        span = layer.outPoint - layer.inPoint;
        safeDuration = Math.min(preset.duration || 0.6, span * 0.3);

        if (animMode === "in" || animMode === "both") {
            if (effectsGroup) {
                inPower = effectsGroup.addProperty("ADBE Slider Control");
                inPower.name = inPowerName;
                inPower.property("Slider").setValue(100);

                inDelay = effectsGroup.addProperty("ADBE Slider Control");
                inDelay.name = inDelayName;
                inDelay.property("Slider").setValue(35);
            }

            inMarkerTime = arkaGraphGetSafeTextMarkerTime(markerProp, layer.inPoint + safeDuration, false);
            arkaGraphAddTextMarker(markerProp, inMarkerTime, inTag);

            if (preset.id === "scatterExplode") {
                arkaGraphAddScatterPositionAnimator(animators, fxName, "IN", false, inPowerName, inDelayName, inTag);
            }

            inAmountProp = arkaGraphBuildTextSubAnimator(animators, fxName, preset, animatorData, "IN", false, is3DPreset);
            if (inAmountProp && inAmountProp.canSetExpression) {
                inAmountProp.expression = arkaGraphBuildInAmountExpression(inTag, preset.id, inPowerName, inDelayName);
            }
        }

        if (animMode === "out" || animMode === "both") {
            if (effectsGroup) {
                outPower = effectsGroup.addProperty("ADBE Slider Control");
                outPower.name = outPowerName;
                outPower.property("Slider").setValue(100);

                outDelay = effectsGroup.addProperty("ADBE Slider Control");
                outDelay.name = outDelayName;
                outDelay.property("Slider").setValue(35);
            }

            outMarkerTime = arkaGraphGetSafeTextMarkerTime(markerProp, layer.outPoint - safeDuration, true);
            arkaGraphAddTextMarker(markerProp, outMarkerTime, outTag);

            if (preset.id === "scatterExplode") {
                arkaGraphAddScatterPositionAnimator(animators, fxName, "OUT", true, outPowerName, outDelayName, outTag);
            }

            outAmountProp = arkaGraphBuildTextSubAnimator(animators, fxName, preset, animatorData, "OUT", true, is3DPreset);
            if (outAmountProp && outAmountProp.canSetExpression) {
                outAmountProp.expression = arkaGraphBuildOutAmountExpression(outTag, preset.id, outPowerName, outDelayName);
            }
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK: Text animation applied.";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}

function arkaGraphRemoveTextPresetPhase(animators, effectsGroup, markerProp, fxName, phase) {
    var targetName = "[" + fxName + "]";
    var animatorIndex;
    var animatorName;
    var effectIndex;
    var effectName;
    var markerIndex;
    var markerComment;

    if (animators) {
        for (animatorIndex = animators.numProperties; animatorIndex >= 1; animatorIndex--) {
            animatorName = animators.property(animatorIndex).name;
            if (animatorName.indexOf(targetName) !== -1 && animatorName.indexOf("(" + phase + ")") !== -1) {
                animators.property(animatorIndex).remove();
            }
        }
    }

    if (effectsGroup) {
        for (effectIndex = effectsGroup.numProperties; effectIndex >= 1; effectIndex--) {
            effectName = effectsGroup.property(effectIndex).name;
            if (effectName.indexOf("AG: " + phase) !== -1 && effectName.indexOf(targetName) !== -1) {
                effectsGroup.property(effectIndex).remove();
            }
        }
    }

    if (markerProp) {
        for (markerIndex = markerProp.numKeys; markerIndex >= 1; markerIndex--) {
            markerComment = markerProp.keyValue(markerIndex).comment;
            if (markerComment && markerComment.indexOf(phase + " " + targetName) === 0) {
                markerProp.removeKey(markerIndex);
            }
        }
    }
}

function arkaGraphGetSafeTextMarkerTime(markerProp, targetTime, isOutPhase) {
    var safeTime = targetTime;
    var offset = isOutPhase ? -0.05 : 0.05;
    var maxTries = 30;
    var collision;
    var markerIndex;
    var existingTime;

    if (!markerProp || markerProp.numKeys === 0) return targetTime;

    while (maxTries-- > 0) {
        collision = false;
        for (markerIndex = 1; markerIndex <= markerProp.numKeys; markerIndex++) {
            existingTime = markerProp.keyTime(markerIndex);
            if (Math.abs(existingTime - safeTime) < 0.04) {
                safeTime += offset;
                collision = true;
                break;
            }
        }
        if (!collision) break;
    }

    return safeTime;
}

function arkaGraphBuildTextSubAnimator(animators, fxName, preset, animatorData, phaseSuffix, isOutPhase, is3DPreset) {
    var animator = animators.addProperty("ADBE Text Animator");
    var animatorProps;
    var selectors;
    var targetPosition;
    var rotationValue;
    var rotationXValue;
    var rotationYValue;
    var orientation;
    var orientationValue;
    var zValue;
    var selector;
    var amountProp;

    animator.name = "AG: " + fxName + " (" + phaseSuffix + ")";
    animatorProps = arkaGraphGetTextProperty(animator, ["ADBE Text Animator Properties", "Properties"]);
    selectors = arkaGraphGetTextProperty(animator, ["ADBE Text Selectors", "Selectors"]);

    if (animatorData.position instanceof Array && preset.id !== "scatterExplode") {
        targetPosition = [animatorData.position[0], animatorData.position[1], animatorData.position[2] || 0];
        if (isOutPhase) {
            if (preset.id === "gravityCrush") {
                targetPosition[1] = -targetPosition[1];
            }
            if (preset.id === "shinobiStrike" || preset.id === "whipSwing" || preset.id === "datamoshTear") {
                targetPosition[0] = -targetPosition[0];
                targetPosition[1] = -targetPosition[1];
            }
        }
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Position 3D", "ADBE Text Position"], targetPosition);
    }

    if (animatorData.scale instanceof Array) {
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Scale 3D", "ADBE Text Scale"], animatorData.scale);
    } else if (preset.id === "scatterExplode") {
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Scale", "Scale"], [0, 0]);
    }

    if (typeof animatorData.opacity !== "undefined") {
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Opacity"], Number(animatorData.opacity));
    } else if (preset.id === "scatterExplode") {
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Opacity"], 0);
    }

    if (typeof animatorData.tracking !== "undefined") {
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Tracking Amount", "ADBE Text Tracking"], Number(animatorData.tracking));
    }

    if (typeof animatorData.rotation !== "undefined") {
        rotationValue = Number(animatorData.rotation);
        if (isOutPhase && (preset.id === "chaoticRandom" || preset.id === "scatterExplode" || preset.id === "spiralVortex" || preset.id === "whipSwing" || preset.id === "zoomRotate3D" || preset.id === "swingingRotate")) {
            rotationValue = -rotationValue;
        }
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Rotation", "Rotation"], rotationValue);
    }

    if (typeof animatorData.rotationX !== "undefined") {
        rotationXValue = Number(animatorData.rotationX);
        if (isOutPhase && (preset.id === "zoomRotate3D" || preset.id === "zoomDive3D")) {
            rotationXValue = -rotationXValue;
        }
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Rotation X", "Rotation X"], rotationXValue);
    }

    if (typeof animatorData.rotationY !== "undefined") {
        rotationYValue = Number(animatorData.rotationY);
        if (isOutPhase && preset.id === "zoomRotate3D") {
            rotationYValue = -rotationYValue;
        }
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Rotation Y", "Rotation Y"], rotationYValue);
    }

    if (typeof animatorData.orientation !== "undefined" && is3DPreset) {
        orientation = animatorData.orientation;
        orientationValue = [Number(orientation[0] || 0), Number(orientation[1] || 0), Number(orientation[2] || 0)];
        if (isOutPhase) {
            orientationValue[0] = -orientationValue[0];
            orientationValue[1] = -orientationValue[1];
            orientationValue[2] = -orientationValue[2];
        }
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Orientation", "Orientation"], orientationValue);
    }

    if (is3DPreset && preset.id === "zoomRandom3D" && typeof animatorData.positionZ !== "undefined") {
        zValue = Number(animatorData.positionZ);
        if (isOutPhase) zValue = -zValue;
        arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Position 3D", "ADBE Text Position"], [0, 0, zValue]);
    }

    selector = selectors.addProperty("ADBE Text Expressible Selector");
    selector.name = "ArkaGraph Engine";
    amountProp = arkaGraphGetTextProperty(selector, ["ADBE Text Expressible Amount", "Amount"]);
    if (!amountProp) {
        try {
            amountProp = selector.property(2);
        } catch (amountError) {
        }
    }

    return amountProp;
}

function arkaGraphAddScatterPositionAnimator(animators, fxName, phase, isOutPhase, powerName, delayName, tag) {
    var animator = animators.addProperty("ADBE Text Animator");
    var animatorProps;
    var selectors;
    var selector;
    var amountProp;

    animator.name = "AG: " + fxName + " (" + phase + ") [Scatter]";
    animatorProps = arkaGraphGetTextProperty(animator, ["ADBE Text Animator Properties", "Properties"]);
    arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Position", "Position"], [100, 100]);

    selectors = arkaGraphGetTextProperty(animator, ["ADBE Text Selectors", "Selectors"]);
    selector = selectors.addProperty("ADBE Text Expressible Selector");
    selector.name = "ArkaGraph Scatter Engine";
    amountProp = arkaGraphGetTextProperty(selector, ["ADBE Text Expressible Amount", "Amount"]);
    if (!amountProp) {
        try {
            amountProp = selector.property(2);
        } catch (amountError) {
        }
    }
    if (amountProp) {
        amountProp.expression = arkaGraphBuildScatterExplodeExpression(tag, isOutPhase, powerName, delayName);
    }
}
