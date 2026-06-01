(function () {
    'use strict';
    const AG = window.AG;

    let currentTextCategory = 'all';
    let currentTextSearch = '';
    let currentEffectSearch = '';
    let textFavorites = [];

    try {
        textFavorites = JSON.parse(localStorage.getItem('AG_TextFavs') || '[]');
    } catch(e) {}

    let directionState = {};

    try {
        directionState = JSON.parse(localStorage.getItem('AG_TextDirs') || '{}');
    } catch(e) {}

    function getDirection(presetId, defaultDir) {
        return directionState[presetId] || defaultDir || 'up';
    }

    function setDirection(presetId, dir) {
        directionState[presetId] = dir;
        try {
            localStorage.setItem('AG_TextDirs', JSON.stringify(directionState));
        } catch(e) {}
    }

    let directionPicker = null;

    function buildDirectionPicker() {
        if (directionPicker) return;

        directionPicker = document.createElement('div');
        directionPicker.className = 'ag-dir-picker';
        directionPicker.innerHTML =
            '<button class="ag-dir-btn" data-dir="up"    title="From below">↑</button>' +
            '<button class="ag-dir-btn" data-dir="down"  title="From above">↓</button>' +
            '<button class="ag-dir-btn" data-dir="left"  title="From right">←</button>' +
            '<button class="ag-dir-btn" data-dir="right" title="From left">→</button>';

        directionPicker.addEventListener('click', function(e) {
            const btn = e.target.closest('.ag-dir-btn');
            if (!btn) return;
            e.stopPropagation();

            const dir = btn.dataset.dir;
            const presetId = AG.state.selectedTextPresetId;
            if (!presetId) return;

            setDirection(presetId, dir);
            updateDirectionPickerState(presetId);
            updatePreview(presetId, dir);
        });
    }

    function updateDirectionPickerState(presetId) {
        if (!directionPicker) return;
        const preset = window.TEXT_PRESETS && window.TEXT_PRESETS[presetId];
        if (!preset) return;
        const current = getDirection(presetId, preset.defaultDirection);
        directionPicker.querySelectorAll('.ag-dir-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.dir === current);
        });
    }

    function attachDirectionPicker(cardEl, presetId) {
        if (!directionPicker) buildDirectionPicker();

        if (directionPicker.parentElement) {
            directionPicker.parentElement.removeChild(directionPicker);
        }

        cardEl.appendChild(directionPicker);
        updateDirectionPickerState(presetId);
    }

    function injectDirectionStyles() {
        if (document.getElementById('ag-dir-styles')) return;
        const style = document.createElement('style');
        style.id = 'ag-dir-styles';
        style.textContent = [
            '.ag-dir-picker {',
            '  display: flex;',
            '  gap: 4px;',
            '  margin-top: 8px;',
            '  padding-top: 8px;',
            '  border-top: 1px solid var(--border2, rgba(255,255,255,0.08));',
            '}',
            '.ag-dir-btn {',
            '  flex: 1;',
            '  height: 26px;',
            '  background: var(--bg1, rgba(255,255,255,0.04));',
            '  border: 1px solid var(--border1, rgba(255,255,255,0.1));',
            '  border-radius: 4px;',
            '  color: var(--text2, #888);',
            '  font-size: 13px;',
            '  line-height: 1;',
            '  cursor: pointer;',
            '  transition: background 0.15s, color 0.15s, border-color 0.15s;',
            '}',
            '.ag-dir-btn:hover {',
            '  background: var(--bg2, rgba(255,255,255,0.08));',
            '  color: var(--text0, #fff);',
            '}',
            '.ag-dir-btn.active {',
            '  background: var(--accent, #5b6cf0);',
            '  border-color: var(--accent, #5b6cf0);',
            '  color: #fff;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function updatePreview(presetId, direction) {
        AG.dom.textVideoPreview.classList.add('hidden');
        AG.dom.textPreviewRender.classList.remove('hidden');

        const previewRender = AG.dom.textPreviewRender;
        if (!previewRender) return;

        const preset = window.TEXT_PRESETS && window.TEXT_PRESETS[presetId];
        let className = 'animate-' + presetId;

        if (preset && preset.directional && direction) {
            className += ' dir-' + direction;
        }

        previewRender.className = '';
        previewRender.querySelectorAll('span').forEach(function(span) { span.className = ''; });

        void previewRender.offsetWidth;
        previewRender.className = className;

        syncPreviewDirectionCSS(presetId, direction);
    }

    function updateEffectPreview(effectId) {
        AG.dom.textPreviewRender.classList.add('hidden');
        AG.dom.textVideoPreview.classList.remove('hidden');
        AG.dom.textVideoPreview.src = 'assets/previews/' + effectId + '.webm';
        AG.dom.textVideoPreview.load();
        AG.dom.textVideoPreview.play().catch(function(){});
    }

    function syncPreviewDirectionCSS(presetId, direction) {
        const preset = window.TEXT_PRESETS && window.TEXT_PRESETS[presetId];
        if (!preset || !preset.directional) {
            clearPreviewDirectionCSS();
            return;
        }

        const anim = preset.animator;
        if (!Array.isArray(anim.position)) { clearPreviewDirectionCSS(); return; }

        const defaultDir = preset.defaultDirection || 'up';
        
        let primaryMag = 0, secondaryMag = 0;
        const isDefaultVertical = (defaultDir === 'up' || defaultDir === 'down');
        
        if (isDefaultVertical) {
            primaryMag = Math.abs(anim.position[1]) || 85;
            secondaryMag = anim.position[0] || 0;
        } else {
            primaryMag = Math.abs(anim.position[0]) || 150;
            secondaryMag = anim.position[1] || 0;
        }

        const isTargetVertical = (direction === 'up' || direction === 'down');
        let newX = 0, newY = 0;
        
        if (isTargetVertical) {
            newY = (direction === 'up') ? primaryMag : -primaryMag;
            newX = secondaryMag;
        } else {
            newX = (direction === 'left') ? primaryMag : -primaryMag;
            newY = secondaryMag;
        }

        const pxX = Math.round(newX * 0.35);
        const pxY = Math.round(newY * 0.35);
        const translateStr = `translate(${pxX}px, ${pxY}px)`;

        let scaleStr = '';
        if (Array.isArray(anim.scale) && (anim.scale[0] !== 100 || anim.scale[1] !== 100)) {
            scaleStr = ` scale(${anim.scale[0] / 100}, ${anim.scale[1] / 100})`;
        }

        let rotateStr = '';
        if (typeof anim.rotation !== 'undefined') {
            const defaultIsNegative = (defaultDir === 'down' || defaultDir === 'right');
            const targetIsNegative = (direction === 'down' || direction === 'right');
            const needsFlip = (defaultIsNegative !== targetIsNegative);
            const r = needsFlip ? -anim.rotation : anim.rotation;
            rotateStr = ` rotate(${r}deg)`;
        }

        const fromTransform = translateStr + scaleStr + rotateStr;
        const toTransform   = `translate(0, 0) scale(1) rotate(0deg)`;

        let easeIn  = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; 
        let easeOut = 'cubic-bezier(0.6, -0.8, 0.73, 0.04)'; 

        if (preset.category === 'clean') {
            easeIn  = 'cubic-bezier(0.16, 1, 0.3, 1)'; 
            easeOut = 'cubic-bezier(0.7, 0, 0.84, 0)'; 
        } else if (presetId === 'shinobiStrike') {
            easeIn  = 'cubic-bezier(0.1, 1, 0.2, 1)';
            easeOut = 'cubic-bezier(0.7, -0.5, 0.9, 0)';
        } else if (presetId === 'swingingRotate') {
            easeOut = 'cubic-bezier(0.36, -0.56, 0.66, -0.01)'; 
        }

        const animClass  = '.animate-' + presetId + '.dir-' + direction;
        const keyframeId = 'agDirPreview_' + presetId + '_' + direction;

        const css = [
            `@keyframes ${keyframeId} {`,
            `  0%   { transform: ${fromTransform}; opacity: 0; animation-timing-function: ${easeIn}; }`,
            `  20%  { transform: ${toTransform}; opacity: 1; }`,
            `  80%  { transform: ${toTransform}; opacity: 1; animation-timing-function: ${easeOut}; }`,
            `  100% { transform: ${fromTransform}; opacity: 0; }`,
            `}`,
            `${animClass} span {`,
            `  animation-name: ${keyframeId} !important;`,
            `}`
        ].join('\n');

        let el = document.getElementById('ag-dir-preview-css');
        if (!el) {
            el = document.createElement('style');
            el.id = 'ag-dir-preview-css';
            document.head.appendChild(el);
        }
        el.textContent = css;
    }

    function clearPreviewDirectionCSS() {
        const el = document.getElementById('ag-dir-preview-css');
        if (el) el.textContent = '';
    }

    function toggleFavorite(presetId, event) {
        event.stopPropagation();
        event.preventDefault();
        if (textFavorites.includes(presetId)) {
            textFavorites = textFavorites.filter(function(id) { return id !== presetId; });
        } else {
            textFavorites.push(presetId);
        }
        localStorage.setItem('AG_TextFavs', JSON.stringify(textFavorites));
        renderTextPresetCards();
    }

    function setMainView(view) {
        AG.state.activeView = view;
        AG.dom.graphView.classList.toggle('hidden', view !== 'graph');
        AG.dom.textView.classList.toggle('hidden', view !== 'text');
        AG.dom.timeView.classList.toggle('hidden', view !== 'time');
        AG.dom.mainViewTabs.forEach(function (tab) {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        if (view !== 'text' && AG.dom.textVideoPreview) {
            AG.dom.textVideoPreview.pause();
        } else if (view === 'text' && AG.state.activeTextSubView === 'effect' && AG.dom.textVideoPreview) {
            AG.dom.textVideoPreview.play().catch(function(){});
        }
        if (view === 'graph') {
            AG.resizeCanvas();
            if (typeof AG.draw === 'function') AG.draw();
        }
        if (view === 'time' && AG.aiManager) {
            AG.aiManager.refresh();
        }
    }

    function setTextSubView(subView) {
        AG.state.activeTextSubView = subView;
        AG.dom.textAnimSubView.classList.toggle('hidden', subView !== 'animation');
        AG.dom.textEffectSubView.classList.toggle('hidden', subView !== 'effect');
        AG.dom.textSubTabs.forEach(function (tab) {
            tab.classList.toggle('active', tab.dataset.subView === subView);
        });
        
        if (subView !== 'effect' && AG.dom.textVideoPreview) {
            AG.dom.textVideoPreview.pause();
        }

        if (subView === 'animation') {
            if (AG.state.selectedTextPresetId) selectTextPreset(AG.state.selectedTextPresetId);
        } else {
            if (AG.state.selectedTextEffectId) selectTextEffect(AG.state.selectedTextEffectId);
        }
    }

    function setTextAnimMode(mode) {
        AG.state.textAnimMode = mode;
        AG.dom.textAnimModeButtons.forEach(function (button) {
            button.classList.toggle('active', button.dataset.textMode === mode);
        });
    }

    function setTimeSpeedRampMode(mode) {
        const wantsAi = mode === 'ai';
        const aiReady = AG.aiManager && AG.aiManager.isInstalled();
        AG.state.timeSpeedRampMode = wantsAi && aiReady ? 'ai' : 'native';

        if (AG.dom.timeNativeMode) {
            AG.dom.timeNativeMode.checked = AG.state.timeSpeedRampMode === 'native';
        }
        if (AG.dom.timeAiMode) {
            AG.dom.timeAiMode.checked = AG.state.timeSpeedRampMode === 'ai';
            AG.dom.timeAiMode.disabled = !aiReady;
        }
        if (AG.dom.timeModeOptions) {
            AG.dom.timeModeOptions.forEach(function (option) {
                const input = option.querySelector('input');
                const isActive = input && input.value === AG.state.timeSpeedRampMode;
                option.classList.toggle('active', !!isActive);
                option.classList.toggle('disabled', !!(input && input.disabled));
            });
        }
    }

    function getRampShapeLabel(shape) {
        if (shape === 'fastSlow') return 'FAST TO SLOW';
        if (shape === 'slowFast') return 'SLOW TO FAST';
        if (shape === 'constant') return 'CONSTANT SPEED';
        return 'FAST SLOW FAST';
    }

    function syncTimeRampControls() {
        const ramp = AG.state.timeRamp || { shape: 'fastSlowFast', intensity: 80 };
        if (AG.dom.timeRampShapeButtons) {
            AG.dom.timeRampShapeButtons.forEach(function (button) {
                button.classList.toggle('active', button.dataset.rampShape === ramp.shape);
            });
        }
        if (AG.dom.timeRampIntensity) AG.dom.timeRampIntensity.value = ramp.intensity;
        if (AG.dom.timeRampIntensityVal) AG.dom.timeRampIntensityVal.textContent = ramp.intensity + '%';
        if (AG.dom.timeRampSummary) AG.dom.timeRampSummary.textContent = getRampShapeLabel(ramp.shape);
    }

    function setTimeRampShape(shape) {
        AG.state.timeRamp.shape = shape || 'fastSlowFast';
        syncTimeRampControls();
    }

    function syncTimeRampSliders() {
        AG.state.timeRamp.intensity = Math.max(10, Math.min(100, parseInt(AG.dom.timeRampIntensity.value, 10) || 80));
        syncTimeRampControls();
    }

    function getTimeRampOptions() {
        const ramp = AG.state.timeRamp || {};
        return {
            shape: ramp.shape || 'fastSlowFast',
            intensity: Math.max(10, Math.min(100, parseInt(ramp.intensity, 10) || 80))
        };
    }

    function selectTextPreset(presetId) {
        AG.state.selectedTextPresetId = presetId;
        const cards = AG.dom.textPresetGrid.querySelectorAll('.preset-card');
        if (cards) {
            cards.forEach(function (card) {
                card.classList.toggle('active', card.dataset.presetId === presetId);
            });
        }
        const preset = window.TEXT_PRESETS && window.TEXT_PRESETS[presetId];
        if (preset && preset.directional) {
            const activeCard = AG.dom.textPresetGrid.querySelector('.preset-card[data-preset-id="' + presetId + '"]');
            if (activeCard) attachDirectionPicker(activeCard, presetId);
        } else {
            if (directionPicker && directionPicker.parentElement) {
                directionPicker.parentElement.removeChild(directionPicker);
            }
        }
        const dir = (preset && preset.directional) ? getDirection(presetId, preset.defaultDirection) : null;
        updatePreview(presetId, dir);
    }

    function selectTextEffect(effectId) {
        AG.state.selectedTextEffectId = effectId;
        const cards = AG.dom.textEffectGrid.querySelectorAll('.preset-card');
        if (cards) {
            cards.forEach(function (card) {
                card.classList.toggle('active', card.dataset.effectId === effectId);
            });
        }
        updateEffectPreview(effectId);
    }

    function createTextPresetCard(preset) {
        const card      = document.createElement('div');
        const topline   = document.createElement('div');
        const title     = document.createElement('span');
        const icon      = document.createElement('span');
        const hint      = document.createElement('span');
        const specs     = document.createElement('div');
        const duration  = document.createElement('span');
        const shape     = document.createElement('span');
        const favBtn    = document.createElement('button');

        card.className = 'preset-card';
        card.dataset.presetId = preset.id;
        if (AG.state.selectedTextPresetId === preset.id) card.classList.add('active');

        favBtn.className = 'preset-fav-btn' + (textFavorites.includes(preset.id) ? ' is-fav' : '');
        favBtn.innerHTML = textFavorites.includes(preset.id) ? '★' : '☆';
        favBtn.onclick = function(e) { toggleFavorite(preset.id, e); };

        topline.className = 'text-preset-topline';
        title.className = 'text-preset-title';
        title.textContent = preset.label || preset.name;
        title.style.color = 'var(--text0)';

        icon.className = 'text-preset-icon';
        if (preset.directional) {
            icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l0 20M2 12l10-10 10 10"/></svg>';
            icon.title = 'Directional preset';
        } else {
            icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>';
        }
        icon.style.color = 'var(--accent)';

        hint.className = 'text-preset-hint';
        hint.textContent = preset.hint || 'Text animator preset';
        hint.style.fontSize = '9px';
        hint.style.color = 'var(--text2)';
        hint.style.display = 'block';
        hint.style.marginTop = '4px';

        specs.className = 'text-preset-specs';
        specs.style.marginTop = '8px';

        duration.className = 'text-preset-chip';
        duration.textContent = (preset.duration || 1) + 's';
        duration.style.cssText = 'font-size:8px;padding:2px 4px;background:var(--bg1);border-radius:3px;color:var(--text1);';

        shape.className = 'text-preset-chip';
        shape.textContent = 'SHAPE ' + (preset.advanced && preset.advanced.shape ? preset.advanced.shape : 2);
        shape.style.cssText = 'font-size:8px;padding:2px 4px;background:var(--bg1);border-radius:3px;color:var(--text1);margin-left:4px;';

        topline.style.cssText = 'display:flex;justify-content:space-between;';
        topline.appendChild(title);
        topline.appendChild(icon);
        specs.appendChild(duration);
        specs.appendChild(shape);

        card.appendChild(favBtn);
        card.appendChild(topline);
        card.appendChild(hint);
        card.appendChild(specs);

        card.addEventListener('click', function () {
            selectTextPreset(preset.id);
        });

        return card;
    }

    function createTextEffectCard(effect) {
        const card      = document.createElement('div');
        const topline   = document.createElement('div');
        const title     = document.createElement('span');
        const icon      = document.createElement('span');
        const hint      = document.createElement('span');

        card.className = 'preset-card';
        card.dataset.effectId = effect.id;
        if (AG.state.selectedTextEffectId === effect.id) card.classList.add('active');

        topline.className = 'text-preset-topline';
        title.className = 'text-preset-title';
        title.textContent = effect.name;
        title.style.color = 'var(--text0)';

        icon.className = 'text-preset-icon';
        icon.innerHTML = 'FFX';
        icon.style.color = 'var(--accent)';

        hint.className = 'text-preset-hint';
        hint.textContent = effect.hint || 'FFX Effect preset';
        hint.style.fontSize = '9px';
        hint.style.color = 'var(--text2)';
        hint.style.display = 'block';
        hint.style.marginTop = '4px';

        topline.style.cssText = 'display:flex;justify-content:space-between;';
        topline.appendChild(title);
        topline.appendChild(icon);

        card.appendChild(topline);
        card.appendChild(hint);

        card.addEventListener('click', function () {
            selectTextEffect(effect.id);
        });

        return card;
    }

    function renderTextPresetCards() {
        if (directionPicker && directionPicker.parentElement) {
            directionPicker.parentElement.removeChild(directionPicker);
        }

        AG.dom.textPresetGrid.innerHTML = '';
        const presets = window.TEXT_PRESETS || {};

        for (const key in presets) {
            const preset = presets[key];

            if (currentTextCategory === 'fav' && !textFavorites.includes(preset.id)) continue;
            if (currentTextCategory !== 'all' && currentTextCategory !== 'fav' && preset.category !== currentTextCategory) continue;

            if (currentTextSearch !== '') {
                const s = currentTextSearch.toLowerCase();
                if (!preset.name.toLowerCase().includes(s) && !(preset.hint || '').toLowerCase().includes(s)) continue;
            }

            const card = createTextPresetCard(preset);
            AG.dom.textPresetGrid.appendChild(card);
        }

        const activeId = AG.state.selectedTextPresetId;
        if (activeId) {
            const activePreset = window.TEXT_PRESETS && window.TEXT_PRESETS[activeId];
            if (activePreset && activePreset.directional) {
                const activeCard = AG.dom.textPresetGrid.querySelector('.preset-card[data-preset-id="' + activeId + '"]');
                if (activeCard) attachDirectionPicker(activeCard, activeId);
            }
        }
    }

    function renderTextEffectCards() {
        AG.dom.textEffectGrid.innerHTML = '';
        const effects = window.TEXT_EFFECTS || {};

        for (const key in effects) {
            const effect = effects[key];

            if (currentEffectSearch !== '') {
                const s = currentEffectSearch.toLowerCase();
                if (!effect.name.toLowerCase().includes(s) && !(effect.hint || '').toLowerCase().includes(s)) continue;
            }

            const card = createTextEffectCard(effect);
            AG.dom.textEffectGrid.appendChild(card);
        }
    }

    function handleApplyText() {
        const presetId = AG.state.selectedTextPresetId;
        const preset   = window.TEXT_PRESETS && window.TEXT_PRESETS[presetId];
        const dir      = (preset && preset.directional) ? getDirection(presetId, preset.defaultDirection) : null;
        AG.applyTextAnimation(presetId, AG.state.textAnimMode, dir);
    }

    function handleApplyEffect() {
        const effectId = AG.state.selectedTextEffectId;
        if (effectId === 'autoSync') {
            AG.applyAudioSync(effectId);
        } else {
            AG.applyTextEffect(effectId);
        }
    }

    function bindUiEvents() {
        injectDirectionStyles();
        buildDirectionPicker();

        AG.dom.mainViewTabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                setMainView(tab.dataset.view);
            });
        });

        AG.dom.textSubTabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                setTextSubView(tab.dataset.subView);
            });
        });

        document.querySelectorAll('.eng-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                AG.setEngine(tab.dataset.engine);
                if (AG.presetManager) {
                    AG.presetManager.setEngine(tab.dataset.engine);
                    AG.presetManager.clearActivePreset();
                }
            });
        });

        document.querySelectorAll('#bezier-mode .seg-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                AG.state.params.bezier.mode = btn.dataset.bmode;
                AG.syncBezierModeButtons();
                AG.notifyPresetDirty();
                AG.draw();
            });
        });

        AG.dom.textAnimModeButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                setTextAnimMode(button.dataset.textMode);
            });
        });

        AG.dom.applyTextButton.addEventListener('click', handleApplyText);
        AG.dom.applyEffectButton.addEventListener('click', handleApplyEffect);

        AG.dom.reverseFrameButton.addEventListener('click', AG.applyReverseFrame);
        AG.dom.freezeFrameButton.addEventListener('click', AG.applyFreezeFrame);
        AG.dom.speedRampButton.addEventListener('click', AG.applySpeedRamp);

        if (AG.dom.timeNativeMode) {
            AG.dom.timeNativeMode.addEventListener('change', function () {
                setTimeSpeedRampMode('native');
            });
        }
        if (AG.dom.timeAiMode) {
            AG.dom.timeAiMode.addEventListener('change', function () {
                setTimeSpeedRampMode('ai');
            });
        }
        if (AG.dom.downloadAiPackageButton) {
            AG.dom.downloadAiPackageButton.addEventListener('click', AG.downloadAiPackage);
        }
        if (AG.dom.removeAiPackageButton) {
            AG.dom.removeAiPackageButton.addEventListener('click', AG.removeAiPackage);
        }
        if (AG.dom.timeRampShapeButtons) {
            AG.dom.timeRampShapeButtons.forEach(function (button) {
                button.addEventListener('click', function () {
                    setTimeRampShape(button.dataset.rampShape);
                });
            });
        }
        if (AG.dom.timeRampIntensity) {
            AG.dom.timeRampIntensity.addEventListener('input', syncTimeRampSliders);
            AG.dom.timeRampIntensity.addEventListener('change', syncTimeRampSliders);
        }

        if (AG.dom.clearTextButton) {
            AG.dom.clearTextButton.addEventListener('click', AG.clearTextAnimations);
        }

        AG.dom.applyButton.addEventListener('click', AG.applyToSelected);
        AG.dom.bakeButton.addEventListener('click', AG.bakeKeys);
        AG.dom.clearButton.addEventListener('click', AG.clearExpression);
        AG.dom.resetButton.addEventListener('click', AG.resetCurrentEngine);
        AG.dom.syncButton.addEventListener('click', AG.syncFromAfterEffects);
        AG.dom.mirrorButton.addEventListener('click', AG.mirrorCurrentGraph);

        AG.dom.loopEnabled.addEventListener('change', function (event) {
            AG.state.loop.enabled = !!event.target.checked;
            AG.syncLoopInputs();
            AG.refreshApplyButton();
        });

        AG.dom.loopInfinite.addEventListener('change', function (event) {
            AG.state.loop.infinite = !!event.target.checked;
            AG.syncLoopInputs();
            AG.refreshApplyButton();
        });

        [AG.dom.loopInCount, AG.dom.loopOutCount].forEach(function (input) {
            function sync() {
                AG.state.loop.inCount  = AG.clampLoopCount(AG.dom.loopInCount.value);
                AG.state.loop.outCount = AG.clampLoopCount(AG.dom.loopOutCount.value);
                AG.syncLoopInputs();
                AG.refreshApplyButton();
            }
            input.addEventListener('input', sync);
            input.addEventListener('change', sync);
        });

        if (AG.dom.textSearchInput) {
            AG.dom.textSearchInput.addEventListener('input', function(e) {
                currentTextSearch = e.target.value;
                renderTextPresetCards();
            });
        }

        if (AG.dom.effectSearchInput) {
            AG.dom.effectSearchInput.addEventListener('input', function(e) {
                currentEffectSearch = e.target.value;
                renderTextEffectCards();
            });
        }

        if (AG.dom.textCategoryTabs) {
            AG.dom.textCategoryTabs.forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    AG.dom.textCategoryTabs.forEach(function(b) { b.classList.remove('active'); });
                    e.target.classList.add('active');
                    currentTextCategory = e.target.dataset.cat;
                    renderTextPresetCards();
                });
            });
        }

        renderTextPresetCards();
        renderTextEffectCards();
        setTextAnimMode(AG.state.textAnimMode);
        setTimeSpeedRampMode(AG.state.timeSpeedRampMode);
        syncTimeRampControls();
        setMainView(AG.state.activeView);
        setTextSubView(AG.state.activeTextSubView || 'animation');

        const initId = AG.state.selectedTextPresetId;
        if (initId) {
            const initPreset = window.TEXT_PRESETS && window.TEXT_PRESETS[initId];
            const initDir = (initPreset && initPreset.directional) ? getDirection(initId, initPreset.defaultDirection) : null;
            updatePreview(initId, initDir);
            if (initPreset && initPreset.directional) {
                const initCard = AG.dom.textPresetGrid.querySelector('.preset-card[data-preset-id="' + initId + '"]');
                if (initCard) attachDirectionPicker(initCard, initId);
            }
        }

        const graphBg   = document.getElementById('graph-bg-layer');
        const graphGrad = document.getElementById('graph-bg-gradient');
        const textBg    = document.getElementById('text-bg-layer');
        const textGrad  = document.getElementById('text-bg-gradient');

        if (graphBg && textBg) {
            textBg.style.backgroundImage = graphBg.style.backgroundImage;
            textBg.className = graphBg.className;
            if (graphGrad && textGrad) textGrad.className = graphGrad.className;

            new MutationObserver(function(mutations) {
                mutations.forEach(function() {
                    textBg.style.backgroundImage = graphBg.style.backgroundImage;
                    textBg.className = graphBg.className;
                    if (graphGrad && textGrad) textGrad.className = graphGrad.className;
                });
            }).observe(graphBg, { attributes: true, attributeFilter: ['style', 'class'] });
        }
    }

    AG.setTimeSpeedRampMode = setTimeSpeedRampMode;
    AG.getTimeRampOptions = getTimeRampOptions;
    AG.bindUiEvents = bindUiEvents;
})();