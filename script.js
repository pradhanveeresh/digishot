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
    const albumName = sanitizeName(params.get("album")) || "test";
    const musicName = sanitizeName(params.get("music")) || "ringtone";
    const bgName = sanitizeName(params.get("bg")) || "bg01"; 

    const pdfPath = `./albums/${albumName}.pdf`;
    const musicPath = `./music/${musicName}.mp3`;
    const coverPath = `./assets/covers/${albumName}.jpg`; 

    let pageFlip = null;
    let pdfDoc = null;
    let isBookReady = false;
    let initialWidth = window.innerWidth;
    let isFullscreenToggling = false;

    // --- 1. Load Music & Background ---
    function setBackground() {
        const bgImg = new Image();
        const requestedBgPath = `./assets/bg/${bgName}.jpg`;
        const defaultBgPath = `./assets/bg/bg01.jpg`;

        bgImg.src = requestedBgPath;
        bgImg.onload = () => appBg.style.backgroundImage = `url('${requestedBgPath}')`;
        bgImg.onerror = () => appBg.style.backgroundImage = `url('${defaultBgPath}')`;
    }

    function loadMusic() {
        audioEl.src = musicPath;
        audioEl.load();
        audioEl.addEventListener('error', () => musicToggleBtn.style.opacity = 0.5);
    }

    // --- 2. Snowfall Effect ---
    function initSnowfall() {
        if (!window.particlesJS) return;
        particlesJS("particles-js", {
            "particles": {
                "number": { "value": 50, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#ffffff" },
                "shape": { "type": "circle" },
                "opacity": { "value": 0.5, "random": true },
                "size": { "value": 3, "random": true },
                "line_linked": { "enable": false },
                "move": { "enable": true, "speed": 1.5, "direction": "bottom", "random": true, "straight": false, "out_mode": "out" }
            },
            "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": false } } },
            "retina_detect": true
        });
    }

    // --- 3. Build 3D Flipbook ---
    async function loadPdfAndBuild() {
        // ERROR HANDLING: Agar library missing hogi toh screen par dikhega
        if (!window.pdfjsLib) {
            showError("PDF.js library nahi mili!<br>Check `libs/pdf.min.js`");
            return;
        }
        if (!window.StPageFlip) {
            showError("PageFlip library nahi mili!<br>Check `libs/page-flip.browser.min.js`");
            return;
        }

        try {
            const loadingTask = pdfjsLib.getDocument(pdfPath);
            pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            const isMobile = window.innerWidth <= 768;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            let bookWidth = screenWidth * 0.95; 
            let bookHeight = bookWidth / 1.5; 
            
            if (bookHeight > screenHeight * 0.85) {
                bookHeight = screenHeight * 0.85;
                bookWidth = bookHeight * 1.5;
            }

            bookContainer.style.width = `${bookWidth}px`;
            bookContainer.style.height = `${bookHeight}px`;

            const pageWidth = Math.round(bookWidth / 2);
            const pageHeight = Math.round(bookHeight);

            bookContainer.innerHTML = '';

            // Front Cover
            createPage('front', true);
            // Inner Pages
            for (let num = 1; num <= totalPages; num++) {
                createPage(num, false);
            }
            // Back Cover
            createPage('back', true);

            const canvases = bookContainer.querySelectorAll('canvas');
            for (let i = 0; i < canvases.length; i++) {
                const pageNum = i + 1;
                await renderPdfPage(pageNum, canvases[i], pageWidth, pageHeight);
            }

            // MAIN FIX: StPageFlip.PageFlip use karna tha
            pageFlip = new StPageFlip.PageFlip(bookContainer, {
                width: pageWidth,
                height: pageHeight,
                size: "stretch",
                minWidth: pageWidth, maxWidth: pageWidth * 1.5,
                minHeight: pageHeight, maxHeight: pageHeight * 1.5,
                drawShadow: true, 
                flippingTime: 1000,
                usePortrait: isMobile,
                startPage: 0,
                showCover: true,
                mobileScrollSupport: false
            });

            const pages = bookContainer.querySelectorAll('.page');
            pageFlip.loadFromHTML(pages);

            isBookReady = true;

            // Preloader hatao
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => loadingOverlay.style.display = 'none', 500);
            }, 500);

        } catch (error) { 
            console.error(error);
            showError("PDF Load nahi ho paaya!<br>Kya aapka album link sahi hai?");
        }
    }

    // Helper functions
    function createPage(content, isHard) {
        const pageDiv = document.createElement("div");
        pageDiv.className = `page ${isHard ? '-hard' : ''}`;
        
        if (typeof content === 'number') {
            const canvas = document.createElement("canvas");
            pageDiv.appendChild(canvas);
        } else if (content === 'front') {
            const coverImg = new Image();
            coverImg.src = coverPath;
            coverImg.onload = () => pageDiv.style.backgroundImage = `url('${coverPath}')`;
            coverImg.onerror = () => pageDiv.style.backgroundColor = '#2c2e33'; 
        } else if (content === 'back') {
            pageDiv.style.backgroundColor = '#2c2e33'; 
        }
        bookContainer.appendChild(pageDiv);
    }

    async function renderPdfPage(pageNum, canvas, tw, th) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 }); 
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        await page.render({ canvasContext: context, viewport: viewport }).promise;
    }

    function showError(msg) {
        loadingOverlay.innerHTML = `<h3 style="color:#ff6b6b; text-align:center; font-family:sans-serif; padding: 20px;">${msg}</h3>`;
    }

    // --- 4. Controls Logic ---
    prevBtn.addEventListener("click", () => { if (isBookReady) pageFlip.flipPrev(); });
    nextBtn.addEventListener("click", () => { if (isBookReady) pageFlip.flipNext(); });

    musicToggleBtn.addEventListener("click", async () => {
        try {
            if (!audioEl.paused) { audioEl.pause(); musicToggleBtn.style.background = "rgba(80,80,80,0.5)"; }
            else { await audioEl.play(); musicToggleBtn.style.background = "rgba(120,120,120,0.7)"; }
        } catch (e) {}
    });

    fullscreenBtn.addEventListener("click", () => {
        isFullscreenToggling = true;
        setTimeout(() => { isFullscreenToggling = false; }, 1000);
        const elem = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape"); } catch(e){}
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(e){}
        }
    });

    // --- 5. Initialization ---
    setBackground();
    loadMusic();
    initSnowfall();
    loadPdfAndBuild();

    window.addEventListener("resize", debounce(() => { 
        if (!isFullscreenToggling && Math.abs(window.innerWidth - initialWidth) > 100) location.reload(); 
    }, 500));

    function debounce(fn, delay) { let t; return function() { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), delay); }; }
    function sanitizeName(value) { return value ? value.replace(/[^a-zA-Z0-9-_]/g, "") : ""; }
})();
