(function () {
    'use strict';
    window.AG = window.AG || {};

    window.AG.openExternalLink = function(url) {
        if (typeof window.cep !== 'undefined' && window.cep.util && window.cep.util.openURLInDefaultBrowser) {
            window.cep.util.openURLInDefaultBrowser(url);
        } else {
            window.open(url, '_blank');
        }
    };

    window.AG.initSecurity = function() {
        const wrap = document.getElementById('header-secure-wrap');
        if (!wrap) return;

        const signature = 'ARKAGRAPH-V3';
        const logoContent = 'ARKA<span>GRAPH</span><span class="ag-pro-badge" style="margin-left:6px;font-size:9px;padding:2px 4px;border-radius:3px;border:1px solid;vertical-align:middle;font-weight:bold;letter-spacing:0.5px;">PRO</span>';
        
        wrap.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div>
                    <div id="logo" data-sig="${signature}">${logoContent}</div>
                    <div id="version">V3.0.0 // MOTION ARCHITECTURE</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                    <div onclick="window.AG.openExternalLink('https://www.instagram.com/4rrka/')" style="cursor: pointer; pointer-events: auto; display: flex; align-items: center; gap: 6px; color: #888; font-size: 10px; font-family: 'JetBrains Mono', monospace; transition: color 0.2s;" onmouseover="this.style.color='#00c4a7'" onmouseout="this.style.color='#888'">
                        4rrka
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </div>
                    <div onclick="window.AG.openExternalLink('https://github.com/arkaadiana')" style="cursor: pointer; pointer-events: auto; display: flex; align-items: center; gap: 6px; color: #888; font-size: 10px; font-family: 'JetBrains Mono', monospace; transition: color 0.2s;" onmouseover="this.style.color='#00c4a7'" onmouseout="this.style.color='#888'">
                        arkaadiana
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    </div>
                </div>
            </div>
        `;

        function verifyIntegrity() {
            const checkWrap = document.getElementById('header-secure-wrap');
            const checkLogo = document.getElementById('logo');
            let tampered = false;

            if (!checkWrap || !checkLogo) {
                tampered = true;
            } else {
                if (checkLogo.dataset.sig !== signature || checkLogo.innerHTML !== logoContent) {
                    tampered = true;
                }
                const styles = window.getComputedStyle(checkWrap);
                if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
                    tampered = true;
                }
            }
            if (tampered) triggerLockdown();
        }

        function triggerLockdown() {
            const canvasWrap = document.getElementById('canvas-wrap');
            const applyBtn = document.getElementById('btn-apply');
            const statusMsg = document.getElementById('status-msg');

            if (canvasWrap) {
                canvasWrap.style.filter = 'blur(10px) grayscale(100%)';
                canvasWrap.style.pointerEvents = 'none';
            }
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.innerText = 'TAMPER DETECTED';
                applyBtn.style.backgroundColor = '#ff3333';
                applyBtn.style.color = '#fff';
            }
            if (statusMsg) {
                statusMsg.textContent = 'LICENSE/CREDIT ERROR';
                statusMsg.className = 'err';
            }
        }

        setInterval(verifyIntegrity, 2500);
    };
})();