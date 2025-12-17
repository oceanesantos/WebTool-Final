// -------------------------------
// VARIABLES GLOBALES
// -------------------------------
let items = [];
let angle = 0;
let radius = 400;
let autoplay = true;
let rotSpeed = 0.6;
let zoomFactor = 1;
let bgColor = "#000000";
let sound = null;

let dragging = false;
let lastX = 0;

let mediaRecorder, recordedChunks = [];
let canvas;

// 🔥 Inclinaison
let tiltAngle = 0;

// UI p5
let fileInput, audioInput, autoplayInput, speedInput, zoomInput, bgColorInput;
let startRecBtn, stopRecBtn, tiltSlider;
let audioBtn;
let fileListDiv;
let selectedFiles = new Set();

// Web Audio pour mix
let audioCtx;
let destStream;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  angleMode(DEGREES);
  noStroke();

  injectGlassStyles();
  setupUI();

  canvas.mousePressed(() => {
    dragging = true;
    lastX = mouseX;
  });
  canvas.mouseReleased(() => dragging = false);

  canvas.elt.addEventListener("wheel", e => {
    zoomFactor = constrain(zoomFactor - e.deltaY * 0.001, 0.6, 2);
    zoomInput.value(zoomFactor);
  });

  let titleDiv = createDiv("Fais ton propre carrousel rotatif en 3D !");
  titleDiv.position(windowWidth / 2, 20);
  titleDiv.style('transform', 'translateX(-50%)');
  titleDiv.style('color', 'white');
  titleDiv.style('font-size', '35px');
  titleDiv.style('font-family', 'outfit, sans-serif');
  titleDiv.style('font-weight', 'bold');
  titleDiv.style('text-shadow', '1px 2px 8px rgba(0,0,0,0.7)');
  titleDiv.style('pointer-events', 'none');

  // Initialiser Web Audio
  audioCtx = getAudioContext();
}

function draw() {
  background(bgColor);
  push();
  scale(zoomFactor);
  rotateX(tiltAngle);

  if (autoplay && !dragging) angle += rotSpeed;
  if (dragging) {
    angle += (mouseX - lastX) * 0.3;
    lastX = mouseX;
  }

  let n = items.length;
  if (n === 0) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("Importe des images ou vidéos pour lancer le carrousel", 0, 0);
    pop();
    return;
  }

  for (let i = 0; i < n; i++) {
    let a = angle + i * (360 / n);
    let x = cos(a) * radius;
    let z = sin(a) * radius;

    push();
    translate(x, 0, z);
    rotateY(-a - 90);

    let img = items[i];
    let maxW = 300, maxH = 200;
    let w = img.width, h = img.height;
    let scaleFactor = min(maxW / w, maxH / h);
    w *= scaleFactor;
    h *= scaleFactor;

    texture(img);
    plane(w, h);
    pop();
  }

  pop();
}

// ------------------------------
// IMPORT FICHIERS (Images/Vidéos)
function handleFiles(files) {
  if (!files || !files.file) return;
  let f = files.file;
  let url = URL.createObjectURL(f);

  if (f.type.startsWith("image/")) {
    loadImage(url, img => {
      items.push(img);
      selectedFiles.add(img);
      updateFileList();
    });
  } else if (f.type.startsWith("video/")) {
    let vid = createVideo(url);
    vid.hide();
    vid.loop();
    vid.volume(1);
    items.push(vid);
    selectedFiles.add(vid);
    updateFileList();
  }
}

// ------------------------------
// Mettre à jour la liste des fichiers pour sélection
function updateFileList() {
  fileListDiv.html('');
  items.forEach((item, i) => {
    let div = createDiv((item.elt?.tagName === "VIDEO" ? "Vidéo " : "Image ") + (i+1))
      .parent(fileListDiv)
      .style('display','flex')
      .style('justify-content','space-between')
      .style('align-items','center')
      .style('padding','4px 0')
      .style('color','white');

    let checkbox = createCheckbox("", selectedFiles.has(item))
      .parent(div)
      .style('accent-color', 'white')
      .changed(() => {
        if (checkbox.checked()) selectedFiles.add(item);
        else selectedFiles.delete(item);
      });
  });
}

// ------------------------------
// SUPPRIMER LES FICHIERS SÉLECTIONNÉS
function removeSelectedFiles() {
  items = items.filter(item => !selectedFiles.has(item));
  selectedFiles.clear();
  updateFileList();
}

// ------------------------------
// IMPORT AUDIO
function handleAudioFile(file) {
  if (!file || !file.file) return;
  let f = file.file;
  let url = URL.createObjectURL(f);

  if (f.type.startsWith("audio/")) {
    items.forEach(item => {
      if (item.elt && item.elt.tagName === "VIDEO") item.volume(0);
    });

    if (sound) sound.stop();
    sound = loadSound(url, () => {
      sound.setLoop(true);
      let src = audioCtx.createMediaElementSource(sound.elt);
      if (destStream) src.connect(destStream);
      else {
        destStream = audioCtx.createMediaStreamDestination();
        src.connect(destStream);
      }

      if (autoplay) {
        sound.play();
        audioBtn.html("⏸️");
      } else {
        audioBtn.html("▶️");
      }
    });
  }
}

// ------------------------------
// ENREGISTREMENT VIDÉO + AUDIO MIX
function startRecording() {
  if (!canvas) return;
  const canvasStream = canvas.elt.captureStream(30);
  let combinedStream = canvasStream;

  if (destStream) {
    destStream.stream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
  }

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = exportVideo;
  mediaRecorder.start();

  startRecBtn.attribute("disabled", "");
  startRecBtn.style('background', '#888');
  stopRecBtn.removeAttribute("disabled");
  stopRecBtn.style('background', '#ff5c5c');
}

function stopRecording() {
  mediaRecorder.stop();
  stopRecBtn.attribute("disabled", "");
  stopRecBtn.style('background', '#888');
  startRecBtn.removeAttribute("disabled");
  startRecBtn.style('background', '#ff5c5c');
}

function exportVideo() {
  const blob = new Blob(recordedChunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  let a = createA(url, "carousel_capture.webm");
  a.attribute("download", "carousel_capture.webm");
  a.hide();
  a.elt.click();
  URL.revokeObjectURL(url);
}

// ------------------------------
// UI
function setupUI() {
  let uiPanel = createDiv();
  uiPanel.position(20, 20);
  uiPanel.size(280, windowHeight - 40);
  uiPanel.style('background', 'rgba(255, 255, 255, 0.05)');
  uiPanel.style('padding', '20px');
  uiPanel.style('border-radius', '16px');
  uiPanel.style('backdrop-filter', 'blur(20px)');
  uiPanel.style('color', 'white');
  uiPanel.style('font-family', 'Arial, sans-serif');
  uiPanel.style('overflow-y', 'auto');

  // --- Import média + bouton supprimer ---
  let importLine = createDiv().parent(uiPanel)
    .style('display','flex')
    .style('align-items','center')
    .style('margin-bottom','15px')
    .style('gap','5px');

  // Masquer le vrai input et créer un bouton stylé
  fileInput = createFileInput(handleFiles, true)
    .parent(importLine)
    .style('display','none');
  let importBtn = createButton("📁 Importer médias").parent(importLine).class('glass-button');
  importBtn.mousePressed(() => fileInput.elt.click());

  let clearBtn = createButton("✖").parent(importLine).class('glass-button');
  clearBtn.mousePressed(() => {
    items = [];
    selectedFiles.clear();
    updateFileList();
    fileInput.elt.value = "";
  });

  // Liste fichiers
  fileListDiv = createDiv().parent(uiPanel).style('margin-bottom','10px');

  // Supprimer sélection
  let removeSelectedBtn = createButton("🗑️ Retirer sélection").parent(uiPanel).class('glass-button');
  removeSelectedBtn.style('width','100%').style('margin-bottom','15px');
  removeSelectedBtn.mousePressed(removeSelectedFiles);

  // Import audio
  audioInput = createFileInput(handleAudioFile, false).parent(uiPanel).style('display','none');
  let importAudioBtn = createButton("🎵 Importer son").parent(uiPanel).class('glass-button');
  importAudioBtn.style('width','100%').style('margin-bottom','10px');
  importAudioBtn.mousePressed(() => audioInput.elt.click());

  // Play/Pause audio
  audioBtn = createButton("▶️").parent(uiPanel).class('glass-button');
  audioBtn.style('width', '40px').style('height', '40px').style('margin-bottom','20px');
  audioBtn.mousePressed(() => {
    if (!sound) return;
    if (sound.isPlaying()) {
      sound.pause();
      audioBtn.html("▶️");
    } else {
      sound.play();
      audioBtn.html("⏸️");
    }
  });

  // Couleur fond
  createDiv("Couleur fond").parent(uiPanel).style('margin-bottom', '5px');
  bgColorInput = createColorPicker("#000000").parent(uiPanel);
  bgColorInput.input(() => bgColor = bgColorInput.value());
  bgColorInput.style('width', '100%').style('margin-bottom', '15px');

  // Autoplay
  autoplayInput = createCheckbox("Autoplay", true).parent(uiPanel);
  autoplayInput.style('margin-bottom','15px');
  autoplayInput.changed(() => {
    autoplay = autoplayInput.checked();
    if (sound) {
      if (autoplay && !sound.isPlaying()) sound.play();
      if (!autoplay && sound.isPlaying()) sound.pause();
    }
  });

  // Vitesse rotation
  createDiv("Vitesse rotation").parent(uiPanel).style('margin-bottom', '5px');
  speedInput = createSlider(0, 5, 0.6, 0.1).parent(uiPanel);
  speedInput.input(() => rotSpeed = speedInput.value());
  speedInput.style('width', '100%').style('margin-bottom', '15px');

  // Zoom
  createDiv("Zoom").parent(uiPanel).style('margin-bottom', '5px');
  zoomInput = createSlider(0.6, 2, 1, 0.05).parent(uiPanel);
  zoomInput.input(() => zoomFactor = zoomInput.value());
  zoomInput.style('width', '100%').style('margin-bottom', '15px');

  // Inclinaison
  createDiv("Inclinaison").parent(uiPanel).style('margin-bottom', '5px');
  tiltSlider = createSlider(-90, 90, 0, 1).parent(uiPanel);
  tiltSlider.input(() => tiltAngle = tiltSlider.value());
  tiltSlider.style('width', '100%').style('margin-bottom', '15px');

  // Enregistrement
  createDiv("Enregistrement").parent(uiPanel).style('margin-bottom', '5px');
  let recBtns = createDiv().parent(uiPanel);

  startRecBtn = createButton("🎥 Démarrer").parent(recBtns).class('glass-button');
  startRecBtn.mousePressed(startRecording);

  stopRecBtn = createButton("⏹️ Arrêter").parent(recBtns).class('glass-button');
  stopRecBtn.attribute("disabled", "");
  stopRecBtn.mousePressed(stopRecording);

  [startRecBtn, stopRecBtn].forEach(btn => btn.style('margin-right','10px'));
}

// ------------------------------
// Responsive
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ------------------------------
// Injecter CSS glassmorphism
function injectGlassStyles() {
  const css = `
    .glass-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px;
      padding: 8px 14px;
      color: white !important;
      font-size: 16px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: background 0.3s, transform 0.2s;
    }
    .glass-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.03);
    }
    .glass-button:active {
      background: rgba(255,255,255,0.3);
      transform: scale(0.98);
    }
  `;
  let style = createElement('style', css);
  style.parent(document.head);
}
