(function () {

    'use strict';

    window.TEXT_PRESETS = {

        // ─── CLEAN ───────────────────────────────────────────────
        slideFade: {
            id: 'slideFade', category: 'clean', name: 'Slide Fade',
            hint: 'Clean professional directional reveal', duration: 0.6,
            directional: true, defaultDirection: 'up',
            animator: { position: [0, 85, 0], scale: [100, 100, 100], opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 85, easeLow: 15, basedOn: 1, smoothness: 100, randomizeOrder: false }
        },

        trackingSpread: {
            id: 'trackingSpread', category: 'clean', name: 'Tracking Spread',
            hint: 'Cinematic wide atmosphere', duration: 1.2,
            directional: false,
            animator: { position: [0, 0, 0], scale: [100, 100, 100], opacity: 0, tracking: 60 },
            advanced: { shape: 2, easeHigh: 75, easeLow: 25, basedOn: 1, smoothness: 100, randomizeOrder: false }
        },

        terminalTyping: {
            id: 'terminalTyping', category: 'clean', name: 'Terminal Typing',
            hint: 'Classic typewriter effect', duration: 1.5,
            directional: false,
            animator: { position: [0, 0, 0], scale: [100, 100, 100], opacity: 0, tracking: 0 },
            advanced: { shape: 1, easeHigh: 0, easeLow: 0, basedOn: 1, smoothness: 0, randomizeOrder: false }
        },

        // ─── KINETIC ─────────────────────────────────────────────
        overshootPop: {
            id: 'overshootPop', category: 'kinetic', name: 'Overshoot Pop',
            hint: 'Snappy elastic bounce', duration: 0.5,
            directional: false,
            animator: { position: [0, 0, 0], scale: [0, 0, 100], opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        spinPop: {
            id: 'spinPop', category: 'kinetic', name: 'Spin Pop',
            hint: 'Rotate and scale overshoot', duration: 0.6,
            directional: false,
            animator: { position: [0, 0, 0], scale: [0, 0, 100], rotation: -90, opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        floatPop: {
            id: 'floatPop', category: 'kinetic', name: 'Float Pop',
            hint: 'Buoyant rise with scale snap', duration: 0.7,
            directional: true, defaultDirection: 'up',
            animator: { position: [0, 60, 0], scale: [50, 50, 100], opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        swingingRotate: {
            id: 'swingingRotate', category: 'kinetic', name: 'Swinging Rotate',
            hint: 'Dynamic rotation bounce', duration: 0.8,
            directional: true, defaultDirection: 'up',
            animator: { position: [0, 45, 0], scale: [100, 100, 100], rotation: -60, opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        magneticSnap: {
            id: 'magneticSnap', category: 'kinetic', name: 'Magnetic Snap',
            hint: 'Wide tracking snaps into place', duration: 0.7,
            directional: false,
            animator: { position: [0, 0, 0], scale: [120, 120, 100], opacity: 0, tracking: 80 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        // ─── AMV ─────────────────────────────────────────────────
        chaoticRandom: {
            id: 'chaoticRandom', category: 'amv', name: 'Chaotic Random',
            hint: 'Randomized fast popup', duration: 0.9,
            directional: false,
            animator: { position: [0, 0, 0], scale: [0, 0, 100], rotation: 45, opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: true }
        },

        shinobiStrike: {
            id: 'shinobiStrike', category: 'amv', name: 'Shinobi Strike',
            hint: 'Fast diagonal slash', duration: 0.5,
            directional: true, defaultDirection: 'left',
            animator: { position: [-100, 80, 0], scale: [100, 100, 100], rotation: -25, opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 100, easeLow: 0, basedOn: 1, smoothness: 50, randomizeOrder: false }
        },

        cyberCoding: {
            id: 'cyberCoding', category: 'amv', name: 'Cyber Coding',
            hint: 'Aggressive random datamosh', duration: 0.8,
            directional: false,
            animator: { position: [20, -15, 0], scale: [120, 110, 100], opacity: 0, tracking: 0 },
            advanced: { shape: 1, easeHigh: 100, easeLow: 0, basedOn: 1, smoothness: 0, randomizeOrder: true }
        },

        cyberDataGlitch: {
            id: 'cyberDataGlitch', category: 'amv', name: 'Cyber Data Glitch',
            hint: 'Choppy datamosh with matrix tracking', duration: 0.8,
            directional: false,
            animator: { position: [25, -15, 0], scale: [120, 110, 100], opacity: 0, tracking: -12 },
            advanced: { shape: 1, easeHigh: 100, easeLow: 0, basedOn: 1, smoothness: 0, randomizeOrder: true }
        },

        scatterExplode: {
            id: 'scatterExplode', category: 'amv', name: 'Scatter Explode',
            hint: 'Multi-directional particle burst', duration: 0.8,
            directional: false,
            animator: { position: [0, 0, 0], scale: [0, 0, 100], rotation: 90, opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: true }
        },

        spiralVortex: {
            id: 'spiralVortex', category: 'amv', name: 'Spiral Vortex',
            hint: 'Massive scale spin and pull', duration: 0.8,
            directional: false,
            animator: { position: [0, -50, 0], scale: [300, 300, 100], rotation: 180, opacity: 0, tracking: 40 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        rubberBand: {
            id: 'rubberBand', category: 'amv', name: 'Rubber Band',
            hint: 'Extreme squash and stretch snap', duration: 0.7,
            directional: false,
            animator: { position: [0, 0, 0], scale: [400, 20, 100], opacity: 0, tracking: -20 },
            advanced: { shape: 2, easeHigh: 95, easeLow: 5, basedOn: 1, smoothness: 70, randomizeOrder: false }
        },

        zoomDive3D: {
            id: 'zoomDive3D', category: 'amv', name: '3D Zoom Dive',
            hint: 'Aggressive impact from camera', duration: 0.6,
            directional: false,
            animator: { position: [0, 0, 0], scale: [1500, 1500, 100], opacity: 0, tracking: 100 },
            advanced: { shape: 2, easeHigh: 100, easeLow: 0, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        whipSwing: {
            id: 'whipSwing', category: 'amv', name: 'Whip Swing',
            hint: 'Angled rotational whip entry', duration: 0.7,
            directional: true, defaultDirection: 'right',
            animator: { position: [500, -300, 0], scale: [100, 100, 100], rotation: 75, opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        },

        zoomRandom3D: {
            id: 'zoomRandom3D', category: 'amv', name: '3D Zoom Random',
            hint: 'Chaotic deep scale pop', duration: 0.8,
            directional: false,
            animator: { position: [0, 0, 0], positionZ: 1200, scale: [600, 600, 100], orientation: [90, 90, 45], opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: true }
        },

        zoomRotate3D: {
            id: 'zoomRotate3D', category: 'amv', name: '3D Zoom Rotate',
            hint: 'Tumbling 3D space entry', duration: 0.9,
            directional: false,
            animator: { position: [0, 0, 800], scale: [400, 400, 100], rotationX: 90, rotationY: 45, orientation: [0, 30, 0], opacity: 0, tracking: 0 },
            advanced: { shape: 2, easeHigh: 90, easeLow: 10, basedOn: 1, smoothness: 80, randomizeOrder: false }
        }

    };

})();