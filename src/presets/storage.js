(function (root) {
    'use strict';

    const storage = root.ArkaGraphStorageHelper;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    root.ArkaGraphPresetStorage = {
        loadUserPresets: function () {
            const stored = storage.read(['presets', 'userPresets'], []);
            return Array.isArray(stored) ? stored.map(clone) : [];
        },
        saveUserPresets: function (presets) {
            storage.write(['presets', 'userPresets'], presets.map(clone));
        },
        loadBuiltinFavorites: function () {
            const stored = storage.read(['presets', 'builtinFavorites'], []);
            return Array.isArray(stored) ? stored.slice() : [];
        },
        saveBuiltinFavorites: function (favoriteIds) {
            storage.write(['presets', 'builtinFavorites'], favoriteIds.slice());
        }
    };
})(window);
