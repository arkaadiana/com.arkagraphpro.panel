function arkaGraphIsSpringTextPreset(presetId) {
    return presetId === "swingingRotate" || presetId === "rubberBand";
}

function arkaGraphIsPopTextPreset(presetId) {
    return presetId === "overshootPop" || presetId === "chaoticRandom" || presetId === "shinobiStrike" || presetId === "spinPop" || presetId === "floatPop" || presetId === "scatterExplode" || presetId === "magneticSnap" || presetId === "spiralVortex" || presetId === "zoomDive3D" || presetId === "whipSwing" || presetId === "zoomRandom3D" || presetId === "zoomRotate3D";
}

function arkaGraphIsRandomTextPreset(presetId) {
    return presetId === "chaoticRandom" || presetId === "cyberCoding" || presetId === "cyberDataGlitch" || presetId === "scatterExplode" || presetId === "neonPulse" || presetId === "datamoshTear" || presetId === "zoomRandom3D";
}

function arkaGraphIsStepTextPreset(presetId) {
    return presetId === "terminalTyping" || presetId === "cyberCoding" || presetId === "cyberDataGlitch" || presetId === "neonPulse" || presetId === "datamoshTear";
}

function arkaGraphBuildInAmountExpression(inTag, presetId, powerName, delayName) {
    var isSpring = arkaGraphIsSpringTextPreset(presetId);
    var isPop = arkaGraphIsPopTextPreset(presetId);
    var isRandom = arkaGraphIsRandomTextPreset(presetId);
    var isStep = arkaGraphIsStepTextPreset(presetId);

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
    var isSpring = arkaGraphIsSpringTextPreset(presetId);
    var isPop = arkaGraphIsPopTextPreset(presetId);
    var isRandom = arkaGraphIsRandomTextPreset(presetId);
    var isStep = arkaGraphIsStepTextPreset(presetId);

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
