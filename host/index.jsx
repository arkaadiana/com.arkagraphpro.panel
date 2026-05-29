function arkaGraphApplyNativeEase(x1, y1, x2, y2) {
    try {
        var comp = app.project.activeItem;
        if (!comp) return "ERROR: No active composition.";
        var props = getSelectedKeyframeProperties(comp);
        if (props.length === 0) return "ERROR: No keys selected.";
        app.beginUndoGroup("ArkaGraph: Apply Ease");
        var infOut = Math.max(0.1, Math.min(100, x1 * 100));
        var infIn  = Math.max(0.1, Math.min(100, (1 - x2) * 100));
        var eff_x1 = Math.max(0.001, x1);
        var eff_x2 = Math.max(0.001, 1 - x2);
        for (var p = 0; p < props.length; p++) {
            var prop = props[p];
            var selKeys = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                if (prop.keySelected(k)) selKeys.push(k);
            }
            for (var i = 0; i < selKeys.length; i++) {
                var kIdx = selKeys[i];
                if (kIdx >= prop.numKeys) continue;
                var v0 = prop.keyValue(kIdx);
                var v1 = prop.keyValue(kIdx + 1);
                var dx = prop.keyTime(kIdx + 1) - prop.keyTime(kIdx);
                var isSpatial = (prop.propertyValueType == PropertyValueType.TwoD_SPATIAL || prop.propertyValueType == PropertyValueType.ThreeD_SPATIAL);
                var dim = 1;
                if (!isSpatial) {
                    if (prop.propertyValueType == PropertyValueType.TwoD) dim = 2;
                    if (prop.propertyValueType == PropertyValueType.ThreeD || prop.propertyValueType == PropertyValueType.COLOR) dim = 3;
                    if (prop.propertyValueType == PropertyValueType.FourD) dim = 4;
                }
                var inArr = [], outArr = [];
                if (isSpatial) {
                    var sum = 0;
                    for (var s = 0; s < v0.length; s++) sum += Math.pow(v1[s] - v0[s], 2);
                    var avgS = dx === 0 ? 0 : Math.sqrt(sum) / dx;
                    inArr.push(new KeyframeEase(((1 - y2) / eff_x2) * avgS, infIn));
                    outArr.push(new KeyframeEase((y1 / eff_x1) * avgS, infOut));
                } else {
                    for (var d = 0; d < dim; d++) {
                        var v0_d = (v0 instanceof Array) ? v0[d] : v0;
                        var v1_d = (v1 instanceof Array) ? v1[d] : v1;
                        var avgS = dx === 0 ? 0 : (v1_d - v0_d) / dx;
                        inArr.push(new KeyframeEase(((1 - y2) / eff_x2) * avgS, infIn));
                        outArr.push(new KeyframeEase((y1 / eff_x1) * avgS, infOut));
                    }
                }
                prop.setTemporalEaseAtKey(kIdx, prop.keyInTemporalEase(kIdx), outArr);
                prop.setTemporalEaseAtKey(kIdx + 1, inArr, prop.keyOutTemporalEase(kIdx + 1));
            }
        }
        app.endUndoGroup();
        return "OK";
    } catch(e) { return "ERROR: " + e.toString(); }
}

function arkaGraphSyncFromAE() {
    try {
        var comp = app.project.activeItem;
        if (!comp) return null;
        var props = getSelectedKeyframeProperties(comp);
        if (props.length === 0) return null;
        var prop = props[0];
        var selKeys = [];
        for (var k = 1; k <= prop.numKeys; k++) {
            if (prop.keySelected(k)) selKeys.push(k);
        }
        if (selKeys.length === 0) return null;
        var k1 = selKeys[0];
        if (k1 >= prop.numKeys && prop.numKeys > 1) k1 = k1 - 1;
        var v0 = prop.keyValue(k1);
        var v1 = prop.keyValue(k1 + 1);
        var dx = prop.keyTime(k1 + 1) - prop.keyTime(k1);
        var dy = 0;
        if (prop.propertyValueType == PropertyValueType.TwoD_SPATIAL || prop.propertyValueType == PropertyValueType.ThreeD_SPATIAL) {
            var sum = 0;
            for (var s = 0; s < v0.length; s++) sum += Math.pow(v1[s] - v0[s], 2);
            dy = Math.sqrt(sum);
        } else {
            dy = ((v1 instanceof Array) ? v1[0] : v1) - ((v0 instanceof Array) ? v0[0] : v0);
        }
        var avgS = dx === 0 ? 0 : dy / dx;
        var easeOut = prop.keyOutTemporalEase(k1)[0];
        var easeIn = prop.keyInTemporalEase(k1 + 1)[0];
        var x1 = easeOut.influence / 100;
        var x2 = 1 - (easeIn.influence / 100);
        var y1, y2;
        if (Math.abs(avgS) > 0.0001) {
            y1 = (easeOut.speed / avgS) * x1;
            y2 = 1 - (easeIn.speed / avgS) * (1 - x2);
        } else {
            y1 = 0;
            y2 = 1;
        }
        y1 = Math.max(-5, Math.min(5, y1));
        y2 = Math.max(-5, Math.min(5, y2));
        if (isNaN(y1) || !isFinite(y1)) y1 = x1;
        if (isNaN(y2) || !isFinite(y2)) y2 = x2;
        return JSON.stringify({ x1: x1, y1: y1, x2: x2, y2: y2 });
    } catch(e) { return null; }
}

function arkaGraphApplyExpression(expressionCode) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return "ERROR: No active composition.";
        var selectedProps = getSelectedKeyframeProperties(comp);
        if (selectedProps.length === 0) return "ERROR: No properties selected.";
        app.beginUndoGroup("ArkaGraph: Apply Expression");
        for (var p = 0; p < selectedProps.length; p++) {
            try { selectedProps[p].expression = expressionCode; } catch(ee) {}
        }
        app.endUndoGroup();
        return "OK: Expression applied.";
    } catch(e) { return "ERROR: " + e.toString(); }
}

function arkaGraphClearExpression() {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return "ERROR: No active composition.";
        var selectedProps = getSelectedKeyframeProperties(comp);
        app.beginUndoGroup("ArkaGraph: Clear Expression");
        for (var p = 0; p < selectedProps.length; p++) {
            selectedProps[p].expression = "";
        }
        app.endUndoGroup();
        return "OK";
    } catch(e) { return "ERROR: " + e.toString(); }
}

function arkaGraphGetTextProperty(group, names) {
    if (!group) return null;
    for (var n = 0; n < names.length; n++) {
        try {
            var direct = group.property(names[n]);
            if (direct) return direct;
        } catch (e) { }
    }
    try {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (!prop) continue;
            for (var j = 0; j < names.length; j++) {
                if (prop.matchName === names[j] || prop.name === names[j]) return prop;
            }
        }
    } catch (e) { }
    return null;
}

function arkaGraphSetTextProperty(group, names, value) {
    var prop = arkaGraphGetTextProperty(group, names);
    if (!prop) return false;
    try { prop.setValue(value); return true; } catch (e) { return false; }
}

function arkaGraphAddTextAnimatorProperty(group, names, value) {
    if (!group) return null;
    var prop = null;
    for (var i = 0; i < names.length; i++) {
        try { prop = group.addProperty(names[i]); if (prop) break; } catch (e) { }
    }
    if (prop) {
        try {
            prop.setValue(value);
        } catch (e) {
            try {
                if (value instanceof Array && value.length === 3) prop.setValue([value[0], value[1]]);
            } catch (ee) { }
        }
    }
    return prop;
}

function arkaGraphAddTextMarker(markerProp, timeValue, label) {
    if (!markerProp) return;
    var mv = new MarkerValue(label);
    mv.comment = label;
    mv.cuePointName = "COM_ARKAGRAPH_MARKER";
    mv.eventCuePoint = false;
    markerProp.setValueAtTime(timeValue, mv);
}

function arkaGraphBuildInAmountExpression(inTag, presetId, powerName, delayName) {
    var isSpring = (presetId === "swingingRotate" || presetId === "rubberBand");
    var isPop = (presetId === "overshootPop" || presetId === "chaoticRandom" || presetId === "shinobiStrike" || presetId === "spinPop" || presetId === "floatPop" || presetId === "scatterExplode" || presetId === "magneticSnap" || presetId === "spiralVortex" || presetId === "zoomDive3D" || presetId === "whipSwing" || presetId === "zoomRandom3D" || presetId === "zoomRotate3D");
    var isRandom = (presetId === "chaoticRandom" || presetId === "cyberCoding" || presetId === "cyberDataGlitch" || presetId === "scatterExplode" || presetId === "neonPulse" || presetId === "datamoshTear" || presetId === "zoomRandom3D");
    var isStep = (presetId === "terminalTyping" || presetId === "cyberCoding" || presetId === "cyberDataGlitch" || presetId === "neonPulse" || presetId === "datamoshTear");
    return [
        "var v = 0;",
        "try {",
        "  var inT = null;",
        "  for (var i = 1; i <= marker.numKeys; i++) {",
        "    if (marker.key(i).comment === '" + inTag + "') { inT = marker.key(i).time; break; }",
        "  }",
        "  if (inT !== null) {",
        "    v = 100;",
        "    var power = 100; var delayMs = 35;",
        "    try { power = effect('" + powerName + "')(1); delayMs = effect('" + delayName + "')(1); } catch(err) {}",
        "    var markerDur = Math.max(0.01, inT - thisLayer.inPoint);",
        "    var myDelay = 0; var totalDelay = 0;",
        "    var isStep = " + isStep + ";",
        "    if (" + isRandom + ") {",
        "      seedRandom(textIndex, true);",
        "      totalDelay = markerDur * 0.75;",
        "      myDelay = random(0, totalDelay);",
        "    } else if (isStep) {",
        "      totalDelay = markerDur * 0.95;",
        "      myDelay = (textIndex - 1) * (totalDelay / Math.max(1, textTotal - 1));",
        "    } else {",
        "      totalDelay = (textTotal - 1) * (delayMs / 1000);",
        "      myDelay = (textIndex - 1) * (delayMs / 1000);",
        "    }",
        "    var durIn = Math.max(0.05, markerDur - totalDelay);",
        "    var t = time - thisLayer.inPoint - myDelay;",
        "    if (t >= 0 && t < durIn) {",
        "      var p = t / durIn;",
        "      if (isStep) {",
        "        v = 0;",
        "      } else if (" + isSpring + ") {",
        "        var bounce = Math.cos(t * 1.5 * 2 * Math.PI / durIn) * Math.exp(-t * 4.0 / durIn) * (power / 100);",
        "        v = 100 - ((1 - bounce) * 100);",
        "      } else if (" + isPop + ") {",
        "        var c1 = 1.70158 * (power / 100); var c3 = c1 + 1;",
        "        var pp = p - 1;",
        "        v = 100 - ((1 + c3 * Math.pow(pp, 3) + c1 * Math.pow(pp, 2)) * 100);",
        "      } else {",
        "        v = 100 - ((1 - Math.pow(1 - Math.min(1, p), 4)) * 100);",
        "      }",
        "    } else if (t >= durIn) { v = 0; }",
        "  }",
        "} catch(e) { v = 0; }",
        "[v, v, v];"
    ].join("\n");
}

function arkaGraphBuildOutAmountExpression(outTag, presetId, powerName, delayName) {
    var isSpring = (presetId === "swingingRotate" || presetId === "rubberBand");
    var isPop = (presetId === "overshootPop" || presetId === "chaoticRandom" || presetId === "shinobiStrike" || presetId === "spinPop" || presetId === "floatPop" || presetId === "scatterExplode" || presetId === "magneticSnap" || presetId === "spiralVortex" || presetId === "zoomDive3D" || presetId === "whipSwing" || presetId === "zoomRandom3D" || presetId === "zoomRotate3D");
    var isRandom = (presetId === "chaoticRandom" || presetId === "cyberCoding" || presetId === "cyberDataGlitch" || presetId === "scatterExplode" || presetId === "neonPulse" || presetId === "datamoshTear" || presetId === "zoomRandom3D");
    var isStep = (presetId === "terminalTyping" || presetId === "cyberCoding" || presetId === "cyberDataGlitch" || presetId === "neonPulse" || presetId === "datamoshTear");
    return [
        "var v = 0;",
        "try {",
        "  var outT = null;",
        "  for (var i = 1; i <= marker.numKeys; i++) {",
        "    if (marker.key(i).comment === '" + outTag + "') { outT = marker.key(i).time; break; }",
        "  }",
        "  if (outT !== null) {",
        "    var power = 100; var delayMs = 35;",
        "    try { power = effect('" + powerName + "')(1); delayMs = effect('" + delayName + "')(1); } catch(err) {}",
        "    var markerDur = Math.max(0.01, thisLayer.outPoint - outT);",
        "    var myDelay = 0; var totalDelay = 0;",
        "    var isStep = " + isStep + ";",
        "    if (" + isRandom + ") {",
        "      seedRandom(textIndex + 999, true);",
        "      totalDelay = markerDur * 0.75;",
        "      myDelay = random(0, totalDelay);",
        "    } else if (isStep) {",
        "      totalDelay = markerDur * 0.95;",
        "      myDelay = (textIndex - 1) * (totalDelay / Math.max(1, textTotal - 1));",
        "    } else {",
        "      totalDelay = (textTotal - 1) * (delayMs / 1000);",
        "      myDelay = (textIndex - 1) * (delayMs / 1000);",
        "    }",
        "    var durOut = Math.max(0.05, markerDur - totalDelay);",
        "    var tOut = time - outT - myDelay;",
        "    if (tOut > 0) {",
        "      var p = Math.min(1, tOut / durOut);",
        "      if (isStep) {",
        "        v = 100;",
        "      } else if (" + isSpring + " || " + isPop + ") {",
        "        var popPower = (power / 100) * 0.35;",
        "        v = (Math.pow(p, 4) - Math.sin(p * Math.PI) * popPower) * 100;",
        "      } else {",
        "        v = (p * p * p) * 100;",
        "      }",
        "    }",
        "  }",
        "} catch(e) { v = 0; }",
        "[v, v, v];"
    ].join("\n");
}

function arkaGraphBuildScatterExplodeExpression(tag, isOutPhase, powerName, delayName) {
    return [
        "var v = " + (isOutPhase ? "0" : "100") + ";",
        "try {",
        "  var power = 100;",
        "  try { power = effect('" + powerName + "')(1); } catch(e) {}",
        "  var tMarker = null;",
        "  for (var i = 1; i <= marker.numKeys; i++) {",
        "    if (marker.key(i).comment === '" + tag + "') { tMarker = marker.key(i).time; break; }",
        "  }",
        "  if (tMarker !== null) {",
        "    var markerDur = Math.max(0.01, " + (isOutPhase ? "thisLayer.outPoint - tMarker" : "tMarker - thisLayer.inPoint") + ");",
        "    seedRandom(textIndex + " + (isOutPhase ? "999" : "0") + ", true);",
        "    var totalDelay = markerDur * 0.75;",
        "    var myDelay = random(0, totalDelay);",
        "    var dur = Math.max(0.05, markerDur - totalDelay);",
        "    var t = time - " + (isOutPhase ? "tMarker" : "thisLayer.inPoint") + " - myDelay;",
        "    if (t >= 0) {",
        "      var p = Math.min(1, t / dur);",
        "      if (" + isOutPhase + ") {",
        "        var popPower = (power / 100) * 0.35;",
        "        v = (Math.pow(p, 4) - Math.sin(p * Math.PI) * popPower) * 100;",
        "      } else {",
        "        var c1 = 1.70158 * (power / 100); var c3 = c1 + 1;",
        "        var pp = p - 1;",
        "        v = 100 - ((1 + c3 * Math.pow(pp, 3) + c1 * Math.pow(pp, 2)) * 100);",
        "      }",
        "    }",
        "  }",
        "  seedRandom(textIndex + " + (isOutPhase ? "777" : "111") + ", true);",
        "  var mult = power / 100;",
        "  var rx = random(-800, 800) * mult;",
        "  var ry = random(-500, 500) * mult;",
        "  var rz = random(-300, 300) * mult;",
        "  [rx * (v / 100), ry * (v / 100), rz * (v / 100)];",
        "} catch(e) { [0, 0, 0]; }"
    ].join("\n");
}

var PRESET_3D_IDS = {
    "zoomRandom3D": true,
    "zoomRotate3D": true,
    "zoomDive3D": true,
    "spiralVortex": true,
    "scatterExplode": true
};

function arkaGraphApplyTextAnimation(presetJSONString) {
    try {
        var preset = JSON.parse(presetJSONString);
        if (!preset) return "ERROR: Invalid text preset.";
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return "ERROR: No active composition.";
        var layer = null;
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            if (comp.selectedLayers[i] instanceof TextLayer) { layer = comp.selectedLayers[i]; break; }
        }
        if (!layer) return "ERROR: Please select a text layer first.";

        var animMode = String(preset.animMode || "both").toLowerCase();
        var animatorData = preset.animator || {};
        var fxName = preset.name || "Custom";
        var inTag = "IN [" + fxName + "]";
        var outTag = "OUT [" + fxName + "]";
        var inPowerName = "AG: IN Pow [" + fxName + "]";
        var inDelayName = "AG: IN Del [" + fxName + "]";
        var outPowerName = "AG: OUT Pow [" + fxName + "]";
        var outDelayName = "AG: OUT Del [" + fxName + "]";
        var is3DPreset = !!PRESET_3D_IDS[preset.id];

        app.beginUndoGroup("ArkaGraph: Apply Pro Text Animation");

        if (is3DPreset && !layer.threeDLayer) {
            layer.threeDLayer = true;
        }

        var textProps = layer.property("ADBE Text Properties");

        var groupAlignX = 0, groupAlignY = -50;
        try {
            var anchor = layer.property("ADBE Anchor Point").value;
            var rect = layer.sourceRectAtTime(comp.time, false);
            groupAlignX = Math.max(-50, Math.min(50, ((anchor[0] - rect.left) / rect.width - 0.5) * 100));
            groupAlignY = Math.max(-50, Math.min(50, ((anchor[1] - rect.top) / rect.height - 0.5) * 100));
        } catch (e) { }

        var moreOpts = arkaGraphGetTextProperty(textProps, ["ADBE Text More Options", "More Options"]);
        if (moreOpts) {
            arkaGraphSetTextProperty(moreOpts, ["ADBE Text Anchor Point Align", "Anchor Point Grouping"], 1);
            arkaGraphSetTextProperty(moreOpts, ["ADBE Text Grouping Alignment", "Grouping Alignment"], [groupAlignX, groupAlignY]);
        }

        var animators = arkaGraphGetTextProperty(textProps, ["ADBE Text Animators", "Animators"]);
        if (!animators) { app.endUndoGroup(); return "ERROR: Text animators group unavailable."; }

        var effectsGroup = layer.property("ADBE Effect Parade");
        var markerProp = layer.property("ADBE Marker") || layer.property("Marker");

        function overwriteSamePreset(phase) {
            var targetName = "[" + fxName + "]";
            if (animators) {
                for (var a = animators.numProperties; a >= 1; a--) {
                    var aName = animators.property(a).name;
                    if (aName.indexOf(targetName) !== -1 && aName.indexOf("(" + phase + ")") !== -1) animators.property(a).remove();
                }
            }
            if (effectsGroup) {
                for (var e = effectsGroup.numProperties; e >= 1; e--) {
                    var eName = effectsGroup.property(e).name;
                    if (eName.indexOf("AG: " + phase) !== -1 && eName.indexOf(targetName) !== -1) effectsGroup.property(e).remove();
                }
            }
            if (markerProp) {
                for (var m = markerProp.numKeys; m >= 1; m--) {
                    var c = markerProp.keyValue(m).comment;
                    if (c && c.indexOf(phase + " " + targetName) === 0) markerProp.removeKey(m);
                }
            }
        }

        if (animMode === "in" || animMode === "both") overwriteSamePreset("IN");
        if (animMode === "out" || animMode === "both") overwriteSamePreset("OUT");

        var span = layer.outPoint - layer.inPoint;
        var safeDur = Math.min(preset.duration || 0.6, span * 0.3);

        function getSafeMarkerTime(targetTime, isOutPhase) {
            if (!markerProp || markerProp.numKeys === 0) return targetTime;
            var safeTime = targetTime;
            var offset = isOutPhase ? -0.05 : 0.05;
            var maxTries = 30;
            while (maxTries-- > 0) {
                var collision = false;
                for (var i = 1; i <= markerProp.numKeys; i++) {
                    if (Math.abs(markerProp.keyValue(i).time - safeTime) < 0.04) {
                        safeTime += offset;
                        collision = true;
                        break;
                    }
                }
                if (!collision) break;
            }
            return safeTime;
        }

        function buildSubAnimator(phaseSuffix, isOutPhase) {
            var animator = animators.addProperty("ADBE Text Animator");
            animator.name = "AG: " + fxName + " (" + phaseSuffix + ")";
            var animatorProps = arkaGraphGetTextProperty(animator, ["ADBE Text Animator Properties", "Properties"]);
            var selectors = arkaGraphGetTextProperty(animator, ["ADBE Text Selectors", "Selectors"]);

            if (animatorData.position instanceof Array && preset.id !== "scatterExplode") {
                var targetPos = [animatorData.position[0], animatorData.position[1], animatorData.position[2] || 0];
                if (isOutPhase) {
                    if (preset.id === "gravityCrush") {
                        targetPos[1] = -targetPos[1];
                    }
                    if (preset.id === "shinobiStrike" || preset.id === "whipSwing" || preset.id === "datamoshTear") {
                        targetPos[0] = -targetPos[0];
                        targetPos[1] = -targetPos[1];
                    }
                }
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Position 3D", "ADBE Text Position"], targetPos);
            }

            if (animatorData.scale instanceof Array) {
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Scale 3D", "ADBE Text Scale"], animatorData.scale);
            } else if (preset.id === "scatterExplode") {
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Scale 3D", "ADBE Text Scale"], [0, 0, 100]);
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
                var rotVal = Number(animatorData.rotation);
                if (isOutPhase && (preset.id === "chaoticRandom" || preset.id === "scatterExplode" || preset.id === "spiralVortex" || preset.id === "whipSwing" || preset.id === "zoomRotate3D" || preset.id === "swingingRotate")) rotVal = -rotVal;
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Rotation", "Rotation"], rotVal);
            }

            if (typeof animatorData.rotationX !== "undefined") {
                var rotX = Number(animatorData.rotationX);
                if (isOutPhase && (preset.id === "zoomRotate3D" || preset.id === "zoomDive3D")) rotX = -rotX;
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Rotation X", "Rotation X"], rotX);
            }

            if (typeof animatorData.rotationY !== "undefined") {
                var rotY = Number(animatorData.rotationY);
                if (isOutPhase && (preset.id === "zoomRotate3D")) rotY = -rotY;
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Rotation Y", "Rotation Y"], rotY);
            }

            if (typeof animatorData.orientation !== "undefined" && is3DPreset) {
                var ori = animatorData.orientation;
                var oriVal = [Number(ori[0] || 0), Number(ori[1] || 0), Number(ori[2] || 0)];
                if (isOutPhase) {
                    oriVal[0] = -oriVal[0];
                    oriVal[1] = -oriVal[1];
                    oriVal[2] = -oriVal[2];
                }
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Orientation", "Orientation"], oriVal);
            }

            if (is3DPreset && preset.id === "zoomRandom3D" && typeof animatorData.positionZ !== "undefined") {
                var zVal = Number(animatorData.positionZ);
                if (isOutPhase) zVal = -zVal;
                arkaGraphAddTextAnimatorProperty(animatorProps, ["ADBE Text Position 3D", "ADBE Text Position"], [0, 0, zVal]);
            }

            var selector = selectors.addProperty("ADBE Text Expressible Selector");
            selector.name = "ArkaGraph Engine";
            var amountProp = arkaGraphGetTextProperty(selector, ["ADBE Text Expressible Amount", "Amount"]);
            if (!amountProp) { try { amountProp = selector.property(2); } catch (err) { } }
            return amountProp;
        }

        function addScatterPositionAnimator(phase, isOutPhase, powerName, delayName, tag) {
            var animPos = animators.addProperty("ADBE Text Animator");
            animPos.name = "AG: " + fxName + " (" + phase + ") [Scatter]";
            var pProps = arkaGraphGetTextProperty(animPos, ["ADBE Text Animator Properties", "Properties"]);
            arkaGraphAddTextAnimatorProperty(pProps, ["ADBE Text Position 3D", "ADBE Text Position"], [100, 100, 100]);
            var pSels = arkaGraphGetTextProperty(animPos, ["ADBE Text Selectors", "Selectors"]);
            var pSel = pSels.addProperty("ADBE Text Expressible Selector");
            pSel.name = "ArkaGraph Scatter Engine";
            var pAmt = arkaGraphGetTextProperty(pSel, ["ADBE Text Expressible Amount", "Amount"]);
            if (!pAmt) { try { pAmt = pSel.property(2); } catch (e) { } }
            if (pAmt) pAmt.expression = arkaGraphBuildScatterExplodeExpression(tag, isOutPhase, powerName, delayName);
        }

        if (animMode === "in" || animMode === "both") {
            if (effectsGroup) {
                var inPow = effectsGroup.addProperty("ADBE Slider Control");
                inPow.name = inPowerName;
                inPow.property("Slider").setValue(100);
                var inDel = effectsGroup.addProperty("ADBE Slider Control");
                inDel.name = inDelayName;
                inDel.property("Slider").setValue(35);
            }
            var inMarkerTime = getSafeMarkerTime(layer.inPoint + safeDur, false);
            arkaGraphAddTextMarker(markerProp, inMarkerTime, inTag);
            if (preset.id === "scatterExplode") addScatterPositionAnimator("IN", false, inPowerName, inDelayName, inTag);
            var inAmountProp = buildSubAnimator("IN", false);
            if (inAmountProp && inAmountProp.canSetExpression) {
                inAmountProp.expression = arkaGraphBuildInAmountExpression(inTag, preset.id, inPowerName, inDelayName);
            }
        }

        if (animMode === "out" || animMode === "both") {
            if (effectsGroup) {
                var outPow = effectsGroup.addProperty("ADBE Slider Control");
                outPow.name = outPowerName;
                outPow.property("Slider").setValue(100);
                var outDel = effectsGroup.addProperty("ADBE Slider Control");
                outDel.name = outDelayName;
                outDel.property("Slider").setValue(35);
            }
            var outMarkerTime = getSafeMarkerTime(layer.outPoint - safeDur, true);
            arkaGraphAddTextMarker(markerProp, outMarkerTime, outTag);
            if (preset.id === "scatterExplode") addScatterPositionAnimator("OUT", true, outPowerName, outDelayName, outTag);
            var outAmountProp = buildSubAnimator("OUT", true);
            if (outAmountProp && outAmountProp.canSetExpression) {
                outAmountProp.expression = arkaGraphBuildOutAmountExpression(outTag, preset.id, outPowerName, outDelayName);
            }
        }

        app.endUndoGroup();
        return "OK: Text animation applied.";
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) { }
        return "ERROR: " + e.toString();
    }
}

function arkaGraphGetFPS() {
    try { return String(app.project.activeItem.frameRate); } catch(e) { return "24"; }
}

function getSelectedKeyframeProperties(comp) {
    var result = [];
    var layers = comp.selectedLayers;
    if (!layers || layers.length === 0) return result;
    for (var l = 0; l < layers.length; l++) collectSelectedProps(layers[l], result);
    return result;
}

function collectSelectedProps(group, result) {
    for (var i = 1; i <= group.numProperties; i++) {
        var prop = group.property(i);
        if (!prop) continue;
        if (prop.numProperties > 0) {
            collectSelectedProps(prop, result);
        } else if (prop.isTimeVarying && prop.selected && prop.numKeys >= 2) {
            result.push(prop);
        }
    }
}

function arkaGraphClampBakeCount(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
}

function arkaGraphGetAdaptiveBakeCount(duration, frameRate, requestedSteps, segmentCount) {
    var safeRequested = arkaGraphClampBakeCount(Math.round(requestedSteps || 30), 6, 120);
    var durationFrames = Math.max(2, Math.round(duration * frameRate) + 1);
    var segmentBudget = Math.max(6, Math.floor(240 / Math.max(1, segmentCount)));
    return Math.max(2, Math.min(safeRequested, durationFrames, 48, segmentBudget));
}

function arkaGraphBakeKeys(samplesJSON, optionsJSON) {
    try {
        var samples = JSON.parse(samplesJSON);
        var options = JSON.parse(optionsJSON) || {};
        if (typeof options === "number") options = { requestedSteps: options };
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return "ERROR: No active composition.";
        var selectedProps = getSelectedKeyframeProperties(comp);
        if (selectedProps.length === 0) return "ERROR: No properties selected.";
        app.beginUndoGroup("ArkaGraph: Bake Keys");
        var totalInsertedKeys = 0;

        for (var p = 0; p < selectedProps.length; p++) {
            var prop = selectedProps[p];
            if (prop.numKeys < 2) continue;

            var selKeys = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                if (prop.keySelected(k)) selKeys.push(k);
            }
            if (selKeys.length === 0) {
                for (var k = 1; k <= prop.numKeys; k++) selKeys.push(k);
            }

            var segments = [];
            for (var i = 0; i < selKeys.length - 1; i++) {
                segments.push({
                    startTime: prop.keyTime(selKeys[i]),
                    endTime: prop.keyTime(selKeys[i + 1]),
                    startVal: prop.keyValue(selKeys[i]),
                    endVal: prop.keyValue(selKeys[i + 1])
                });
            }

            for (var i = selKeys.length - 2; i >= 0; i--) {
                var tA = prop.keyTime(selKeys[i]);
                var tB = prop.keyTime(selKeys[i + 1]);
                for (var k = prop.numKeys; k >= 1; k--) {
                    var kt = prop.keyTime(k);
                    if (kt > tA + 0.0001 && kt < tB - 0.0001) prop.removeKey(k);
                }
            }

            for (var si = 0; si < segments.length; si++) {
                var seg = segments[si];
                var duration = seg.endTime - seg.startTime;
                var segmentSteps = arkaGraphGetAdaptiveBakeCount(duration, comp.frameRate, options.requestedSteps, segments.length);

                for (var i = 1; i < segmentSteps - 1; i++) {
                    var s = samples[Math.min(Math.round(i / (segmentSteps - 1) * (samples.length - 1)), samples.length - 1)];
                    var time = seg.startTime + s.t * duration;
                    if (time <= seg.startTime + 0.0001 || time >= seg.endTime - 0.0001) continue;
                    var val;
                    if (seg.startVal instanceof Array) {
                        val = [];
                        for (var j = 0; j < seg.startVal.length; j++) val.push(seg.startVal[j] + (seg.endVal[j] - seg.startVal[j]) * s.v);
                    } else {
                        val = seg.startVal + (seg.endVal - seg.startVal) * s.v;
                    }
                    prop.setValueAtTime(time, val);
                    totalInsertedKeys++;
                }

                try { prop.setInterpolationTypeAtKey(prop.nearestKeyIndex(seg.startTime), KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR); } catch (e) { }
                try { prop.setInterpolationTypeAtKey(prop.nearestKeyIndex(seg.endTime), KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR); } catch (e) { }
            }
        }

        app.endUndoGroup();
        return "OK: Smart bake applied (" + totalInsertedKeys + " generated keys)";
    } catch(e) { return "ERROR: " + e.toString(); }
}

if (typeof JSON !== "object") { JSON = {}; }
if (typeof JSON.parse !== "function") {
    JSON.parse = function(str) {
        if (!str || str === "") return null;
        try { return eval("(" + str + ")"); } catch(e) { return null; }
    };
}
if (typeof JSON.stringify !== "function") {
    JSON.stringify = function(obj) {
        if (obj === null) return "null";
        if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
        if (typeof obj === "string") return '"' + obj.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
        if (obj instanceof Array) {
            var items = [];
            for (var i = 0; i < obj.length; i++) items.push(JSON.stringify(obj[i]));
            return "[" + items.join(",") + "]";
        }
        if (typeof obj === "object") {
            var pairs = [];
            for (var k in obj) { if (obj.hasOwnProperty(k)) pairs.push('"' + k + '":' + JSON.stringify(obj[k])); }
            return "{" + pairs.join(",") + "}";
        }
        return "null";
    };
}

function arkaGraphClearTextAnimations() {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return "ERROR: No active composition.";
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) return "ERROR: Please select a layer.";
        app.beginUndoGroup("ArkaGraph: Clear Animations");
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (!(layer instanceof TextLayer)) continue;
            var textProps = layer.property("ADBE Text Properties");
            if (textProps) {
                var animators = textProps.property("ADBE Text Animators");
                if (animators) {
                    for (var j = animators.numProperties; j >= 1; j--) {
                        if (animators.property(j).name.indexOf("AG:") === 0) animators.property(j).remove();
                    }
                }
            }
            var effects = layer.property("ADBE Effect Parade");
            if (effects) {
                for (var k = effects.numProperties; k >= 1; k--) {
                    var en = effects.property(k).name;
                    if (en.indexOf("AG: IN") === 0 || en.indexOf("AG: OUT") === 0 || en.indexOf("AG: Bounce") === 0 || en.indexOf("AG: Delay") === 0) {
                        effects.property(k).remove();
                    }
                }
            }
            var markers = layer.property("ADBE Marker") || layer.property("Marker");
            if (markers) {
                for (var m = markers.numKeys; m >= 1; m--) {
                    var c = markers.keyValue(m).comment;
                    if (c && (c.indexOf("IN") === 0 || c.indexOf("OUT") === 0)) markers.removeKey(m);
                }
            }
        }
        app.endUndoGroup();
        return "OK: Animations cleared.";
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) { }
        return "ERROR: " + e.toString();
    }
}