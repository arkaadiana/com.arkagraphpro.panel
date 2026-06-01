function arkaGraphApplyExpression(expressionCode) {
    var undoStarted = false;

    try {
        var comp = arkaGraphGetActiveComposition();
        var selectedProps;
        var propIndex;

        if (!comp) return "ERROR: No active composition.";

        selectedProps = arkaGraphGetSelectedKeyframeProperties(comp);
        if (selectedProps.length === 0) return "ERROR: No properties selected.";

        app.beginUndoGroup("ArkaGraph: Apply Expression");
        undoStarted = true;

        for (propIndex = 0; propIndex < selectedProps.length; propIndex++) {
            try {
                selectedProps[propIndex].expression = expressionCode;
            } catch (ignoredError) {
            }
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK: Expression applied.";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}

function arkaGraphClearExpression() {
    var undoStarted = false;

    try {
        var comp = arkaGraphGetActiveComposition();
        var selectedProps;
        var propIndex;

        if (!comp) return "ERROR: No active composition.";

        selectedProps = arkaGraphGetSelectedKeyframeProperties(comp);

        app.beginUndoGroup("ArkaGraph: Clear Expression");
        undoStarted = true;

        for (propIndex = 0; propIndex < selectedProps.length; propIndex++) {
            selectedProps[propIndex].expression = "";
        }

        app.endUndoGroup();
        undoStarted = false;
        return "OK";
    } catch (e) {
        arkaGraphCloseUndoGroup(undoStarted);
        return "ERROR: " + e.toString();
    }
}
