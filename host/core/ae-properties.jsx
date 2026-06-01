function arkaGraphGetSelectedKeyframeProperties(comp) {
    var result = [];
    var layers = comp.selectedLayers;
    var layerIndex;

    if (!layers || layers.length === 0) return result;

    for (layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        arkaGraphCollectSelectedProps(layers[layerIndex], result);
    }

    return result;
}

function arkaGraphCollectSelectedProps(group, result) {
    var propertyIndex;
    var prop;

    for (propertyIndex = 1; propertyIndex <= group.numProperties; propertyIndex++) {
        prop = group.property(propertyIndex);
        if (!prop) continue;

        if (prop.numProperties > 0) {
            arkaGraphCollectSelectedProps(prop, result);
        } else if (prop.isTimeVarying && prop.selected && prop.numKeys >= 2) {
            result.push(prop);
        }
    }
}

function getSelectedKeyframeProperties(comp) {
    return arkaGraphGetSelectedKeyframeProperties(comp);
}

function collectSelectedProps(group, result) {
    arkaGraphCollectSelectedProps(group, result);
}
