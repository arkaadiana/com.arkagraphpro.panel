(function () {
    'use strict';
    const AG = window.AG;

    function getCurrentSnapshot() {
        return { engine: AG.state.engine, params: AG.clone(AG.state.params[AG.state.engine]) };
    }

    function setEngine(engineKey) {
        AG.state.engine = engineKey;
        AG.scaleY = 1.0;
        document.querySelectorAll('.eng-tab').forEach(function (tab) {
            tab.classList.toggle('active', tab.dataset.engine === engineKey);
        });
        document.querySelectorAll('.engine-params').forEach(function (panel) {
            panel.classList.toggle('active', panel.id === 'params-' + engineKey);
        });
        AG.dom.presetEngineLabel.textContent = 'MODULE: ' + engineKey.toUpperCase();
        AG.syncCurrentInputs();
        AG.draw();
    }

    function applyPresetState(preset) {
        const defaults = AG.clone(window.ArkaGraphEngine.get(preset.engine).defaults);
        const merged = Object.assign(defaults, AG.clone(preset.params || {}));
        if (preset.engine === 'bezier' && !merged.mode) merged.mode = 'value';
        AG.state.params[preset.engine] = merged;
        setEngine(preset.engine);
        AG.syncCurrentInputs();
        AG.draw();
    }

    function resetCurrentEngine() {
        const currentBezierMode = AG.state.engine === 'bezier' && AG.state.params.bezier
            ? AG.state.params.bezier.mode
            : null;
        AG.state.params[AG.state.engine] = AG.clone(window.ArkaGraphEngine.get(AG.state.engine).defaults);
        if (AG.state.engine === 'bezier') {
            AG.state.params.bezier.mode = currentBezierMode || AG.state.params.bezier.mode || 'value';
        }
        AG.scaleY = 1.0;
        AG.syncCurrentInputs();
        AG.state.referenceCurve = null;
        AG.notifyPresetDirty();
        AG.draw();
        AG.setStatus('GRAPH RESET ✓', 'ok');
    }

    AG.getCurrentSnapshot = getCurrentSnapshot;
    AG.setEngine = setEngine;
    AG.applyPresetState = applyPresetState;
    AG.resetCurrentEngine = resetCurrentEngine;
})();
