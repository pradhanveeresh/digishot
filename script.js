(function () {
  const flipbookEl = document.getElementById("flipbook");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const albumTitleEl = document.getElementById("albumTitle");
  const pageInfoEl = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const musicToggleBtn = document.getElementById("musicToggle");
  const musicLabelEl = document.getElementById("musicLabel");
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

  // IMPORTANT: PDF.js worker
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "./libs/pdf.worker.min.js";
  }

  // Initial title
  albumTitleEl.textContent = formatAlbumTitle(albumName);

  // Setup controls
  prevBtn.addEventListener("click", () => {
    if (isBookReady) $("#flipbook").turn("previous");
  });

  nextBtn.addEventListener("click", () => {
    if (isBookReady) $("#flipbook").turn("next");
  });

  copyLinkBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyLinkBtn.textContent = "Copied!";
      setTimeout(() => {
        copyLinkBtn.textContent = "Copy Link";
      }, 1600);
    } catch (err) {
      alert("Could not copy link automatically. Please copy it manually.");
    }
  });

  musicToggleBtn.addEventListener("click", async () => {
    if (!audioEl.src) return;

    try {
      if (isMusicPlaying) {
        audioEl.pause();
        isMusicPlaying = false;
        musicToggleBtn.textContent = "🔇 Play Music";
        musicLabelEl.textContent = `Music: ${musicName} (paused)`;
      } else {
        await audioEl.play();
        isMusicPlaying = true;
        musicToggleBtn.textContent = "🔊 Pause Music";
        musicLabelEl.textContent = `Music: ${musicName} (playing)`;
      }
    } catch (err) {
      musicLabelEl.textContent = "Music blocked by browser. Tap again.";
    }
  });

  // Start loading
  loadMusic();
  loadPdfAndBuild();

  function sanitizeName(value) {
    if (!value) return "";
    return value.replace(/[^a-zA-Z0-9-_]/g, "");
  }

  function formatAlbumTitle(slug) {
    return slug
      .split("-")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function showError(message) {
    loadingOverlay.style.display = "none";
    flipbookEl.style.display = "block";
    flipbookEl.innerHTML = `<div class="error-box">${message}</div>`;
  }

  function loadMusic() {
    audioEl.src = musicPath;
    audioEl.load();

    audioEl.addEventListener("error", () => {
      musicLabelEl.textContent = `Music not found: ${musicName}.mp3`;
      musicToggleBtn.disabled = true;
      musicToggleBtn.style.opacity = "0.6";
      musicToggleBtn.style.cursor = "not-allowed";
    });

    audioEl.addEventListener("canplaythrough", () => {
      musicLabelEl.textContent = `Music ready: ${musicName}`;
    }, { once: true });
  }

  async function loadPdfAndBuild() {
    if (!window.pdfjsLib) {
      showError("PDF.js library not loaded.");
      return;
    }

    try {
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;

      if (!totalPages) {
        showError("This PDF has no pages.");
        return;
      }

      const isMobile = window.innerWidth < 768;
      const pageWidth = isMobile ? Math.min(window.innerWidth - 50, 360) : 500;
      const pageHeight = isMobile ? Math.round(pageWidth * 1.35) : 680;

      // For desktop: 2 pages side by side
      // For mobile: single page view
      const bookWidth = isMobile ? pageWidth : pageWidth * 2;
      const bookHeight = pageHeight;

      flipbookEl.innerHTML = "";

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page";
        pageDiv.style.width = `${pageWidth}px`;
        pageDiv.style.height = `${pageHeight}px`;

        const canvas = document.createElement("canvas");
        pageDiv.appendChild(canvas);
        flipbookEl.appendChild(pageDiv);

        await renderPdfPage(pageNum, canvas, pageWidth);
      }

      flipbookEl.style.width = `${bookWidth}px`;
      flipbookEl.style.height = `${bookHeight}px`;
      flipbookEl.style.display = "block";

      // Destroy if already exists (safe reload case)
      if ($("#flipbook").data("turn")) {
        $("#flipbook").turn("destroy");
      }

      $("#flipbook").turn({
        width: bookWidth,
        height: bookHeight,
        autoCenter: true,
        elevation: 50,
        gradients: true,
        display: isMobile ? "single" : "double",
        when: {
          turned: function (event, page) {
            updatePageInfo(page);
          }
        }
      });

      isBookReady = true;
      updatePageInfo(1);
      loadingOverlay.style.display = "none";

      // Resize support
      window.addEventListener("resize", debounce(() => {
        rebuildOnResize();
      }, 400));

    } catch (error) {
      console.error("PDF load/render error:", error);
      showError(
        `Could not load album <strong>${albumName}.pdf</strong>.<br><br>
         Check file path: <strong>albums/${albumName}.pdf</strong>`
      );
    }
  }

  async function renderPdfPage(pageNum, canvas, targetWidth) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });

    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const context = canvas.getContext("2d");
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;
  }

  function updatePageInfo(currentPage) {
    if (!totalPages) {
      pageInfoEl.textContent = "Page 0 / 0";
      return;
    }

    pageInfoEl.textContent = `Page ${currentPage} / ${totalPages}`;
  }

  function rebuildOnResize() {
    // Simple safe reload to keep layout stable on orientation change / resize
    if (!pdfDoc) return;
    location.reload();
  }

  function debounce(fn, delay) {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }
})();
// ===== Mobile swipe support (add at end of script.js) =====
(function () {
  let startX = 0;
  let endX = 0;

  function safeNext() {
    try {
      if (typeof goNext === "function") return goNext();
      if (window.jQuery && $("#flipbook").data("turn")) $("#flipbook").turn("next");
    } catch (e) {}
  }

  function safePrev() {
    try {
      if (typeof goPrev === "function") return goPrev();
      if (window.jQuery && $("#flipbook").data("turn")) $("#flipbook").turn("previous");
    } catch (e) {}
  }

  function attachSwipe() {
    const target =
      document.querySelector(".flipbook-shell") ||
      document.getElementById("flipbook") ||
      document.body;

    if (!target || target.dataset.swipeAttached === "yes") return;
    target.dataset.swipeAttached = "yes";

    target.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches || !e.touches.length) return;
        startX = e.touches[0].clientX;
      },
      { passive: true }
    );

    target.addEventListener(
      "touchend",
      function (e) {
        if (!e.changedTouches || !e.changedTouches.length) return;
        endX = e.changedTouches[0].clientX;

        const diff = startX - endX;
        const minSwipe = 35; // sensitivity

        if (Math.abs(diff) < minSwipe) return;

        if (diff > 0) {
          // swipe left = next
          safeNext();
        } else {
          // swipe right = previous
          safePrev();
        }
      },
      { passive: true }
    );
  }

  // try immediately
  attachSwipe();

  // try again after flipbook loads
  setTimeout(attachSwipe, 800);
  setTimeout(attachSwipe, 1500);
})();
