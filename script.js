(function () {
  // Elements ko select karna
  const flipbookEl = document.getElementById("flipbook");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const musicToggleBtn = document.getElementById("musicToggle");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const audioEl = document.getElementById("bgMusic");

  // URL se PDF aur Music ka naam lena (Ya default use karna)
  const params = new URLSearchParams(window.location.search);
  const albumName = sanitizeName(params.get("album")) || "test";
  const musicName = sanitizeName(params.get("music")) || "ringtone";

  const pdfPath = `./albums/${albumName}.pdf`;
  const musicPath = `./music/${musicName}.mp3`;

  let pdfDoc = null;
  let totalPages = 0;
  let isMusicPlaying = false;
  let isBookReady = false;

  // PDF.js worker setup
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "./libs/pdf.worker.min.js";
  }

  // --- Button Controls ---

  // 1. Previous & Next Page
  prevBtn.addEventListener("click", () => {
    if (isBookReady) $(flipbookEl).turn("previous");
  });

  nextBtn.addEventListener("click", () => {
    if (isBookReady) $(flipbookEl).turn("next");
  });

  // 2. Play/Pause Music
  musicToggleBtn.addEventListener("click", async () => {
    if (!audioEl.src) return;
    try {
      if (isMusicPlaying) {
        audioEl.pause();
        isMusicPlaying = false;
        musicToggleBtn.style.filter = "brightness(1)"; // Normal look
      } else {
        await audioEl.play();
        isMusicPlaying = true;
        musicToggleBtn.style.filter = "brightness(0.7)"; // Playing look
      }
    } catch (err) {
      console.log("Music error:", err);
    }
  });

  // 3. Full Screen Toggle
  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // Start initialization
  loadMusic();
  loadPdfAndBuild();

  // --- Helper Functions ---

  function sanitizeName(value) {
    if (!value) return "";
    return value.replace(/[^a-zA-Z0-9-_]/g, "");
  }

  function loadMusic() {
    audioEl.src = musicPath;
    audioEl.load();
  }

  // PDF Load aur Book Banane ka main function
  async function loadPdfAndBuild() {
    if (!window.pdfjsLib) {
      alert("PDF.js library not loaded.");
      return;
    }

    try {
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;

      if (!totalPages) {
        alert("This PDF has no pages.");
        return;
      }

      // Responsive Size Logic (Laptop jaisa Mobile me)
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Calculate book size keeping aspect ratio (e.g., 800x600 for double page)
      let bookWidth = screenWidth > 900 ? 1000 : screenWidth * 0.95;
      let bookHeight = bookWidth * 0.6; // 10:6 aspect ratio

      // Agar height screen se badi ho rahi hai, to height ke hisaab se adjust karein
      if (bookHeight > screenHeight * 0.75) {
        bookHeight = screenHeight * 0.75;
        bookWidth = bookHeight / 0.6;
      }

      const pageWidth = bookWidth / 2;
      const pageHeight = bookHeight;

      const backCover = document.querySelector('.back-cover');

      // PDF pages ko Front aur Back cover ke beech me daalna
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page"; 
        pageDiv.style.backgroundColor = "#fff";

        const canvas = document.createElement("canvas");
        pageDiv.appendChild(canvas);
        
        // Insert before the back cover
        flipbookEl.insertBefore(pageDiv, backCover);

        // Render PDF frame
        await renderPdfPage(pageNum, canvas, pageWidth);
      }

      // Turn.js initialize karna (FlipHTML5 jaisa smooth effect)
      $(flipbookEl).turn({
        width: bookWidth,
        height: bookHeight,
        autoCenter: true,
        elevation: 50, // 3D shadow effect
        gradients: true, // Smooth shading
        display: "double", // Hamesha dono pages dikhenge (Mobile me bhi)
        duration: 1200 // Thoda slow aur premium flip
      });

      isBookReady = true;

      // Book ready hone ke baad Preloader smooth fade-out hoga
      setTimeout(() => {
        loadingOverlay.style.transition = "opacity 0.6s ease";
        loadingOverlay.style.opacity = "0";
        setTimeout(() => {
          loadingOverlay.style.display = "none";
        }, 600);
      }, 500);

      // Screen size badalne par book adjust ho
      window.addEventListener("resize", debounce(() => {
        location.reload();
      }, 500));

    } catch (error) {
      console.error("Error loading PDF:", error);
      loadingOverlay.innerHTML = `<h3 style="color:white; text-align:center;">Could not load ${albumName}.pdf<br>Check if file exists!</h3>`;
    }
  }

  async function renderPdfPage(pageNum, canvas, targetWidth) {
    const page = await pdfDoc.getPage(pageNum);
    
    // High Quality Render ke liye scale badhaya gaya hai
    const viewport = page.getViewport({ scale: 2.0 }); 
    const context = canvas.getContext("2d");
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
  }

  function debounce(fn, delay) {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }

})();
