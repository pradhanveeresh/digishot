(function () {
  const flipbookEl = document.getElementById("flipbook");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const appBg = document.getElementById("app-bg"); // New Background Layer
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const musicToggleBtn = document.getElementById("musicToggle");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const audioEl = document.getElementById("bgMusic");

  const params = new URLSearchParams(window.location.search);
  const albumName = sanitizeName(params.get("album")) || "test";
  const musicName = sanitizeName(params.get("music")) || "ringtone";
  const bgName = sanitizeName(params.get("bg")) || "bg01"; // Default bg01

  const pdfPath = `./albums/${albumName}.pdf`;
  const musicPath = `./music/${musicName}.mp3`;
  const coverPath = `./assets/covers/${albumName}.jpg`; // Dynamic Cover Path

  let pdfDoc = null;
  let isMusicPlaying = false;
  let isBookReady = false;
  let initialWidth = window.innerWidth;
  let isFullscreenToggling = false;

  // --- 1. Background Logic (With Fallback) ---
  function initBackground() {
    const img = new Image();
    const primaryPath = `./assets/bg/${bgName}.jpg`;
    const defaultPath = `./assets/bg/bg01.jpg`;

    img.src = primaryPath;
    img.onload = () => appBg.style.backgroundImage = `url('${primaryPath}')`;
    img.onerror = () => appBg.style.backgroundImage = `url('${defaultPath}')`;
  }

  // --- 2. Snowfall Logic ---
  function initSnowfall() {
    if (window.particlesJS) {
      particlesJS("particles-js", {
        "particles": {
          "number": { "value": 45 },
          "color": { "value": "#ffffff" },
          "opacity": { "value": 0.5 },
          "size": { "value": 3 },
          "move": { "enable": true, "speed": 1.2, "direction": "bottom" }
        }
      });
    }
  }

  // --- Existing Listeners & Helpers ---
  const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
  fsEvents.forEach(evt => {
    document.addEventListener(evt, () => {
      isFullscreenToggling = true;
      setTimeout(() => { isFullscreenToggling = false; }, 1000);
    });
  });

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "./libs/pdf.worker.min.js";
  }

  prevBtn.addEventListener("click", () => { if (isBookReady) $(flipbookEl).turn("previous"); });
  nextBtn.addEventListener("click", () => { if (isBookReady) $(flipbookEl).turn("next"); });
  
  musicToggleBtn.addEventListener("click", async () => {
    try {
      if (isMusicPlaying) { audioEl.pause(); isMusicPlaying = false; musicToggleBtn.style.background = "rgba(255,255,255,0.1)"; }
      else { await audioEl.play(); isMusicPlaying = true; musicToggleBtn.style.background = "rgba(255,255,255,0.3)"; }
    } catch (e) {}
  });

  fullscreenBtn.addEventListener("click", () => {
    isFullscreenToggling = true;
    const elem = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  });

  // Init Calls
  initBackground();
  initSnowfall();
  loadMusic();
  loadPdfAndBuild();

  function sanitizeName(value) { return value ? value.replace(/[^a-zA-Z0-9-_]/g, "") : ""; }
  function loadMusic() { audioEl.src = musicPath; audioEl.load(); }

  // --- 3. Build Flipbook (Updated for Cover & Fallback) ---
  async function loadPdfAndBuild() {
    if (!window.pdfjsLib) return;
    try {
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      
      let bookWidth = winW * 0.94; 
      let bookHeight = bookWidth / 1.5; 
      if (bookHeight > winH * 0.88) {
        bookHeight = winH * 0.88;
        bookWidth = bookHeight * 1.5;
      }

      // Clear flipbook container for fresh start
      flipbookEl.innerHTML = '';

      // A. Add Front Cover (Dynamic Image)
      const frontCover = document.createElement("div");
      frontCover.className = "hard front-cover";
      frontCover.style.backgroundImage = `url('${coverPath}')`;
      frontCover.style.backgroundSize = "cover";
      flipbookEl.appendChild(frontCover);

      // B. Add PDF Pages
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page"; 
        const canvas = document.createElement("canvas");
        pageDiv.appendChild(canvas);
        flipbookEl.appendChild(pageDiv);
        await renderPdfPage(pageNum, canvas);
      }

      // C. Add Back Cover
      const backCover = document.createElement("div");
      backCover.className = "hard back-cover";
      backCover.style.backgroundColor = "#2c2e33";
      flipbookEl.appendChild(backCover);

      // Initialize TurnJS
      $(flipbookEl).turn({
        width: bookWidth,
        height: bookHeight,
        autoCenter: true,
        display: "double",
        acceleration: true,
        duration: 1000,
        gradients: true
      });

      isBookReady = true;
      $(loadingOverlay).fadeOut(500);

      window.addEventListener("resize", debounce(() => { 
        if (!isFullscreenToggling && Math.abs(window.innerWidth - initialWidth) > 100) location.reload(); 
      }, 500));

    } catch (e) { 
        console.error(e); 
        loadingOverlay.innerHTML = `<h3 style="color:white; text-align:center;">Album Not Found!<br>Check albums/${albumName}.pdf</h3>`;
    }
  }

  async function renderPdfPage(pageNum, canvas) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 }); 
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    await page.render({ canvasContext: context, viewport: viewport }).promise;
  }

  function debounce(fn, delay) {
    let t; return function() { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), delay); };
  }
})();
