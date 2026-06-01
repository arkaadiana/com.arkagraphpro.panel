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

    function applyDirectionToPayload(payload, direction) {
        if (!direction || !payload.animator) return payload;

        const anim = payload.animator;
        if (!Array.isArray(anim.position)) return payload;

        const [ox, oy, oz] = anim.position;
        const defaultDir = payload.defaultDirection || 'up';

        let primaryMag = 0;
        let secondaryMag = 0;
        const isDefaultVertical = (defaultDir === 'up' || defaultDir === 'down');

        if (isDefaultVertical) {
            primaryMag = Math.abs(oy);
            secondaryMag = ox; 
        } else {
            primaryMag = Math.abs(ox);
            secondaryMag = oy; 
        }

        if (primaryMag === 0) primaryMag = isDefaultVertical ? 85 : 150;

        let newX = 0, newY = 0;
        const isTargetVertical = (direction === 'up' || direction === 'down');

        if (isTargetVertical) {
            newY = (direction === 'up') ? primaryMag : -primaryMag;
            newX = secondaryMag;
        } else {
            newX = (direction === 'left') ? primaryMag : -primaryMag;
            newY = secondaryMag;
        }

        const modified = JSON.parse(JSON.stringify(payload));
        modified.animator.position = [newX, newY, oz];

        const defaultIsNegative = (defaultDir === 'down' || defaultDir === 'right');
        const targetIsNegative = (direction === 'down' || direction === 'right');
        const needsFlip = (defaultIsNegative !== targetIsNegative);

        if (typeof modified.animator.rotation !== 'undefined' && needsFlip) {
            modified.animator.rotation = -anim.rotation;
        }

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

    async function applyTextEffect(effectId) {
        const effect = window.TEXT_EFFECTS && window.TEXT_EFFECTS[effectId];
        if (!effect) {
            AG.setStatus('EFFECT NOT FOUND', 'err');
            return;
        }
        if (!AG.csInterface) {
            AG.setStatus('PREVIEW MODE', 'ok');
            return;
        }
        AG.setStatus('APPLYING EFFECT...', '');
        const extensionRoot = AG.csInterface.getSystemPath(SystemPath.EXTENSION);
        const absoluteFfxPath = extensionRoot + "/src/assets/ffx/" + effect.ffxFile;
        const result = await evalHostScript('arkaGraphApplyTextEffect', absoluteFfxPath);
        const ok = result && result.indexOf('OK') === 0;
        AG.setStatus(ok ? 'EFFECT APPLIED ✓' : 'ERROR', ok ? 'ok' : 'err');
    }

    async function applyAudioSync(effectId) {
        const effect = window.TEXT_EFFECTS && window.TEXT_EFFECTS[effectId];
        if (!effect) {
            AG.setStatus('EFFECT NOT FOUND', 'err');
            return;
        }
        if (!AG.csInterface) {
            AG.setStatus('PREVIEW MODE', 'ok');
            return;
        }
        AG.setStatus('SYNCING AUDIO...', '');
        const extensionRoot = AG.csInterface.getSystemPath(SystemPath.EXTENSION);
        const absoluteFfxPath = extensionRoot + "/src/assets/ffx/" + effect.ffxFile;
        
        const result = await evalHostScript('arkaGraphApplyAudioSync', absoluteFfxPath);
        
        const ok = result && result.indexOf('OK') === 0;
        AG.setStatus(ok ? 'AUDIO SYNC APPLIED ✓' : 'ERROR', ok ? 'ok' : 'err');
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

    async function applyReverseFrame() {
        AG.setStatus('REVERSING LAYER...', '');
        const result = await evalHostScript(AG.hostMethods.applyReverse);
        const ok = result && result.indexOf('OK') === 0;
        AG.setStatus(ok ? 'LAYER REVERSED ✓' : 'ERROR', ok ? 'ok' : 'err');
    }

    async function applyFreezeFrame() {
        AG.setStatus('FREEZING FRAME...', '');
        const result = await evalHostScript(AG.hostMethods.applyFreezeFrame);
        const ok = result && result.indexOf('OK') === 0;
        AG.setStatus(ok ? 'FREEZE FRAME APPLIED ✓' : 'ERROR', ok ? 'ok' : 'err');
    }

    async function applySpeedRamp() {
        if (AG.state.timeSpeedRampMode === 'ai') {
            if (!AG.aiManager || !AG.aiManager.isInstalled()) {
                AG.setStatus('INSTALL AI PACKAGE FIRST', 'err');
                return;
            }
            if (typeof AG.runAiSpeedRamp === 'function') {
                await AG.runAiSpeedRamp();
                return;
            }
            AG.setStatus('AI RUNNER UNAVAILABLE', 'err');
            return;
        } else {
            AG.setStatus('APPLYING SPEED RAMP...', '');
        }

        const options = typeof AG.getTimeRampOptions === 'function' ? AG.getTimeRampOptions() : {};
        const result = await evalHostScript(AG.hostMethods.applyNativeSpeedRamp, JSON.stringify(options));
        const ok = result && result.indexOf('OK') === 0;
        AG.setStatus(ok ? 'SPEED RAMP APPLIED ✓' : 'ERROR', ok ? 'ok' : 'err');
    }

    AG.evalHostScript = evalHostScript;
    AG.applyDirectionToPayload = applyDirectionToPayload;
    AG.applyToSelected = applyToSelected;
    AG.bakeKeys = bakeKeys;
    AG.clearExpression = clearExpression;
    AG.applyTextAnimation = applyTextAnimation;
    AG.applyTextEffect = applyTextEffect;
    AG.applyAudioSync = applyAudioSync;
    AG.syncFromAfterEffects = syncFromAfterEffects;
    AG.refreshFps = refreshFps;
    AG.clearTextAnimations = clearTextAnimations;
    AG.applyReverseFrame = applyReverseFrame;
    AG.applyFreezeFrame = applyFreezeFrame;
    AG.applySpeedRamp = applySpeedRamp;
})();
