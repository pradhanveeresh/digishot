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
  
  // Screen reload block karne ke liye naye variables
  let initialWidth = window.innerWidth;
  let isFullscreenToggling = false;

  // Fullscreen change detect karne ke liye listeners (Button ya ESC key)
  const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
  fsEvents.forEach(evt => {
    document.addEventListener(evt, () => {
      isFullscreenToggling = true;
      // 1.5 second tak page reload ko poori tarah block rakhega
      setTimeout(() => { isFullscreenToggling = false; }, 1500);
    });
  });

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
        musicToggleBtn.style.background = "#444444";
      } else {
        await audioEl.play();
        isMusicPlaying = true;
        musicToggleBtn.style.background = "#777777"; 
      }
    } catch (err) { console.log(err); }
  });

  // PERFECT FULLSCREEN LOGIC
  fullscreenBtn.addEventListener("click", () => {
    isFullscreenToggling = true;
    setTimeout(() => { isFullscreenToggling = false; }, 1500);

    const elem = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
      if (elem.requestFullscreen) { elem.requestFullscreen(); }
      else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); }
      else if (elem.mozRequestFullScreen) { elem.mozRequestFullScreen(); }
    } else {
      if (document.exitFullscreen) { document.exitFullscreen(); }
      else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
      else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
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

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight - 80; 
      
      let bookWidth = screenWidth * 0.95; 
      let bookHeight = bookWidth * 0.65;  
      
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
        display: "double",
        duration: 1000
      });

      isBookReady = true;

      setTimeout(() => {
        loadingOverlay.style.opacity = "0";
        setTimeout(() => { loadingOverlay.style.display = "none"; }, 500);
      }, 500);

      // SMART RESIZE FIX
      window.addEventListener("resize", debounce(() => { 
        // Agar fullscreen ho raha hai ya already fullscreen mode me hai, to reload BLOCK karo
        if (isFullscreenToggling || document.fullscreenElement || document.webkitFullscreenElement) {
          return; 
        }
        
        // Sirf tab reload karo jab screen ki chaurai (width) sach me badle (jaise phone rotate karne par)
        if (Math.abs(window.innerWidth - initialWidth) > 50) {
          location.reload(); 
        }
      }, 500));

    } catch (error) {
      console.error(error);
    }
  }

  async function renderPdfPage(pageNum, canvas, targetWidth) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 }); 
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
