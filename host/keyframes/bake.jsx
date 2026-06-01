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
    var undoStarted = false;

    try {
        var samples = JSON.parse(samplesJSON);
        var options = JSON.parse(optionsJSON) || {};
        var comp = arkaGraphGetActiveComposition();
        var selectedProps;
        var totalInsertedKeys;
        var propIndex;
        var prop;
        var selectedKeys;
        var keyIndex;
        var segmentIndex;
        var segments;
        var timeStart;
        var timeEnd;
        var keyTime;
        var segment;
        var duration;
        var segmentSteps;
        var sampleIndex;
        var sample;
        var time;
        var value;
        var valueIndex;

        if (typeof options === "number") options = { requestedSteps: options };
        if (!comp) return "ERROR: No active composition.";

        selectedProps = arkaGraphGetSelectedKeyframeProperties(comp);
        if (selectedProps.length === 0) return "ERROR: No properties selected.";

        app.beginUndoGroup("ArkaGraph: Bake Keys");
        undoStarted = true;
        totalInsertedKeys = 0;

        for (propIndex = 0; propIndex < selectedProps.length; propIndex++) {
            prop = selectedProps[propIndex];
            if (prop.numKeys < 2) continue;

            selectedKeys = [];
            for (keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                if (prop.keySelected(keyIndex)) selectedKeys.push(keyIndex);
            }
            if (selectedKeys.length === 0) {
                for (keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                    selectedKeys.push(keyIndex);
                }
            }

            segments = [];
            for (segmentIndex = 0; segmentIndex < selectedKeys.length - 1; segmentIndex++) {
                segments.push({
                    startTime: prop.keyTime(selectedKeys[segmentIndex]),
                    endTime: prop.keyTime(selectedKeys[segmentIndex + 1]),
                    startVal: prop.keyValue(selectedKeys[segmentIndex]),
                    endVal: prop.keyValue(selectedKeys[segmentIndex + 1])
                });
            }

            for (segmentIndex = selectedKeys.length - 2; segmentIndex >= 0; segmentIndex--) {
                timeStart = prop.keyTime(selectedKeys[segmentIndex]);
                timeEnd = prop.keyTime(selectedKeys[segmentIndex + 1]);
                for (keyIndex = prop.numKeys; keyIndex >= 1; keyIndex--) {
                    keyTime = prop.keyTime(keyIndex);
                    if (keyTime > timeStart + 0.0001 && keyTime < timeEnd - 0.0001) {
                        prop.removeKey(keyIndex);
                    }
                }
            }

            for (segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
                segment = segments[segmentIndex];
                duration = segment.endTime - segment.startTime;
                segmentSteps = arkaGraphGetAdaptiveBakeCount(duration, comp.frameRate, options.requestedSteps, segments.length);

                for (sampleIndex = 1; sampleIndex < segmentSteps - 1; sampleIndex++) {
                    sample = samples[Math.min(Math.round(sampleIndex / (segmentSteps - 1) * (samples.length - 1)), samples.length - 1)];
                    time = segment.startTime + sample.t * duration;
                    if (time <= segment.startTime + 0.0001 || time >= segment.endTime - 0.0001) continue;

                    if (segment.startVal instanceof Array) {
                        value = [];
                        for (valueIndex = 0; valueIndex < segment.startVal.length; valueIndex++) {
                            value.push(segment.startVal[valueIndex] + (segment.endVal[valueIndex] - segment.startVal[valueIndex]) * sample.v);
                        }
                    } else {
                        value = segment.startVal + (segment.endVal - segment.startVal) * sample.v;
                    }

                    prop.setValueAtTime(time, value);
                    totalInsertedKeys++;
                }

                try {
                    prop.setInterpolationTypeAtKey(prop.nearestKeyIndex(segment.startTime), KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
                } catch (startInterpolationError) {
                }

                try {
                    prop.setInterpolationTypeAtKey(prop.nearestKeyIndex(segment.endTime), KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
                } catch (endInterpolationError) {
                }
            }
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK: Smart bake applied (" + totalInsertedKeys + " generated keys)";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}
