(function () {
    const bookContainer = document.getElementById("book-container");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const appBg = document.getElementById("app-bg");
    const audioEl = document.getElementById("bgMusic");

    // URL Parameters
    const params = new URLSearchParams(window.location.search);
    const album = params.get("album") || "test";
    const bg = params.get("bg") || "bg01"; 
    const music = params.get("music") || "ringtone";

    let pageFlip = null;
    let isBookReady = false;

    // --- 1. Background & Snowfall ---
    function initVisuals() {
        // Dynamic Background with Fallback
        const bgImg = new Image();
        bgImg.src = `./assets/bg/${bg}.jpg`;
        bgImg.onload = () => appBg.style.backgroundImage = `url('${bgImg.src}')`;
        bgImg.onerror = () => appBg.style.backgroundImage = `url('./assets/bg/bg01.jpg')`;

        // Particles/Snowfall
        if (window.particlesJS) {
            particlesJS("particles-js", {
                "particles": {
                    "number": { "value": 40 },
                    "color": { "value": "#ffffff" },
                    "opacity": { "value": 0.5 },
                    "size": { "value": 3 },
                    "move": { "enable": true, "speed": 1, "direction": "bottom" }
                }
            });
        }
    }

    // --- 2. Load PDF and Build 3D Book ---
    async function buildFlipbook() {
        if (!window.pdfjsLib || !window.StPageFlip) {
            console.error("Libraries not loaded yet!");
            return;
        }

        try {
            const pdf = await pdfjsLib.getDocument(`./albums/${album}.pdf`).promise;
            const total = pdf.numPages;

            // Size Logic (Maximize screen usage)
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            let bW = winW * 0.94;
            let bH = bW / 1.5;

            if (bH > winH * 0.85) {
                bH = winH * 0.85;
                bW = bH * 1.5;
            }

            bookContainer.style.width = Math.floor(bW) + "px";
            bookContainer.style.height = Math.floor(bH) + "px";
            const pW = Math.floor(bW / 2);
            const pH = Math.floor(bH);

            bookContainer.innerHTML = '';

            // A. Create Front Cover (Hard 3D)
            const fCover = document.createElement("div");
            fCover.className = "page -hard";
            fCover.style.backgroundImage = `url('./assets/covers/${album}.jpg')`;
            fCover.style.backgroundSize = "cover";
            bookContainer.appendChild(fCover);

            // B. Create & Render PDF Pages
            for (let i = 1; i <= total; i++) {
                const pDiv = document.createElement("div");
                pDiv.className = "page";
                const canvas = document.createElement("canvas");
                pDiv.appendChild(canvas);
                bookContainer.appendChild(pDiv);

                const page = await pdf.getPage(i);
                const vp = page.getViewport({ scale: 2 });
                canvas.width = vp.width;
                canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
            }

            // C. Create Back Cover
            const bCover = document.createElement("div");
            bCover.className = "page -hard";
            bCover.style.backgroundColor = "#2c2e33";
            bookContainer.appendChild(bCover);

            // D. Initialize 3D Library
            pageFlip = new StPageFlip.PageFlip(bookContainer, {
                width: pW, height: pH,
                size: "stretch",
                showCover: true,
                drawShadow: true,
                usePortrait: (winW < winH),
                flippingTime: 1000
            });

            pageFlip.loadFromHTML(bookContainer.querySelectorAll(".page"));
            isBookReady = true;

            // Hide Preloader
            loadingOverlay.style.opacity = "0";
            setTimeout(() => loadingOverlay.style.display = "none", 500);

        } catch (err) {
            console.error(err);
            loadingOverlay.innerHTML = `<p style="color:white; padding:20px;">PDF Error: Check albums/${album}.pdf path</p>`;
        }
    }

    // --- 3. Button Events ---
    document.getElementById("prevBtn").onclick = () => isBookReady && pageFlip.flipPrev();
    document.getElementById("nextBtn").onclick = () => isBookReady && pageFlip.flipNext();
    
    document.getElementById("musicToggle").onclick = () => {
        if (!audioEl.src) audioEl.src = `./music/${music}.mp3`;
        audioEl.paused ? audioEl.play() : audioEl.pause();
    };

    document.getElementById("fullscreenBtn").onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // Run
    initVisuals();
    buildFlipbook();

    // Safety: Hide logo after 10s
    setTimeout(() => { if(loadingOverlay.style.display !== 'none') loadingOverlay.style.display = 'none'; }, 10000);

})();
