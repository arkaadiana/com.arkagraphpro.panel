(function () {
    'use strict';
    const AG = window.AG;
    AG.state = {
        engine: 'bezier',
        params: window.ArkaGraphEngine.createDefaultParams(),
        bakeSteps: 30,
        loop: { enabled: false, infinite: false, inCount: 0, outCount: 0 },
        activeView: 'graph',
        activeTextSubView: 'animation',
        textAnimMode: 'both',
        selectedTextPresetId: 'slideUpFade',
        selectedTextEffectId: 'elasticTwist',
        dragging: null,
        dragStartV: undefined,
        guidelineY: undefined,
        referenceCurve: null
    };
    AG.scaleY = 1.0;
    AG.statusTimer = null;
    AG.presetDialog = null;
    AG.presetManager = null;
    AG.settingsPanel = null;
    AG.currentSettings = window.ArkaGraphSettingsStorage.load();
    try {
        AG.csInterface = new CSInterface();
    } catch (e) {
        AG.csInterface = null;
    }
})();