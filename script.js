(function () {
    const bookContainer = document.getElementById("book-container");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const appBg = document.getElementById("app-bg");
    const audioEl = document.getElementById("bgMusic");

    const params = new URLSearchParams(window.location.search);
    const album = params.get("album") || "test";
    const bg = params.get("bg") || "bg01"; 
    const music = params.get("music") || "ringtone";

    let pageFlip = null;
    let isBookReady = false;

    // Background & Snowfall Logic
    function initVisuals() {
        const bgImg = new Image();
        bgImg.src = `./assets/bg/${bg}.jpg`;
        bgImg.onload = () => appBg.style.backgroundImage = `url('${bgImg.src}')`;
        bgImg.onerror = () => appBg.style.backgroundImage = `url('./assets/bg/bg01.jpg')`;

        if (window.particlesJS) {
            particlesJS("particles-js", {
                "particles": {
                    "number": { "value": 40 },
                    "color": { "value": "#ffffff" },
                    "move": { "enable": true, "speed": 1.2, "direction": "bottom" }
                }
            });
        }
    }

    async function buildBook() {
        // --- 1. Library Check (Simple & Clear) ---
        if (!window.pdfjsLib) {
            console.error("PDF.js not found!");
            loadingOverlay.innerHTML = "<h3 style='color:white'>Error: PDF.js Library Missing!</h3>";
            return;
        }
        if (!window.StPageFlip) {
            console.error("StPageFlip not found!");
            loadingOverlay.innerHTML = "<h3 style='color:white'>Error: PageFlip Library Missing!</h3>";
            return;
        }

        try {
            // PDF load karna
            const pdf = await pdfjsLib.getDocument(`./albums/${album}.pdf`).promise;
            const total = pdf.numPages;

            // Size Fix
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

            // A. Create Cover
            const front = document.createElement("div");
            front.className = "page -hard";
            front.style.backgroundImage = `url('./assets/covers/${album}.jpg')`;
            front.style.backgroundSize = "cover";
            bookContainer.appendChild(front);

            // B. Create inner pages
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

            // C. Back Cover
            const back = document.createElement("div");
            back.className = "page -hard";
            back.style.backgroundColor = "#2c2e33";
            bookContainer.appendChild(back);

            // D. Init Library (StPageFlip.PageFlip use karein)
            pageFlip = new StPageFlip.PageFlip(bookContainer, {
                width: pW, height: pH, size: "stretch",
                showCover: true, drawShadow: true,
                usePortrait: (winW < winH),
                flippingTime: 1000
            });

            pageFlip.loadFromHTML(bookContainer.querySelectorAll(".page"));
            isBookReady = true;

            // Hide Logo
            loadingOverlay.style.opacity = "0";
            setTimeout(() => loadingOverlay.style.display = "none", 500);

        } catch (err) {
            console.error(err);
            loadingOverlay.innerHTML = `<h3 style='color:white; padding:20px;'>PDF NOT FOUND!<br>Check path: albums/${album}.pdf</h3>`;
        }
    }

    // Controls
    document.getElementById("prevBtn").onclick = () => isBookReady && pageFlip.flipPrev();
    document.getElementById("nextBtn").onclick = () => isBookReady && pageFlip.flipNext();
    document.getElementById("musicToggle").onclick = () => {
        if (!audioEl.src) audioEl.src = `./music/${music}.mp3`;
        audioEl.paused ? audioEl.play() : audioEl.pause();
    };
    document.getElementById("fullscreenBtn").onclick = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    };

    initVisuals();
    buildBook();
})();
