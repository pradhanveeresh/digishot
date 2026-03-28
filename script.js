(function () {
  const flipbookEl = document.getElementById("flipbook");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const albumTitleEl = document.getElementById("albumTitle");
  const coverTitleEl = document.getElementById("coverTitle");
  const pageInfoEl = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const musicToggleBtn = document.getElementById("musicToggle");
  const musicLabelEl = document.getElementById("musicLabel");
  const audioEl = document.getElementById("bgMusic");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  const introScene = document.getElementById("introScene");
  const viewerScene = document.getElementById("viewerScene");
  const enterAlbumBtn = document.getElementById("enterAlbumBtn");
  const closedAlbum = document.getElementById("closedAlbum");

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

  const formattedAlbum = formatAlbumTitle(albumName);
  albumTitleEl.textContent = formattedAlbum;
  coverTitleEl.textContent = formattedAlbum;

  setupControls();
  loadMusic();

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

  function setupControls() {
    enterAlbumBtn.addEventListener("click", openAlbumExperience);
    closedAlbum.addEventListener("click", openAlbumExperience);

    prevBtn.addEventListener("click", goPrev);
    nextBtn.addEventListener("click", goNext);

    copyLinkBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        const original = copyLinkBtn.textContent;
        copyLinkBtn.textContent = "Copied";
        setTimeout(() => (copyLinkBtn.textContent = original), 1400);
      } catch (err) {
        alert("Could not copy link automatically.");
      }
    });

    musicToggleBtn.addEventListener("click", async () => {
      if (!audioEl.src) return;

      try {
        if (isMusicPlaying) {
          audioEl.pause();
          isMusicPlaying = false;
          musicToggleBtn.textContent = "♫";
          musicLabelEl.textContent = `Music: ${musicName} (paused)`;
        } else {
          await audioEl.play();
          isMusicPlaying = true;
          musicToggleBtn.textContent = "❚❚";
          musicLabelEl.textContent = `Music: ${musicName} (playing)`;
        }
      } catch (err) {
        musicLabelEl.textContent = "Tap again to allow music";
      }
    });

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", toggleFullscreen);
    }

    window.addEventListener("keydown", (e) => {
      if (!isBookReady) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    });
  }

  async function openAlbumExperience() {
    introScene.classList.add("hidden");
    viewerScene.classList.remove("hidden");

    // Try autoplay after user click
    if (audioEl.src && !isMusicPlaying) {
      try {
        await audioEl.play();
        isMusicPlaying = true;
        musicToggleBtn.textContent = "❚❚";
        musicLabelEl.textContent = `Music: ${musicName} (playing)`;
      } catch (err) {}
    }

    if (!isBookReady) {
      loadPdfAndBuild();
    }
  }

  function loadMusic() {
    audioEl.src = musicPath;
    audioEl.load();

    audioEl.addEventListener("error", () => {
      musicLabelEl.textContent = `Music not found: ${musicName}.mp3`;
      musicToggleBtn.disabled = true;
      musicToggleBtn.style.opacity = "0.55";
      musicToggleBtn.style.cursor = "not-allowed";
    });

    audioEl.addEventListener(
      "canplaythrough",
      () => {
        musicLabelEl.textContent = `Music ready: ${musicName}`;
      },
      { once: true }
    );
  }

  function showError(message) {
    loadingOverlay.style.display = "none";
    flipbookEl.style.display = "block";
    flipbookEl.innerHTML = `<div class="error-box">${message}</div>`;
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

      // FIXED ALBUM INNER PAGE AREA
      // Outer album fixed, inner page area controlled here
      const pageAreaWidth = isMobile ? 320 : 920;
      const pageAreaHeight = isMobile ? 470 : 600;

      // Margins remain because page area is smaller than hardcover shell
      const singlePageWidth = isMobile ? pageAreaWidth : Math.floor(pageAreaWidth / 2);
      const singlePageHeight = pageAreaHeight;

      const bookWidth = isMobile ? singlePageWidth : singlePageWidth * 2;
      const bookHeight = singlePageHeight;

      flipbookEl.innerHTML = "";

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page";
        pageDiv.style.width = `${singlePageWidth}px`;
        pageDiv.style.height = `${singlePageHeight}px`;

        const canvas = document.createElement("canvas");
        pageDiv.appendChild(canvas);
        flipbookEl.appendChild(pageDiv);

        await renderPdfPageFit(pageNum, canvas, singlePageWidth, singlePageHeight);
      }

      flipbookEl.style.width = `${bookWidth}px`;
      flipbookEl.style.height = `${bookHeight}px`;
      flipbookEl.style.display = "block";

      if ($("#flipbook").data("turn")) {
        $("#flipbook").turn("destroy");
      }

      $("#flipbook").turn({
        width: bookWidth,
        height: bookHeight,
        autoCenter: true,
        elevation: 40,
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

      window.addEventListener(
        "resize",
        debounce(() => {
          if (pdfDoc) location.reload();
        }, 400)
      );

      attachSwipe();
    } catch (error) {
      console.error("PDF load/render error:", error);
      showError(
        `Could not load album <strong>${albumName}.pdf</strong>.<br><br>
         Check file path: <strong>albums/${albumName}.pdf</strong>`
      );
    }
  }

  // FIT page inside fixed frame while preserving margins
  async function renderPdfPageFit(pageNum, canvas, boxWidth, boxHeight) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });

    const scaleX = boxWidth / viewport.width;
    const scaleY = boxHeight / viewport.height;
    const scale = Math.min(scaleX, scaleY); // fit inside

    const scaledViewport = page.getViewport({ scale });

    const context = canvas.getContext("2d");
    canvas.width = boxWidth;
    canvas.height = boxHeight;

    context.fillStyle = "#fffdf9";
    context.fillRect(0, 0, boxWidth, boxHeight);

    const offsetX = (boxWidth - scaledViewport.width) / 2;
    const offsetY = (boxHeight - scaledViewport.height) / 2;

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      transform: [1, 0, 0, 1, offsetX, offsetY]
    }).promise;
  }

  function updatePageInfo(currentPage) {
    if (!totalPages) {
      pageInfoEl.textContent = "0 / 0";
      return;
    }

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      pageInfoEl.textContent = `${currentPage} / ${totalPages}`;
    } else {
      const leftPage = currentPage;
      const rightPage = Math.min(currentPage + 1, totalPages);

      if (currentPage >= totalPages) {
        pageInfoEl.textContent = `${currentPage} / ${totalPages}`;
      } else {
        pageInfoEl.textContent = `${leftPage}-${rightPage} / ${totalPages}`;
      }
    }
  }

  function goNext() {
    if (isBookReady) $("#flipbook").turn("next");
  }

  function goPrev() {
    if (isBookReady) $("#flipbook").turn("previous");
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {}
  }

  function debounce(fn, delay) {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }

  function attachSwipe() {
    let startX = 0;
    let endX = 0;

    const target =
      document.querySelector(".physical-album-shell") ||
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
        const minSwipe = 35;

        if (Math.abs(diff) < minSwipe) return;

        if (diff > 0) {
          goNext();
        } else {
          goPrev();
        }
      },
      { passive: true }
    );
  }
})();
