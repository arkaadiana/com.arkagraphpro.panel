(function (root) {
    'use strict';

    const FILE_NAME = 'arkagraph_panel_data.json';
    const FOLDER_NAME = 'ArkaGraph';
    const STORE_VERSION = 1;
    const DEFAULT_STORE = {
        version: STORE_VERSION,
        presets: {
            userPresets: [],
            builtinFavorites: []
        },
        settings: {
            core: null,
            background: null
        },
        text: {
            favorites: [],
            directions: {}
        }
    };

    let fs = null;
    let path = null;
    let storagePath = '';
    let cachedStore = null;

    function clone(value) {
        if (typeof value === 'undefined') return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function warn(message, error) {
        if (root.console && typeof root.console.warn === 'function') {
            root.console.warn('[ArkaGraphStorage] ' + message, error || '');
        }
    }

    function loadNodeModules() {
        if (fs && path) return true;
        try {
            const nodeRequire = typeof root.require === 'function' ? root.require : (typeof require === 'function' ? require : null);
            if (!nodeRequire) {
                return false;
            }
            fs = nodeRequire('fs');
            path = nodeRequire('path');
            return !!(fs && path);
        } catch (error) {
            warn('Unable to load Node fs/path modules.', error);
            fs = null;
            path = null;
            return false;
        }
    }

    function getUserDataPath() {
        try {
            if (typeof root.CSInterface === 'function' && root.SystemPath) {
                const csInterface = new root.CSInterface();
                const userData = csInterface.getSystemPath(root.SystemPath.USER_DATA);
                if (userData) {
                    return userData;
                }
            }
        } catch (error) {
            warn('Unable to resolve CEP user data path.', error);
        }
        return '';
    }

    function getFallbackPath() {
        try {
            const nodeDirname = typeof root.__dirname === 'string' ? root.__dirname : (typeof __dirname === 'string' ? __dirname : '');
            const nodeProcess = root.process || (typeof process !== 'undefined' ? process : null);
            if (nodeDirname) {
                return nodeDirname;
            }
            if (nodeProcess && typeof nodeProcess.cwd === 'function') {
                return nodeProcess.cwd();
            }
        } catch (error) {
            warn('Unable to resolve fallback storage path.', error);
        }
        return '';
    }

    function ensureDirectory(dirPath) {
        if (!dirPath || fs.existsSync(dirPath)) return;
        const parent = path.dirname(dirPath);
        if (parent && parent !== dirPath) {
            ensureDirectory(parent);
        }
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    }

    function resolveStoragePath() {
        if (storagePath) return storagePath;
        if (!loadNodeModules()) return '';

        const basePath = getUserDataPath() || getFallbackPath();
        if (!basePath) return '';

        storagePath = path.join(basePath, FOLDER_NAME, FILE_NAME);
        return storagePath;
    }

    function mergeStore(store) {
        const next = clone(DEFAULT_STORE);
        if (!store || typeof store !== 'object') {
            return next;
        }

        next.version = typeof store.version === 'number' ? store.version : STORE_VERSION;

        if (store.presets && typeof store.presets === 'object') {
            next.presets.userPresets = Array.isArray(store.presets.userPresets) ? store.presets.userPresets : [];
            next.presets.builtinFavorites = Array.isArray(store.presets.builtinFavorites) ? store.presets.builtinFavorites : [];
        }

        if (store.settings && typeof store.settings === 'object') {
            next.settings.core = store.settings.core && typeof store.settings.core === 'object' ? store.settings.core : null;
            next.settings.background = store.settings.background && typeof store.settings.background === 'object' ? store.settings.background : null;
        }

        if (store.text && typeof store.text === 'object') {
            next.text.favorites = Array.isArray(store.text.favorites) ? store.text.favorites : [];
            next.text.directions = store.text.directions && typeof store.text.directions === 'object' ? store.text.directions : {};
        }

        return next;
    }

    function writeStore(store) {
        const filePath = resolveStoragePath();
        cachedStore = mergeStore(store);

        if (!filePath || !fs || !path) {
            return false;
        }

        try {
            ensureDirectory(path.dirname(filePath));
            fs.writeFileSync(filePath, JSON.stringify(cachedStore, null, 2), 'utf8');
            return true;
        } catch (error) {
            warn('Unable to write storage file.', error);
            return false;
        }
    }

    function readStore() {
        if (cachedStore) {
            return clone(cachedStore);
        }

        const filePath = resolveStoragePath();
        if (!filePath || !fs) {
            cachedStore = clone(DEFAULT_STORE);
            return clone(cachedStore);
        }

        try {
            if (!fs.existsSync(filePath)) {
                cachedStore = clone(DEFAULT_STORE);
                writeStore(cachedStore);
                return clone(cachedStore);
            }

            const raw = fs.readFileSync(filePath, 'utf8');
            cachedStore = mergeStore(raw ? JSON.parse(raw) : null);
            if (!raw) {
                writeStore(cachedStore);
            }
            return clone(cachedStore);
        } catch (error) {
            warn('Unable to read storage file. Recreating defaults.', error);
            cachedStore = clone(DEFAULT_STORE);
            writeStore(cachedStore);
            return clone(cachedStore);
        }
    }

    function getAtPath(source, pathParts) {
        return pathParts.reduce(function (current, key) {
            return current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined;
        }, source);
    }

    function setAtPath(target, pathParts, value) {
        let current = target;
        pathParts.forEach(function (key, index) {
            if (index === pathParts.length - 1) {
                current[key] = value;
                return;
            }
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        });
    }

    function removeAtPath(target, pathParts) {
        const parentPath = pathParts.slice(0, -1);
        const key = pathParts[pathParts.length - 1];
        const parent = getAtPath(target, parentPath);
        if (parent && Object.prototype.hasOwnProperty.call(parent, key)) {
            delete parent[key];
        }
    }

    root.ArkaGraphStorageHelper = {
        fileName: FILE_NAME,
        getFilePath: resolveStoragePath,
        defaults: clone(DEFAULT_STORE),
        readAll: readStore,
        writeAll: writeStore,
        read: function (pathParts, fallback) {
            const value = getAtPath(readStore(), pathParts);
            return typeof value === 'undefined' || value === null ? clone(fallback) : clone(value);
        },
        write: function (pathParts, value) {
            const store = readStore();
            setAtPath(store, pathParts, clone(value));
            return writeStore(store);
        },
        remove: function (pathParts) {
            const store = readStore();
            removeAtPath(store, pathParts);
            return writeStore(store);
        }
    };
})(window);
