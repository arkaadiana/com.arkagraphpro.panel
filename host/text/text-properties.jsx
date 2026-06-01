function arkaGraphGetTextProperty(group, names) {
    var nameIndex;
    var propertyIndex;
    var prop;
    var matchIndex;
    var direct;

    if (!group) return null;

    for (nameIndex = 0; nameIndex < names.length; nameIndex++) {
        try {
            direct = group.property(names[nameIndex]);
            if (direct) return direct;
        } catch (directError) {
        }
    }

    try {
        for (propertyIndex = 1; propertyIndex <= group.numProperties; propertyIndex++) {
            prop = group.property(propertyIndex);
            if (!prop) continue;

            for (matchIndex = 0; matchIndex < names.length; matchIndex++) {
                if (prop.matchName === names[matchIndex] || prop.name === names[matchIndex]) return prop;
            }
        }
    } catch (searchError) {
    }

    return null;
}

function arkaGraphSetTextProperty(group, names, value) {
    var prop = arkaGraphGetTextProperty(group, names);
    if (!prop) return false;

    try {
        prop.setValue(value);
        return true;
    } catch (e) {
        return false;
    }
}

function arkaGraphAddTextAnimatorProperty(group, names, value) {
    var prop = null;
    var nameIndex;

    if (!group) return null;

    for (nameIndex = 0; nameIndex < names.length; nameIndex++) {
        try {
            prop = group.addProperty(names[nameIndex]);
            if (prop) break;
        } catch (addError) {
        }
    }

    if (prop) {
        try {
            prop.setValue(value);
        } catch (setError) {
            try {
                if (value instanceof Array && value.length === 3) prop.setValue([value[0], value[1]]);
            } catch (fallbackError) {
            }
        }
    }

    return prop;
}

function arkaGraphAddTextMarker(markerProp, timeValue, label) {
    var markerValue;

    if (!markerProp) return;

    markerValue = new MarkerValue(label);
    markerValue.comment = label;
    markerValue.cuePointName = "COM_ARKAGRAPH_MARKER";
    markerValue.eventCuePoint = false;
    markerProp.setValueAtTime(timeValue, markerValue);
}
