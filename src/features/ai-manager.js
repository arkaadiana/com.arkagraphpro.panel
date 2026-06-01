(function () {
    'use strict';

    const AG = window.AG;
    const AI_FOLDER_NAME = 'ai-engine';
    const AI_PACKAGE_URL = 'https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-windows.zip';

    function getNodeModule(name) {
        try {
            if (typeof require === 'function') return require(name);
        } catch (e) {}
        try {
            if (window.cep_node && typeof window.cep_node.require === 'function') {
                return window.cep_node.require(name);
            }
        } catch (e2) {}
        try {
            if (typeof window.require === 'function') return window.require(name);
        } catch (e3) {}
        return null;
    }

    function getExtensionRoot() {
        if (AG.csInterface && typeof SystemPath !== 'undefined') {
            return AG.csInterface.getSystemPath(SystemPath.EXTENSION);
        }

        const pathname = window.location && window.location.pathname ? window.location.pathname : '';
        const decoded = decodeURIComponent(pathname.replace(/^\/([A-Za-z]:)/, '$1'));
        const pathModule = getNodeModule('path');
        if (pathModule && decoded) return pathModule.dirname(decoded);
        return decoded || '';
    }

    function createAiManager() {
        const fs = getNodeModule('fs');
        const path = getNodeModule('path');
        const https = getNodeModule('https');
        const childProcess = getNodeModule('child_process');
        const extensionRoot = getExtensionRoot();
        const packagePath = path && extensionRoot ? path.join(extensionRoot, AI_FOLDER_NAME) : '';
        const zipPath = path && extensionRoot ? path.join(extensionRoot, AI_FOLDER_NAME + '.zip') : '';
        const cachePath = path && extensionRoot ? path.join(extensionRoot, 'ai-cache') : '';
        let downloadBusy = false;

        function canUseNode() {
            return !!(fs && path && extensionRoot);
        }

        function formatBytes(bytes) {
            if (!bytes || bytes < 0) return '0 B';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }

        function setProgress(visible, percent, label, active) {
            const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));

            if (AG.dom.aiPackageProgress) {
                AG.dom.aiPackageProgress.classList.toggle('hidden', !visible);
                AG.dom.aiPackageProgress.classList.toggle('active', !!active);
                AG.dom.aiPackageProgress.setAttribute('aria-hidden', visible ? 'false' : 'true');
            }
            if (AG.dom.aiPackageProgressFill) {
                AG.dom.aiPackageProgressFill.style.width = safePercent + '%';
            }
            if (AG.dom.aiPackageProgressLabel) {
                AG.dom.aiPackageProgressLabel.textContent = label || '';
            }
        }

        function setBusy(isBusy) {
            downloadBusy = !!isBusy;
            if (AG.dom.downloadAiPackageButton) {
                AG.dom.downloadAiPackageButton.disabled = downloadBusy || !canUseNode();
            }
            if (AG.dom.removeAiPackageButton) {
                AG.dom.removeAiPackageButton.disabled = downloadBusy || !canUseNode();
            }
        }

        function exists() {
            if (!canUseNode()) return false;
            try {
                return fs.existsSync(packagePath) &&
                    fs.statSync(packagePath).isDirectory() &&
                    !!findAiExecutablePath();
            } catch (e) {
                return false;
            }
        }

        function findFileRecursive(rootDir, fileNames) {
            let entries;
            let i;
            let itemPath;
            let stat;
            let found;

            if (!rootDir || !fs.existsSync(rootDir)) return '';

            entries = fs.readdirSync(rootDir);
            for (i = 0; i < entries.length; i++) {
                itemPath = path.join(rootDir, entries[i]);
                stat = fs.statSync(itemPath);

                if (stat.isFile() && fileNames.indexOf(entries[i].toLowerCase()) !== -1) {
                    return itemPath;
                }

                if (stat.isDirectory()) {
                    found = findFileRecursive(itemPath, fileNames);
                    if (found) return found;
                }
            }

            return '';
        }

        function findAiExecutablePath() {
            if (!canUseNode()) return '';
            return findFileRecursive(packagePath, [
                'rife-ncnn-vulkan.exe',
                'rife-ncnn-vulkan'
            ]);
        }

        function findFfmpegExecutablePath() {
            var pathDirs;
            var index;
            var candidate;

            if (!canUseNode()) return '';
            candidate = findFileRecursive(packagePath, [
                'ffmpeg.exe',
                'ffmpeg'
            ]);
            if (candidate) return candidate;

            try {
                pathDirs = String(process.env.PATH || '').split(path.delimiter);
                for (index = 0; index < pathDirs.length; index++) {
                    candidate = path.join(pathDirs[index], process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
                    if (fs.existsSync(candidate)) return candidate;
                }
            } catch (e) {
            }

            return '';
        }

        function ensureParentDirectory(filePath) {
            const parent = path.dirname(filePath);
            if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
        }

        function downloadWithAxios(url, destination, onProgress) {
            const axios = getNodeModule('axios');
            if (!axios) return null;

            return axios({
                method: 'GET',
                url: url,
                responseType: 'stream'
            }).then(function (response) {
                return new Promise(function (resolve, reject) {
                    if (!response.data || typeof response.data.on !== 'function' || typeof response.data.pipe !== 'function') {
                        reject(new Error('Axios did not return a Node stream in this CEP context. Using Node https is recommended.'));
                        return;
                    }

                    const totalLength = parseInt(response.headers['content-length'], 10) || 0;
                    let downloaded = 0;
                    const writer = fs.createWriteStream(destination);

                    response.data.on('data', function (chunk) {
                        downloaded += chunk.length;
                        if (onProgress) {
                            onProgress({
                                percent: totalLength ? Math.round((downloaded / totalLength) * 100) : 0,
                                downloaded: downloaded,
                                total: totalLength
                            });
                        }
                    });

                    response.data.pipe(writer);
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            });
        }

        function downloadWithHttps(url, destination, onProgress) {
            if (!https) {
                return Promise.reject(new Error('Node https module is unavailable in this CEP context.'));
            }

            return new Promise(function (resolve, reject) {
                const file = fs.createWriteStream(destination);
                https.get(url, function (response) {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        var redirectUrl = response.headers.location;
                        if (redirectUrl.indexOf('http') !== 0 && typeof URL === 'function') {
                            redirectUrl = new URL(redirectUrl, url).toString();
                        }
                        file.close();
                        try { fs.unlinkSync(destination); } catch (e) {}
                        downloadWithHttps(redirectUrl, destination, onProgress).then(resolve).catch(reject);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        file.close();
                        try { fs.unlinkSync(destination); } catch (e) {}
                        reject(new Error('Download failed with HTTP ' + response.statusCode));
                        return;
                    }

                    const totalLength = parseInt(response.headers['content-length'], 10) || 0;
                    let downloaded = 0;

                    response.on('data', function (chunk) {
                        downloaded += chunk.length;
                        if (onProgress) {
                            onProgress({
                                percent: totalLength ? Math.round((downloaded / totalLength) * 100) : 0,
                                downloaded: downloaded,
                                total: totalLength
                            });
                        }
                    });

                    response.pipe(file);
                    file.on('finish', function () {
                        file.close(resolve);
                    });
                }).on('error', function (error) {
                    file.close();
                    try { fs.unlinkSync(destination); } catch (e) {}
                    reject(error);
                });
            });
        }

        function downloadZip(url, destination, onProgress) {
            ensureParentDirectory(destination);
            if (fs.existsSync(destination)) fs.unlinkSync(destination);

            if (https) return downloadWithHttps(url, destination, onProgress);

            const axiosDownload = downloadWithAxios(url, destination, onProgress);
            if (axiosDownload) return axiosDownload;
            return Promise.reject(new Error('No Node download backend is available. Enable CEP Node.js and restart After Effects.'));
        }

        function extractPackage(sourceZip, destinationDir) {
            const extract = getNodeModule('extract-zip');
            if (!extract) {
                return Promise.reject(new Error('Missing npm package: install extract-zip before downloading the AI package.'));
            }

            if (fs.existsSync(destinationDir)) {
                fs.rmSync(destinationDir, { recursive: true, force: true });
            }
            fs.mkdirSync(destinationDir, { recursive: true });

            return extract(sourceZip, { dir: destinationDir });
        }

        function flattenDirectory(targetDir) {
            try {
                const items = fs.readdirSync(targetDir);
                if (items.length === 1) {
                    const singleItemPath = path.join(targetDir, items[0]);
                    if (fs.statSync(singleItemPath).isDirectory()) {
                        const subItems = fs.readdirSync(singleItemPath);
                        for (let i = 0; i < subItems.length; i++) {
                            fs.renameSync(
                                path.join(singleItemPath, subItems[i]),
                                path.join(targetDir, subItems[i])
                            );
                        }
                        fs.rmdirSync(singleItemPath);
                    }
                }
            } catch (e) {}
        }

        function ensureDirectory(dirPath) {
            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
        }

        function getAiOutputPath(job) {
            const stamp = String(new Date().getTime());
            const baseName = (job.safeLayerName || 'ai_speed_ramp') + '_' + stamp + '.mp4';
            ensureDirectory(cachePath);
            return path.join(cachePath, baseName);
        }

        function getAiWorkPaths(job) {
            const stamp = String(new Date().getTime());
            const root = path.join(cachePath, (job.safeLayerName || 'ai_speed_ramp') + '_' + stamp);
            return {
                root: root,
                inputFrames: path.join(root, 'input'),
                outputFrames: path.join(root, 'rife'),
                outputVideo: path.join(root, 'ai-output.mp4')
            };
        }

        function getFirstFrameNumber(framesDir) {
            let files;
            let match;

            try {
                files = fs.readdirSync(framesDir)
                    .filter(function (fileName) { return /\.png$/i.test(fileName); })
                    .sort();
                if (!files.length) return 0;
                match = files[0].match(/^(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            } catch (e) {
                return 0;
            }
        }

        function setAiProgress(label, percent) {
            setProgress(true, percent || 0, label, true);
            if (AG.dom.aiPackageState) {
                AG.dom.aiPackageState.textContent = 'AI RUNNING';
            }
            if (typeof AG.setStatus === 'function') {
                AG.setStatus('AI SPEED RAMP...', '');
            }
        }

        function runProcess(executablePath, args, onData) {
            return new Promise(function (resolve, reject) {
                let stderr = '';
                let stdout = '';
                let processRef;

                if (!childProcess || typeof childProcess.spawn !== 'function') {
                    reject(new Error('Node child_process is unavailable. CEP Node.js must be enabled.'));
                    return;
                }

                processRef = childProcess.spawn(executablePath, args, {
                    cwd: path.dirname(executablePath),
                    windowsHide: true
                });

                processRef.stdout.on('data', function (chunk) {
                    const text = String(chunk);
                    stdout += text;
                    if (onData) onData(text);
                });

                processRef.stderr.on('data', function (chunk) {
                    const text = String(chunk);
                    stderr += text;
                    if (onData) onData(text);
                });

                processRef.on('error', reject);
                processRef.on('close', function (code) {
                    if (code === 0) {
                        resolve({ stdout: stdout, stderr: stderr });
                    } else {
                        reject(new Error('AI engine exited with code ' + code + '. ' + (stderr || stdout)));
                    }
                });
            });
        }

        function countPngFrames(dirPath) {
            try {
                return fs.readdirSync(dirPath).filter(function (fileName) {
                    return /\.png$/i.test(fileName);
                }).length;
            } catch (e) {
                return 0;
            }
        }

        function runProcessWithFrameProgress(executablePath, args, framesDir, totalFrames, startPercent, endPercent, label) {
            let timer = null;
            const span = Math.max(1, endPercent - startPercent);

            function updateFromFiles() {
                const current = countPngFrames(framesDir);
                const ratio = totalFrames > 0 ? Math.min(1, current / totalFrames) : 0;
                setAiProgress(label + ' ' + current + (totalFrames > 0 ? '/' + totalFrames : ''), startPercent + ratio * span);
            }

            timer = window.setInterval(updateFromFiles, 600);
            updateFromFiles();

            return runProcess(executablePath, args, function (text) {
                const line = text.split(/\r?\n/).filter(Boolean).pop();
                if (line) setAiProgress(line, startPercent);
            }).then(function (result) {
                window.clearInterval(timer);
                setAiProgress(label + ' done', endPercent);
                return result;
            }).catch(function (error) {
                window.clearInterval(timer);
                throw error;
            });
        }

        function parseHostResult(result) {
            if (!result || result === 'null' || result === 'PREVIEW_MODE') {
                throw new Error('After Effects did not return an AI job.');
            }
            if (result.indexOf && result.indexOf('ERROR') === 0) {
                throw new Error(result.replace(/^ERROR:\s*/, ''));
            }
            return JSON.parse(result);
        }

        async function runAiSpeedRamp() {
            let executablePath;
            let ffmpegPath;
            let job;
            let outputPath;
            let workPaths;
            let args;

            if (!canUseNode()) {
                updateUiState('CEP NODE UNAVAILABLE', 'err');
                return false;
            }

            executablePath = findAiExecutablePath();
            if (!executablePath) {
                setProgress(true, 0, 'AI executable not found. Reinstall the AI package.');
                if (typeof AG.setStatus === 'function') AG.setStatus('AI EXE NOT FOUND', 'err');
                return false;
            }

            if (!AG.evalHostScript) {
                setProgress(true, 0, 'Host bridge is unavailable.');
                return false;
            }

            try {
                setBusy(true);
                setAiProgress('Reading selected layer...', 2);

                job = parseHostResult(await AG.evalHostScript(AG.hostMethods.prepareAiSpeedRampJob));
                job.rampOptions = typeof AG.getTimeRampOptions === 'function' ? AG.getTimeRampOptions() : {};
                ffmpegPath = findFfmpegExecutablePath();

                if (!ffmpegPath) {
                    throw new Error('FFmpeg not found. Put ffmpeg.exe inside ai-engine, or install FFmpeg and add it to PATH. RIFE cannot output MP4 directly.');
                }

                workPaths = getAiWorkPaths(job);
                ensureDirectory(workPaths.inputFrames);
                ensureDirectory(workPaths.outputFrames);
                outputPath = workPaths.outputVideo;

                setAiProgress('Extracting source frames...', 8);
                await runProcess(ffmpegPath, ['-y', '-i', job.sourcePath, path.join(workPaths.inputFrames, '%08d.png')], function (text) {
                    const line = text.split(/\r?\n/).filter(Boolean).pop();
                    const current = countPngFrames(workPaths.inputFrames);
                    const total = Math.max(1, Math.round((job.sourceDuration || (job.outPoint - job.inPoint) || 1) * (job.sourceFrameRate || job.compFrameRate || 24)));
                    const ratio = Math.min(1, current / total);
                    if (line) setAiProgress(line, 8 + ratio * 22);
                });

                await runProcessWithFrameProgress(
                    executablePath,
                    ['-i', workPaths.inputFrames, '-o', workPaths.outputFrames],
                    workPaths.outputFrames,
                    Math.max(1, countPngFrames(workPaths.inputFrames) * 2),
                    32,
                    78,
                    'Running RIFE'
                );

                setAiProgress('Encoding AI video...', 82);
                await runProcess(ffmpegPath, [
                    '-y',
                    '-framerate', String(Math.max(1, Math.round((job.compFrameRate || 24) * 2))),
                    '-start_number', String(getFirstFrameNumber(workPaths.outputFrames)),
                    '-i', path.join(workPaths.outputFrames, '%08d.png'),
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    outputPath
                ], function (text) {
                    const line = text.split(/\r?\n/).filter(Boolean).pop();
                    if (line) setAiProgress(line, 88);
                });

                if (!fs.existsSync(outputPath)) {
                    throw new Error('AI finished but did not create an output file: ' + outputPath);
                }

                setProgress(true, 96, 'Importing AI result...', true);
                const importResult = await AG.evalHostScript(AG.hostMethods.importAiSpeedRampResult, outputPath, JSON.stringify(job));
                if (!importResult || importResult.indexOf('OK') !== 0) {
                    throw new Error(importResult || 'Import failed.');
                }

                setBusy(false);
                setProgress(true, 100, 'AI speed ramp imported.', false);
                updateUiState('AI SPEED RAMP DONE', 'ok');
                return true;
            } catch (error) {
                setBusy(false);
                setProgress(true, 0, error && error.message ? error.message : 'AI speed ramp failed.');
                if (typeof AG.setStatus === 'function') AG.setStatus('AI ERROR', 'err');
                return false;
            }
        }

        function updateUiState(message, statusClass) {
            const installed = exists();
            const nodeReady = canUseNode();

            if (AG.dom.aiPackagePath) {
                AG.dom.aiPackagePath.value = packagePath || 'CEP Node.js is not available. Enable --enable-nodejs in CSXS/manifest.xml, then restart After Effects.';
            }

            if (AG.dom.aiPackageState) {
                AG.dom.aiPackageState.textContent = installed ? 'INSTALLED' : 'NOT INSTALLED';
                AG.dom.aiPackageState.classList.toggle('missing', !installed);
            }

            if (AG.dom.downloadAiPackageButton) {
                AG.dom.downloadAiPackageButton.classList.toggle('hidden', installed);
                AG.dom.downloadAiPackageButton.disabled = downloadBusy || !nodeReady;
            }

            if (AG.dom.removeAiPackageButton) {
                AG.dom.removeAiPackageButton.classList.toggle('hidden', !installed);
                AG.dom.removeAiPackageButton.disabled = downloadBusy || !nodeReady;
            }

            if (AG.dom.timeAiMode) {
                AG.dom.timeAiMode.disabled = !installed;
            }

            if (!installed && AG.state.timeSpeedRampMode === 'ai') {
                AG.state.timeSpeedRampMode = 'native';
            }

            if (typeof AG.setTimeSpeedRampMode === 'function') {
                AG.setTimeSpeedRampMode(AG.state.timeSpeedRampMode);
            }

            if (message && typeof AG.setStatus === 'function') {
                AG.setStatus(message, statusClass || '');
            }

            if (!message && !downloadBusy) {
                setProgress(false, installed ? 100 : 0, '');
            }
        }

        function downloadPackage() {
            if (!canUseNode()) {
                updateUiState('CEP NODE UNAVAILABLE', 'err');
                return Promise.resolve(false);
            }

            setBusy(true);
            setProgress(true, 0, 'Starting download...');
            updateUiState('DOWNLOADING... 0%', '');

            return downloadZip(AI_PACKAGE_URL, zipPath, function (progress) {
                const totalText = progress.total ? ' / ' + formatBytes(progress.total) : '';
                const label = progress.total
                    ? progress.percent + '% - ' + formatBytes(progress.downloaded) + totalText
                    : 'Downloading... ' + formatBytes(progress.downloaded);

                setProgress(true, progress.percent, label);
                if (AG.dom.aiPackageState) {
                    AG.dom.aiPackageState.textContent = progress.total ? 'DOWNLOADING... ' + progress.percent + '%' : 'DOWNLOADING...';
                }
            })
                .then(function () {
                    setProgress(true, 100, 'Extracting package...');
                    if (AG.dom.aiPackageState) AG.dom.aiPackageState.textContent = 'EXTRACTING...';
                    return extractPackage(zipPath, packagePath);
                })
                .then(function () {
                    flattenDirectory(packagePath);
                    try { fs.unlinkSync(zipPath); } catch (e) {}
                    setBusy(false);
                    setProgress(true, 100, 'AI package installed.');
                    updateUiState('INSTALLED', 'ok');
                    return true;
                })
                .catch(function (error) {
                    setBusy(false);
                    setProgress(true, 0, error && error.message ? error.message : 'Download failed.');
                    updateUiState('AI PACKAGE ERROR', 'err');
                    return false;
                });
        }

        function removePackage() {
            if (!canUseNode()) {
                updateUiState('CEP NODE UNAVAILABLE', 'err');
                return false;
            }

            try {
                if (fs.existsSync(packagePath)) {
                    fs.rmSync(packagePath, { recursive: true, force: true });
                }
                updateUiState('AI PACKAGE REMOVED', 'ok');
                return true;
            } catch (error) {
                updateUiState('REMOVE FAILED', 'err');
                return false;
            }
        }

        return {
            path: packagePath,
            isInstalled: exists,
            refresh: function () { updateUiState(); },
            downloadPackage: downloadPackage,
            removePackage: removePackage,
            runAiSpeedRamp: runAiSpeedRamp
        };
    }

    function initAiManager() {
        AG.aiManager = createAiManager();
        AG.aiManager.refresh();
    }

    AG.initAiManager = initAiManager;
    AG.downloadAiPackage = function () {
        if (AG.aiManager) return AG.aiManager.downloadPackage();
        return Promise.resolve(false);
    };
    AG.removeAiPackage = function () {
        if (AG.aiManager) return AG.aiManager.removePackage();
        return false;
    };
    AG.runAiSpeedRamp = function () {
        if (AG.aiManager) return AG.aiManager.runAiSpeedRamp();
        return Promise.resolve(false);
    };
})();
