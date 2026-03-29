(function () {
    const bookContainer = document.getElementById("book-container");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const appBg = document.getElementById("app-bg");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const musicToggleBtn = document.getElementById("musicToggle");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    const audioEl = document.getElementById("bgMusic");

    const params = new URLSearchParams(window.location.search);
    const albumName = params.get("album") || "test";
    const musicName = params.get("music") || "ringtone";
    const bgName = params.get("bg") || "bg01"; 

    const pdfPath = `./albums/${albumName}.pdf`;
    const musicPath = `./music/${musicName}.mp3`;
    const coverPath = `./assets/covers/${albumName}.jpg`; 

    let pageFlip = null;
    let pdfDoc = null;
    let isBookReady = false;

    // --- 1. Background & Music ---
    function initBase() {
        // Background set with fallback
        const bgImg = new Image();
        bgImg.src = `./assets/bg/${bgName}.jpg`;
        bgImg.onload = () => appBg.style.backgroundImage = `url('${bgImg.src}')`;
        bgImg.onerror = () => appBg.style.backgroundImage = `url('./assets/bg/bg01.jpg')`;

        // Music load
        audioEl.src = musicPath;
    }

    // --- 2. Snowfall Effect ---
    function initSnow() {
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

    // --- 3. Build 3D Book ---
    async function loadBook() {
        if (!window.pdfjsLib || !window.StPageFlip) {
            console.error("Libraries missing!");
            return;
        }

        try {
            const loadingTask = pdfjsLib.getDocument(pdfPath);
            pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            // Responsive Size
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

            // Create HTML Elements for Pages
            // Front Cover
            const front = document.createElement("div");
            front.className = "page -hard";
            front.style.backgroundImage = `url('${coverPath}')`;
            front.style.backgroundSize = "cover";
            bookContainer.appendChild(front);

            // PDF Pages
            for (let i = 1; i <= totalPages; i++) {
                const pDiv = document.createElement("div");
                pDiv.className = "page";
                const canvas = document.createElement("canvas");
                pDiv.appendChild(canvas);
                bookContainer.appendChild(pDiv);
                
                // Render Page
                const page = await pdfDoc.getPage(i);
                const vp = page.getViewport({ scale: 2 });
                canvas.width = vp.width;
                canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
            }

            // Back Cover
            const back = document.createElement("div");
            back.className = "page -hard";
            back.style.backgroundColor = "#2c2e33";
            bookContainer.appendChild(back);

            // Initialize PageFlip
            pageFlip = new StPageFlip.PageFlip(bookContainer, {
                width: pW, height: pH,
                size: "stretch",
                showCover: true,
                drawShadow: true,
                usePortrait: isMobile,
                flippingTime: 1000
            });

            pageFlip.loadFromHTML(bookContainer.querySelectorAll(".page"));
            isBookReady = true;

            // Hide Preloader
            loadingOverlay.style.opacity = "0";
            setTimeout(() => loadingOverlay.style.display = "none", 500);

        } catch (err) {
            console.error(err);
            loadingOverlay.innerHTML = `<p style="color:white">Error: PDF path check karein (albums/${albumName}.pdf)</p>`;
        }
    }

    // --- 4. Events ---
    prevBtn.onclick = () => isBookReady && pageFlip.flipPrev();
    nextBtn.onclick = () => isBookReady && pageFlip.flipNext();
    
    musicToggleBtn.onclick = () => {
        if (audioEl.paused) audioEl.play(); else audioEl.pause();
    };

    fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // --- Start ---
    initBase();
    initSnow();
    loadBook();

    // Safety: Agar 10 sec tak load na ho to preloader hatao
    setTimeout(() => {
        if (loadingOverlay.style.display !== 'none') {
            loadingOverlay.style.opacity = "0";
            setTimeout(() => loadingOverlay.style.display = "none", 500);
        }
    }, 10000);

})();
