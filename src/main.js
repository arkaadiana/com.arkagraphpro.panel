(function () {
    'use strict';
    const AG = window.AG;

    function init() {
        AG.initSecurity();
        
        AG.initSettingsFeatures();
        AG.initAiManager();
        AG.bindCanvasEvents();
        AG.bindSliderEvents();
        AG.bindUiEvents();
        AG.initPresetFeatures();
        AG.setSliderValue('bake-steps', AG.state.bakeSteps);
        AG.syncLoopInputs();
        AG.refreshApplyButton();
        AG.syncCurrentInputs();
        AG.resizeCanvas();
        AG.refreshFps();
        window.setInterval(AG.refreshFps, 5000);
        if (typeof ResizeObserver === 'function') {
            new ResizeObserver(AG.resizeCanvas).observe(AG.dom.canvasContainer);
        } else {
            window.addEventListener('resize', AG.resizeCanvas);
        }
    }

    window.addEventListener('load', init);
})();
