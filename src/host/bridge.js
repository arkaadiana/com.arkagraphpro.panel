(function () {
    'use strict';
    const AG = window.AG;

    function evalHostScript(methodName) {
        const args = Array.prototype.slice.call(arguments, 1);
        return new Promise(function (resolve) {
            if (!AG.csInterface) { resolve('PREVIEW_MODE'); return; }
            const call = methodName + '(' + args.map(function (a) { return JSON.stringify(a); }).join(',') + ')';
            AG.csInterface.evalScript(call, resolve);
        });
    }

    /**
     * Smart Direction Transformer
     * Memastikan payload yang dikirim ke After Effects sinkron dengan logic CSS Preview.
     * Mampu melakukan swap axis untuk preset diagonal (misal X dominant ke Y dominant).
     */
    function applyDirectionToPayload(payload, direction) {
        if (!direction || !payload.animator) return payload;

        const anim = payload.animator;
        // Hanya proses jika position berbentuk Array
        if (!Array.isArray(anim.position)) return payload;

        const [ox, oy, oz] = anim.position;
        const defaultDir = payload.defaultDirection || 'up';

        // 1. Ekstrak Primary & Secondary Magnitude berdasarkan natural axis preset-nya
        let primaryMag = 0;
        let secondaryMag = 0;
        const isDefaultVertical = (defaultDir === 'up' || defaultDir === 'down');

        if (isDefaultVertical) {
            primaryMag = Math.abs(oy);
            secondaryMag = ox; // X adalah secondary / cross-axis
        } else {
            primaryMag = Math.abs(ox);
            secondaryMag = oy; // Y adalah secondary / cross-axis
        }

        // Fallback jika tidak sengaja 0
        if (primaryMag === 0) primaryMag = isDefaultVertical ? 85 : 150;

        // 2. Map ke Target Direction
        let newX = 0, newY = 0;
        const isTargetVertical = (direction === 'up' || direction === 'down');

        if (isTargetVertical) {
            // Target sumbu Y (up: masuk dari bawah = +Y, down: masuk dari atas = -Y)
            newY = (direction === 'up') ? primaryMag : -primaryMag;
            // Cross-axis dipindahkan ke X
            newX = secondaryMag;
        } else {
            // Target sumbu X (left: masuk dari kanan = +X, right: masuk dari kiri = -X)
            newX = (direction === 'left') ? primaryMag : -primaryMag;
            // Cross-axis dipindahkan ke Y
            newY = secondaryMag;
        }

        // Deep clone agar tidak merusak original global preset object
        const modified = JSON.parse(JSON.stringify(payload));
        modified.animator.position = [newX, newY, oz];

        // 3. Smart Rotation Flipping
        // Jika arah berlawanan, invert rotasinya agar rasanya tetap "masuk akal" secara fisik
        const defaultIsNegative = (defaultDir === 'down' || defaultDir === 'right');
        const targetIsNegative = (direction === 'down' || direction === 'right');
        const needsFlip = (defaultIsNegative !== targetIsNegative);

        if (typeof modified.animator.rotation !== 'undefined' && needsFlip) {
            modified.animator.rotation = -anim.rotation;
        }

        // Flip untuk rotasi 3D
        if (typeof modified.animator.rotationX !== 'undefined' && isTargetVertical && needsFlip) {
            modified.animator.rotationX = -anim.rotationX;
        }
        if (typeof modified.animator.rotationY !== 'undefined' && !isTargetVertical && needsFlip) {
            modified.animator.rotationY = -anim.rotationY;
        }

        return modified;
    }

    async function applyToSelected() {
        AG.setStatus('APPLYING...', '');
        if (AG.state.engine === 'bezier' && !AG.isLoopActive()) {
            const bz = AG.state.params.bezier;
            const result = await evalHostScript(AG.hostMethods.applyNativeEase, bz.x1, bz.y1, bz.x2, bz.y2);
            if (result === 'OK') AG.captureReferenceCurve();
            AG.setStatus(result === 'OK' ? 'NATIVE EASE APPLIED ✓' : 'ERROR', result === 'OK' ? 'ok' : 'err');
            return;
        }
        const expr = AG.buildCurrentExpression();
        const result = await evalHostScript(AG.hostMethods.applyExpression, expr);
        const ok = result && result.indexOf('OK') === 0;
        if (ok) AG.captureReferenceCurve();
        AG.setStatus(ok ? (AG.isLoopActive() ? 'LOOP EXPRESSION APPLIED ✓' : 'EXPRESSION APPLIED ✓') : 'ERROR', ok ? 'ok' : 'err');
    }

    async function bakeKeys() {
        AG.setStatus('BAKING KEYS...', '');
        const baked = AG.getSamples(120);
        const result = await evalHostScript(AG.hostMethods.bakeKeys, JSON.stringify(baked), JSON.stringify({ requestedSteps: AG.state.bakeSteps }));
        const ok = result && result.indexOf('OK') === 0;
        if (ok) AG.captureReferenceCurve();
        AG.setStatus(ok ? result.replace(/^OK:\s*/, '').toUpperCase() + ' ✓' : 'ERROR', ok ? 'ok' : 'err');
    }

    async function clearExpression() {
        await evalHostScript(AG.hostMethods.clearExpression);
        AG.setStatus('EXPR CLEARED ✓', 'ok');
    }

    async function applyTextAnimation(presetId, animMode, direction) {
        const preset = window.TEXT_PRESETS && window.TEXT_PRESETS[presetId];
        if (!preset) {
            AG.setStatus('TEXT PRESET NOT FOUND', 'err');
            return;
        }

        let payload = JSON.parse(JSON.stringify(preset));
        payload.animMode = animMode || 'both';

        if (preset.directional && direction) {
            payload = applyDirectionToPayload(payload, direction);
        }

        AG.setStatus('APPLYING TEXT...', '');
        const result = await evalHostScript(AG.hostMethods.applyTextAnimation, JSON.stringify(payload));
        const ok = result && result.indexOf('OK') === 0;
        AG.setStatus(ok ? 'TEXT ANIMATION APPLIED ✓' : 'ERROR', ok ? 'ok' : 'err');
    }

    async function syncFromAfterEffects() {
        AG.setStatus('READING AE...', '');
        const result = await evalHostScript(AG.hostMethods.syncFromAE);
        if (!result || result === 'null' || result === 'PREVIEW_MODE') {
            AG.setStatus('NO KEYS SELECTED', 'err');
            return;
        }
        try {
            const data = JSON.parse(result);
            const currentMode = AG.state.params.bezier.mode || 'value';
            AG.state.params.bezier = { x1: data.x1, y1: data.y1, x2: data.x2, y2: data.y2, mode: currentMode };
            AG.setEngine('bezier');
            if (AG.presetManager) { AG.presetManager.setEngine('bezier'); AG.presetManager.clearActivePreset(); }
            AG.syncCurrentInputs();
            AG.draw();
            AG.setStatus('SYNCED ✓', 'ok');
        } catch (e) {
            AG.setStatus('PARSE ERROR', 'err');
        }
    }

    async function refreshFps() {
        const fps = await evalHostScript(AG.hostMethods.getFPS);
        if (fps && !isNaN(fps)) AG.dom.fps.textContent = fps + ' FPS';
    }

    async function clearTextAnimations() {
        AG.setStatus('CLEARING...', '');
        const result = await evalHostScript(AG.hostMethods.clearTextAnimations);
        const ok = result && result.indexOf('OK') === 0;
        AG.setStatus(ok ? 'TEXT ANIMATION CLEARED ✓' : 'ERROR', ok ? 'ok' : 'err');
    }

    AG.evalHostScript = evalHostScript;
    AG.applyDirectionToPayload = applyDirectionToPayload;
    AG.applyToSelected = applyToSelected;
    AG.bakeKeys = bakeKeys;
    AG.clearExpression = clearExpression;
    AG.applyTextAnimation = applyTextAnimation;
    AG.syncFromAfterEffects = syncFromAfterEffects;
    AG.refreshFps = refreshFps;
    AG.clearTextAnimations = clearTextAnimations;
})();