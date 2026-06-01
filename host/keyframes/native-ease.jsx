function arkaGraphApplyNativeEase(x1, y1, x2, y2) {
    var undoStarted = false;

    try {
        var comp = app.project.activeItem;
        var props;
        var influenceOut;
        var influenceIn;
        var effectiveX1;
        var effectiveX2;
        var propIndex;
        var prop;
        var selectedKeys;
        var keyIndex;
        var selectedKeyIndex;
        var valueStart;
        var valueEnd;
        var duration;
        var isSpatial;
        var dimension;
        var easeIn;
        var easeOut;
        var distanceSum;
        var spatialIndex;
        var averageSpeed;
        var dimensionIndex;
        var startComponent;
        var endComponent;

        if (!comp) return "ERROR: No active composition.";

        props = arkaGraphGetSelectedKeyframeProperties(comp);
        if (props.length === 0) return "ERROR: No keys selected.";

        app.beginUndoGroup("ArkaGraph: Apply Ease");
        undoStarted = true;

        influenceOut = Math.max(0.1, Math.min(100, x1 * 100));
        influenceIn = Math.max(0.1, Math.min(100, (1 - x2) * 100));
        effectiveX1 = Math.max(0.001, x1);
        effectiveX2 = Math.max(0.001, 1 - x2);

        for (propIndex = 0; propIndex < props.length; propIndex++) {
            prop = props[propIndex];
            selectedKeys = [];

            for (keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                if (prop.keySelected(keyIndex)) selectedKeys.push(keyIndex);
            }

            for (keyIndex = 0; keyIndex < selectedKeys.length; keyIndex++) {
                selectedKeyIndex = selectedKeys[keyIndex];
                if (selectedKeyIndex >= prop.numKeys) continue;

                valueStart = prop.keyValue(selectedKeyIndex);
                valueEnd = prop.keyValue(selectedKeyIndex + 1);
                duration = prop.keyTime(selectedKeyIndex + 1) - prop.keyTime(selectedKeyIndex);
                isSpatial = prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
                dimension = 1;

                if (!isSpatial) {
                    if (prop.propertyValueType === PropertyValueType.TwoD) dimension = 2;
                    if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.COLOR) dimension = 3;
                    if (prop.propertyValueType === PropertyValueType.FourD) dimension = 4;
                }

                easeIn = [];
                easeOut = [];

                if (isSpatial) {
                    distanceSum = 0;
                    for (spatialIndex = 0; spatialIndex < valueStart.length; spatialIndex++) {
                        distanceSum += Math.pow(valueEnd[spatialIndex] - valueStart[spatialIndex], 2);
                    }
                    averageSpeed = duration === 0 ? 0 : Math.sqrt(distanceSum) / duration;
                    easeIn.push(new KeyframeEase(((1 - y2) / effectiveX2) * averageSpeed, influenceIn));
                    easeOut.push(new KeyframeEase((y1 / effectiveX1) * averageSpeed, influenceOut));
                } else {
                    for (dimensionIndex = 0; dimensionIndex < dimension; dimensionIndex++) {
                        startComponent = valueStart instanceof Array ? valueStart[dimensionIndex] : valueStart;
                        endComponent = valueEnd instanceof Array ? valueEnd[dimensionIndex] : valueEnd;
                        averageSpeed = duration === 0 ? 0 : (endComponent - startComponent) / duration;
                        easeIn.push(new KeyframeEase(((1 - y2) / effectiveX2) * averageSpeed, influenceIn));
                        easeOut.push(new KeyframeEase((y1 / effectiveX1) * averageSpeed, influenceOut));
                    }
                }

                prop.setTemporalEaseAtKey(selectedKeyIndex, prop.keyInTemporalEase(selectedKeyIndex), easeOut);
                prop.setTemporalEaseAtKey(selectedKeyIndex + 1, easeIn, prop.keyOutTemporalEase(selectedKeyIndex + 1));
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

function arkaGraphSyncFromAE() {
    try {
        var comp = app.project.activeItem;
        var props;
        var prop;
        var selectedKeys;
        var keyIndex;
        var firstKey;
        var valueStart;
        var valueEnd;
        var duration;
        var valueDelta;
        var distanceSum;
        var spatialIndex;
        var averageSpeed;
        var easeOut;
        var easeIn;
        var x1;
        var x2;
        var y1;
        var y2;

        if (!comp) return null;

        props = arkaGraphGetSelectedKeyframeProperties(comp);
        if (props.length === 0) return null;

        prop = props[0];
        selectedKeys = [];

        for (keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
            if (prop.keySelected(keyIndex)) selectedKeys.push(keyIndex);
        }

        if (selectedKeys.length === 0) return null;

        firstKey = selectedKeys[0];
        if (firstKey >= prop.numKeys && prop.numKeys > 1) firstKey = firstKey - 1;

        valueStart = prop.keyValue(firstKey);
        valueEnd = prop.keyValue(firstKey + 1);
        duration = comp.time - prop.keyTime(firstKey);
        valueDelta = 0;

        if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
            distanceSum = 0;
            for (spatialIndex = 0; spatialIndex < valueStart.length; spatialIndex++) {
                distanceSum += Math.pow(valueEnd[spatialIndex] - valueStart[spatialIndex], 2);
            }
            valueDelta = Math.sqrt(distanceSum);
        } else {
            valueDelta = (valueEnd instanceof Array ? valueEnd[0] : valueEnd) - (valueStart instanceof Array ? valueStart[0] : valueStart);
        }

        averageSpeed = duration === 0 ? 0 : valueDelta / duration;
        easeOut = prop.keyOutTemporalEase(firstKey)[0];
        easeIn = prop.keyInTemporalEase(firstKey + 1)[0];
        x1 = easeOut.influence / 100;
        x2 = 1 - easeIn.influence / 100;

        if (Math.abs(averageSpeed) > 0.0001) {
            y1 = easeOut.speed / averageSpeed * x1;
            y2 = 1 - easeIn.speed / averageSpeed * (1 - x2);
        } else {
            y1 = 0;
            y2 = 1;
        }

        y1 = Math.max(-5, Math.min(5, y1));
        y2 = Math.max(-5, Math.min(5, y2));
        if (isNaN(y1) || !isFinite(y1)) y1 = x1;
        if (isNaN(y2) || !isFinite(y2)) y2 = x2;

        return JSON.stringify({ x1: x1, y1: y1, x2: x2, y2: y2 });
    } catch (e) {
        return "ERROR: " + e.toString();
    }
}
