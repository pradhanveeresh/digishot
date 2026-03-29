<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>DigiShot Premium TurnJS</title>
    
    <link rel="stylesheet" href="./style.css">

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="./libs/turn.min.js"></script>
    <script src="./libs/pdf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
</head>
<body>

    <div id="app-bg" class="app-background"></div>
    <div id="particles-js"></div>

    <div id="loadingOverlay" class="loading-overlay">
        <div class="logo-circle">
            <span class="text-digi">DIGI</span>
            <span class="text-shot">SHOT</span>
        </div>
    </div>

    <div class="app-shell">
        <div class="viewer-area">
            <div id="flipbook"></div>
        </div>

        <div class="bottom-bar-left">
            <button id="prevBtn" class="control-btn">◀</button>
            <button id="nextBtn" class="control-btn">▶</button>
            <button id="musicToggle" class="control-btn">🎵</button>
            <button id="fullscreenBtn" class="control-btn">⛶</button>
        </div>
    </div>

    <audio id="bgMusic" loop></audio>
    <script src="./script.js"></script>
</body>
</html>
