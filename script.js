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

    // PDF Worker Local Path Fix
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = './libs/pdf.worker.min.js';
    }

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

    async function initBook() {
        // Library Check
        if (typeof pdfjsLib === 'undefined' || typeof StPageFlip === 'undefined') {
            loadingOverlay.innerHTML = `<p style="color:white; padding:20px;">Library Load Error!<br>Check your libs folder.</p>`;
            return;
        }

        try {
            const pdf = await pdfjsLib.getDocument(`./albums/${album}.pdf`).promise;
            const total = pdf.numPages;

            const isMobile = window.innerWidth <= 768;
            let bW = window.innerWidth * 0.95;
            let bH = bW / 1.5;
            if (bH > window.innerHeight * 0.85) {
                bH = window.innerHeight * 0.85;
                bW = bH * 1.5;
            }

            bookContainer.style.width = `${bW}px`;
            bookContainer.style.height = `${bH}px`;
            const pW = Math.round(bW / 2);
            const pH = Math.round(bH);

            // 1. Cover
            const front = document.createElement("div");
            front.className = "page -hard";
            front.style.backgroundImage = `url('./assets/covers/${album}.jpg')`;
            front.style.backgroundSize = "cover";
            bookContainer.appendChild(front);

            // 2. PDF Pages
            for (let i = 1; i <= total; i++) {
                const pDiv = document.createElement("div");
                pDiv.className = "page";
                const canvas = document.createElement("canvas");
                pDiv.appendChild(canvas);
                bookContainer.appendChild(pDiv);

                const page = await pdf.getPage(i);
                const vp = page.getViewport({ scale: 2 });
                canvas.width = vp.width; canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
            }

            // 3. Back Cover
            const back = document.createElement("div");
            back.className = "page -hard";
            back.style.backgroundColor = "#2c2e33";
            bookContainer.appendChild(back);

            // 4. PageFlip (Offline call)
            pageFlip = new StPageFlip.PageFlip(bookContainer, {
                width: pW, height: pH, size: "stretch",
                showCover: true, drawShadow: true,
                usePortrait: isMobile, flippingTime: 1000
            });

            pageFlip.loadFromHTML(bookContainer.querySelectorAll(".page"));
            isBookReady = true;

            loadingOverlay.style.opacity = "0";
            setTimeout(() => loadingOverlay.style.display = "none", 500);

        } catch (err) {
            console.error(err);
            loadingOverlay.innerHTML = `<p style="color:white; padding:20px;">Error: PDF Path Sahi hai?<br>(albums/${album}.pdf)</p>`;
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
    initBook();
})();
