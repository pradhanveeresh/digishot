(function () {
  const flipbookEl = document.getElementById("flipbook");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const musicToggleBtn = document.getElementById("musicToggle");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const audioEl = document.getElementById("bgMusic");

  const params = new URLSearchParams(window.location.search);
  const albumName = sanitizeName(params.get("album")) || "test";
  const musicName = sanitizeName(params.get("music")) || "ringtone";

  const pdfPath = `./albums/${albumName}.pdf`;
  const musicPath = `./music/${musicName}.mp3`;

  let pdfDoc = null;
  let totalPages = 0;
  let isMusicPlaying = false;
  let isBookReady = false;
  let initialWidth = window.innerWidth;
  let isFullscreenToggling = false;

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

  // Button Listeners
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

  loadMusic();
  loadPdfAndBuild();

  function sanitizeName(value) { return value ? value.replace(/[^a-zA-Z0-9-_]/g, "") : ""; }
  function loadMusic() { audioEl.src = musicPath; audioEl.load(); }

  async function loadPdfAndBuild() {
    if (!window.pdfjsLib) return;
    try {
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;

      // ALBUM SIZE (Ab niche ki patti ka area bhi album use karega)
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      
      let bookWidth = winW * 0.96; 
      let bookHeight = bookWidth / 1.5; // Double page ratio
      
      // Agar height screen se bahar ja rahi ho to adjust karein
      if (bookHeight > winH * 0.92) {
        bookHeight = winH * 0.92;
        bookWidth = bookHeight * 1.5;
      }

      const pageWidth = bookWidth / 2;
      const backCover = document.querySelector('.back-cover');

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page"; 
        const canvas = document.createElement("canvas");
        pageDiv.appendChild(canvas);
        flipbookEl.insertBefore(pageDiv, backCover);
        await renderPdfPage(pageNum, canvas, pageWidth);
      }

      $(flipbookEl).turn({
        width: bookWidth,
        height: bookHeight,
        autoCenter: true,
        display: "double",
        acceleration: true,
        duration: 800
      });

      isBookReady = true;
      loadingOverlay.style.display = "none";

      window.addEventListener("resize", debounce(() => { 
        if (!isFullscreenToggling && Math.abs(window.innerWidth - initialWidth) > 100) location.reload(); 
      }, 500));

    } catch (e) { console.error(e); }
  }

  async function renderPdfPage(pageNum, canvas, targetWidth) {
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
