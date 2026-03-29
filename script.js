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
    const bgName = sanitizeName(params.get("bg")) || "bg01"; // bg01 is default

    const pdfPath = `./albums/${albumName}.pdf`;
    const musicPath = `./music/${musicName}.mp3`;
    const coverPath = `./assets/covers/${albumName}.jpg`; // Cover image named same as PDF

    let pageFlip = null;
    let pdfDoc = null;
    let isBookReady = false;
    let initialWidth = window.innerWidth;
    let isFullscreenToggling = false;

    // --- 1. Load Music & Dynamic Background ---
    
    // Set Background (Fallback logic)
    function setBackground() {
        const bgImg = new Image();
        const requestedBgPath = `./assets/bg/${bgName}.jpg`;
        const defaultBgPath = `./assets/bg/bg01.jpg`;

        bgImg.src = requestedBgPath;
        bgImg.onload = () => appBg.style.backgroundImage = `url('${requestedBgPath}')`;
        bgImg.onerror = () => appBg.style.backgroundImage = `url('${defaultBgPath}')`;
    }

    // Load Music
    function loadMusic() {
        audioEl.src = musicPath;
        audioEl.load();
        audioEl.addEventListener('error', () => musicToggleBtn.style.opacity = 0.5);
    }

    // --- 2. Snowfall Effect (Particles.js) ---
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

    // --- 3. Build 3D Flipbook (StPageFlip) ---
    async function loadPdfAndBuild() {
        if (!window.pdfjsLib || !window.StPageFlip) return;

        try {
            const loadingTask = pdfjsLib.getDocument(pdfPath);
            pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            // ALBUM SIZE (Mobile/Laptop optimized)
            const isMobile = window.innerWidth <= 768;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            let bookWidth = screenWidth * 0.95; 
            let bookHeight = bookWidth / 1.5; // Double page ratio
            
            if (bookHeight > screenHeight * 0.88) {
                bookHeight = screenHeight * 0.88;
                bookWidth = bookHeight * 1.5;
            }

            // Book Width/Height for the entire double spread
            bookContainer.style.width = `${bookWidth}px`;
            bookContainer.style.height = `${bookHeight}px`;

            const pageWidth = Math.round(bookWidth / 2);
            const pageHeight = Math.round(bookHeight);

            // Clear container
            bookContainer.innerHTML = '';

            // --- A. Create Pages (HTML Elements) ---
            
            // Front Cover (Hard)
            createPage('front', true);

            // Inner PDF Pages
            for (let num = 1; num <= totalPages; num++) {
                createPage(num, false);
            }

            // Back Cover (Hard & Blank)
            createPage('back', true);

            // --- B. Render PDF frames on Canvas ---
            const canvases = bookContainer.querySelectorAll('canvas');
            for (let i = 0; i < canvases.length; i++) {
                const pageNum = i + 1;
                await renderPdfPage(pageNum, canvases[i], pageWidth, pageHeight);
            }

            // --- C. Initialize StPageFlip ---
            pageFlip = new StPageFlip(bookContainer, {
                width: pageWidth, // Base page width
                height: pageHeight, // Base page height
                size: "stretch", // Stretch to container size
                minWidth: pageWidth, maxWidth: pageWidth * 1.5,
                minHeight: pageHeight, maxHeight: pageHeight * 1.5,
                drawShadow: true, // Shadows are crucial for 3D feel
                flippingTime: 1000,
                usePortrait: isMobile, // Use portrait mode if screen is small
                startPage: 0,
                showCover: true, // Show hard cover
                mobileScrollSupport: false
            });

            // Load the pages into the library
            const pages = bookContainer.querySelectorAll('.page');
            pageFlip.loadFromHTML(pages);

            isBookReady = true;

            // Hide Preloader smooth fade
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => loadingOverlay.style.display = 'none', 500);
            }, 500);

        } catch (error) { console.error("PDF/Flip Load Error:", error); }
    }

    // Helper to create page elements
    function createPage(content, isHard) {
        const pageDiv = document.createElement("div");
        pageDiv.className = `page ${isHard ? '-hard' : ''}`;
        
        if (typeof content === 'number') {
            // Inner PDF Page: Add canvas
            const canvas = document.createElement("canvas");
            pageDiv.appendChild(canvas);
        } else if (content === 'front') {
            // Front Cover: Set dynamic background image
            const coverImg = new Image();
            coverImg.src = coverPath;
            coverImg.onload = () => pageDiv.style.backgroundImage = `url('${coverPath}')`;
            coverImg.onerror = () => pageDiv.style.backgroundColor = '#333'; // Dark default cover
        } else if (content === 'back') {
            // Back Cover: Blank & Dark
            pageDiv.style.backgroundColor = '#333'; 
        }
        
        bookContainer.appendChild(pageDiv);
    }

    // Helper to render PDF page on canvas
    async function renderPdfPage(pageNum, canvas, tw, th) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 }); // High quality zoom
        const context = canvas.getContext("2d");
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        await page.render({ canvasContext: context, viewport: viewport }).promise;
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
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  });

    // --- 5. Initialization ---
    setBackground();
    loadMusic();
    initSnowfall();
    loadPdfAndBuild();

    // Smart Resize (Orientation change)
    window.addEventListener("resize", debounce(() => { 
        if (!isFullscreenToggling && Math.abs(window.innerWidth - initialWidth) > 100) location.reload(); 
    }, 500));

    function debounce(fn, delay) { let t; return function() { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), delay); }; }
    function sanitizeName(value) { return value ? value.replace(/[^a-zA-Z0-9-_]/g, "") : ""; }

})();
