function arkaGraphClearTextAnimations() {
    var undoStarted = false;

    try {
        var comp = arkaGraphGetActiveComposition();
        var selectedLayers;
        var layerIndex;
        var layer;
        var textProps;
        var animators;
        var animatorIndex;
        var effects;
        var effectIndex;
        var effectName;
        var markers;
        var markerIndex;
        var markerComment;

        if (!comp) return "ERROR: No active composition.";

        selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) return "ERROR: Please select a layer.";

        app.beginUndoGroup("ArkaGraph: Clear Animations");
        undoStarted = true;

        for (layerIndex = 0; layerIndex < selectedLayers.length; layerIndex++) {
            layer = selectedLayers[layerIndex];
            if (!(layer instanceof TextLayer)) continue;

            textProps = layer.property("ADBE Text Properties");
            if (textProps) {
                animators = textProps.property("ADBE Text Animators");
                if (animators) {
                    for (animatorIndex = animators.numProperties; animatorIndex >= 1; animatorIndex--) {
                        if (animators.property(animatorIndex).name.indexOf("AG:") === 0) {
                            animators.property(animatorIndex).remove();
                        }
                    }
                }
            }

            effects = layer.property("ADBE Effect Parade");
            if (effects) {
                for (effectIndex = effects.numProperties; effectIndex >= 1; effectIndex--) {
                    effectName = effects.property(effectIndex).name;
                    if (effectName.indexOf("AG: IN") === 0 || effectName.indexOf("AG: OUT") === 0 || effectName.indexOf("AG: Bounce") === 0 || effectName.indexOf("AG: Delay") === 0) {
                        effects.property(effectIndex).remove();
                    }
                }
            }

            markers = layer.property("ADBE Marker") || layer.property("Marker");
            if (markers) {
                for (markerIndex = markers.numKeys; markerIndex >= 1; markerIndex--) {
                    markerComment = markers.keyValue(markerIndex).comment;
                    if (markerComment && (markerComment.indexOf("IN") === 0 || markerComment.indexOf("OUT") === 0)) {
                        markers.removeKey(markerIndex);
                    }
                }
            }
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK: Animations cleared.";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}
