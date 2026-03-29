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

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "./libs/pdf.worker.min.js";
  }

  // --- Buttons Logic ---
  prevBtn.addEventListener("click", () => { if (isBookReady) $(flipbookEl).turn("previous"); });
  nextBtn.addEventListener("click", () => { if (isBookReady) $(flipbookEl).turn("next"); });

  musicToggleBtn.addEventListener("click", async () => {
    if (!audioEl.src) return;
    try {
      if (isMusicPlaying) {
        audioEl.pause();
        isMusicPlaying = false;
        musicToggleBtn.style.background = "#444";
      } else {
        await audioEl.play();
        isMusicPlaying = true;
        musicToggleBtn.style.background = "#777"; // Highlight when playing
      }
    } catch (err) { console.log(err); }
  });

  // Cross-browser Fullscreen fix
  fullscreenBtn.addEventListener("click", () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (elem.requestFullscreen) { elem.requestFullscreen(); }
      else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); }
      else if (elem.mozRequestFullScreen) { elem.mozRequestFullScreen(); }
      else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT); }
    } else {
      if (document.exitFullscreen) { document.exitFullscreen(); }
      else if (document.msExitFullscreen) { document.msExitFullscreen(); }
      else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
      else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
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

      if (!totalPages) return;

      // Laptop and Mobile SAME VIEW (Force Double Page)
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight - 60; // Niche wali bar ke liye jagah chhodi
      
      let bookWidth = screenWidth * 0.95; // Screen ka 95% width lega
      let bookHeight = bookWidth * 0.65;  // 2 pages ke hisaab se height
      
      if (bookHeight > screenHeight * 0.85) {
        bookHeight = screenHeight * 0.85;
        bookWidth = bookHeight / 0.65;
      }

      const pageWidth = bookWidth / 2;
      const backCover = document.querySelector('.back-cover');

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page normal-page"; 
        pageDiv.style.backgroundColor = "#fff";

        const canvas = document.createElement("canvas");
        pageDiv.appendChild(canvas);
        
        flipbookEl.insertBefore(pageDiv, backCover);
        await renderPdfPage(pageNum, canvas, pageWidth);
      }

      $(flipbookEl).turn({
        width: bookWidth,
        height: bookHeight,
        autoCenter: true,
        elevation: 50,
        gradients: true,
        display: "double", // ALWAYS DOUBLE DISPLAY
        duration: 1000
      });

      isBookReady = true;

      // Smooth Preloader Fade Out
      setTimeout(() => {
        loadingOverlay.style.opacity = "0";
        setTimeout(() => { loadingOverlay.style.display = "none"; }, 500);
      }, 500);

      window.addEventListener("resize", debounce(() => { location.reload(); }, 500));

    } catch (error) {
      console.error(error);
    }
  }

  async function renderPdfPage(pageNum, canvas, targetWidth) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 }); // Good quality zoom
    const context = canvas.getContext("2d");
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    await page.render({ canvasContext: context, viewport: viewport }).promise;
  }

  function debounce(fn, delay) {
    let timeout;
    return function () { clearTimeout(timeout); timeout = setTimeout(() => fn.apply(this, arguments), delay); };
  }
})();
