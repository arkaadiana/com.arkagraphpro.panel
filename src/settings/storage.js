(function (root) {
    'use strict';

    const storage = root.ArkaGraphStorageHelper;
    let lastBackgroundPayload = null;
    const DEFAULTS = {
        features: {
            mirrorEnabled: true,
            ghostEnabled: true
        },
        appearance: {
            theme: 'carbon',
            accent: 'mint'
        },
        background: {
            enabled: false,
            dataUrl: '',
            type: '',
            name: '',
            bytes: 0,
            activeId: '',
            source: '',
            gallery: []
        }
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function mergeSettings(base, partial) {
        const next = clone(base);

        if (partial && partial.features) {
            next.features.mirrorEnabled = partial.features.mirrorEnabled !== false;
            next.features.ghostEnabled = partial.features.ghostEnabled !== false;
        }

        if (partial && partial.appearance) {
            if (partial.appearance.theme) {
                next.appearance.theme = partial.appearance.theme;
            }
            if (partial.appearance.accent) {
                next.appearance.accent = partial.appearance.accent;
            }
        }

        if (partial && partial.background) {
            next.background.enabled = partial.background.enabled === true;
            next.background.dataUrl = typeof partial.background.dataUrl === 'string' ? partial.background.dataUrl : '';
            next.background.type = typeof partial.background.type === 'string' ? partial.background.type : '';
            next.background.name = typeof partial.background.name === 'string' ? partial.background.name : '';
            next.background.bytes = typeof partial.background.bytes === 'number' ? partial.background.bytes : 0;
            next.background.activeId = typeof partial.background.activeId === 'string' ? partial.background.activeId : '';
            next.background.source = typeof partial.background.source === 'string' ? partial.background.source : '';
            next.background.gallery = Array.isArray(partial.background.gallery) ? partial.background.gallery.filter(function (item) {
                return item && typeof item.dataUrl === 'string' && item.dataUrl;
            }).map(function (item, index) {
                return {
                    id: typeof item.id === 'string' && item.id ? item.id : 'stored-bg-' + index,
                    dataUrl: item.dataUrl,
                    type: typeof item.type === 'string' ? item.type : '',
                    name: typeof item.name === 'string' ? item.name : '',
                    bytes: typeof item.bytes === 'number' ? item.bytes : 0,
                    source: typeof item.source === 'string' ? item.source : 'user'
                };
            }) : [];
            if (next.background.dataUrl && !next.background.gallery.length) {
                next.background.activeId = next.background.activeId || 'legacy-bg';
                next.background.gallery.push({
                    id: next.background.activeId,
                    dataUrl: next.background.dataUrl,
                    type: next.background.type,
                    name: next.background.name,
                    bytes: next.background.bytes,
                    source: next.background.source || 'user'
                });
            }
            if (next.background.dataUrl && !next.background.activeId && next.background.gallery.length) {
                const matchingItem = next.background.gallery.find(function (item) {
                    return item.dataUrl === next.background.dataUrl;
                }) || next.background.gallery[0];
                next.background.activeId = matchingItem.id;
            }
            if (!next.background.dataUrl && next.background.activeId && next.background.gallery.length) {
                const activeItem = next.background.gallery.find(function (item) {
                    return item.id === next.background.activeId;
                });
                if (activeItem) {
                    next.background.dataUrl = activeItem.dataUrl;
                    next.background.type = activeItem.type;
                    next.background.name = activeItem.name;
                    next.background.bytes = activeItem.bytes;
                    next.background.source = activeItem.source || 'user';
                }
            }
            if (!next.background.dataUrl) {
                next.background.enabled = false;
                next.background.type = '';
                next.background.name = '';
                next.background.bytes = 0;
                next.background.activeId = '';
                next.background.source = '';
            }
        }

        return next;
    }

    function withoutBackgroundPayload(settings) {
        const lean = clone(settings);
        lean.background.dataUrl = '';
        lean.background.gallery = [];
        return lean;
    }

    root.ArkaGraphSettingsStorage = {
        defaults: clone(DEFAULTS),
        load: function () {
            try {
                const storedSettings = storage.read(['settings', 'core'], null);
                const storedBackground = storage.read(['settings', 'background'], null);
                lastBackgroundPayload = storedBackground ? JSON.stringify(storedBackground) : '';
                if (!storedSettings) {
                    return storedBackground ? mergeSettings(DEFAULTS, { background: storedBackground }) : clone(DEFAULTS);
                }
                const settings = mergeSettings(DEFAULTS, storedSettings);
                if (storedBackground) {
                    return mergeSettings(settings, { background: storedBackground });
                }
                return settings;
            } catch (error) {
                return clone(DEFAULTS);
            }
        },
        save: function (settings) {
            try {
                const merged = mergeSettings(DEFAULTS, settings);
                const savedCore = storage.write(['settings', 'core'], withoutBackgroundPayload(merged));
                const hasBackgroundPayload = !!(merged.background.dataUrl || merged.background.gallery.length);
                const backgroundPayload = hasBackgroundPayload ? JSON.stringify(merged.background) : '';
                let savedBackground = true;
                if (backgroundPayload !== lastBackgroundPayload) {
                    if (backgroundPayload) {
                        savedBackground = storage.write(['settings', 'background'], merged.background);
                    } else {
                        savedBackground = storage.remove(['settings', 'background']);
                    }
                    if (savedBackground) {
                        lastBackgroundPayload = backgroundPayload;
                    }
                }
                return savedCore && savedBackground;
            } catch (error) {
                return false;
            }
        },
        merge: mergeSettings
    };
})(window);
