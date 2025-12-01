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

let dragging = false;
let lastX = 0;

let mediaRecorder, recordedChunks = [];
let canvas; // canvas global pour l'enregistrement

// UI p5
let fileInput, autoplayInput, speedInput, zoomInput, bgColorInput;
let startRecBtn, stopRecBtn;

function setup() {
  // ------------------------------
  // CANVAS
  // ------------------------------
  canvas = createCanvas(windowWidth, windowHeight, WEBGL); // plein écran
  angleMode(DEGREES);
  noStroke();

  // ------------------------------
  // UI P5 AMÉLIORÉE
  // ------------------------------
  setupUI();

  // ------------------------------
  // Dragging du carousel
  // ------------------------------
  canvas.mousePressed(() => {
    dragging = true;
    lastX = mouseX;
  });
  canvas.mouseReleased(() => dragging = false);

  // Zoom avec molette
  canvas.elt.addEventListener("wheel", e => {
    zoomFactor = constrain(zoomFactor - e.deltaY * 0.001, 0.6, 2);
    zoomInput.value(zoomFactor);
  });

  // ------------------------------
  // TITRE
  // ------------------------------
  let titleDiv = createDiv("Fais ton propre carrousel rotatif en 3D !");
  titleDiv.position(windowWidth / 2, 20);
  titleDiv.style('transform', 'translateX(-50%)');
  titleDiv.style('color', 'white');
  titleDiv.style('font-size', '40px');
  titleDiv.style('font-family', 'outfit, sans-serif');
  titleDiv.style('font-weight', 'bold');
  titleDiv.style('text-shadow', '1px 2px 8px rgba(0,0,0,0.7)');
  titleDiv.style('pointer-events', 'none');
}

function draw() {
  background(bgColor);

  push();
  scale(zoomFactor);
  rotateX(-10);

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

    // Calcul ratio pour ne pas étirer
    let maxW = 300;
    let maxH = 200;
    let w = img.width;
    let h = img.height;
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
// FILE IMPORT
// ------------------------------
function handleFiles(files) {
  if (!files || !files.file) return;

  let f = files.file;
  let url = URL.createObjectURL(f);

  if (f.type.startsWith("image/")) {
    loadImage(url, img => items.push(img));
  } else if (f.type.startsWith("video/")) {
    let vid = createVideo(url);
    vid.hide();
    vid.loop();
    items.push(vid);
  }
}

// ------------------------------
// RECORDING
// ------------------------------
function startRecording() {
  if (!canvas) {
    console.error("Canvas non trouvé !");
    return;
  }

  const stream = canvas.elt.captureStream(30);
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = exportVideo;
  mediaRecorder.start();

  // --- Boutons ---
  startRecBtn.attribute("disabled", "");
  startRecBtn.style('background', '#888'); // gris
  stopRecBtn.removeAttribute("disabled");
  stopRecBtn.style('background', '#ff5c5c'); // actif
}

function stopRecording() {
  mediaRecorder.stop();

  stopRecBtn.attribute("disabled", "");
  stopRecBtn.style('background', '#888'); // gris
  startRecBtn.removeAttribute("disabled");
  startRecBtn.style('background', '#ff5c5c'); // actif
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
// UI P5 AMÉLIORÉE
// ------------------------------
function setupUI() {
  // Conteneur principal
  let uiPanel = createDiv();
  uiPanel.position(20, 20);
  uiPanel.size(220, windowHeight - 40);
  uiPanel.style('background', 'rgba(30, 30, 30, 0.85)');
  uiPanel.style('padding', '15px');
  uiPanel.style('border-radius', '15px');
  uiPanel.style('box-shadow', '0 5px 20px rgba(0,0,0,0.5)');
  uiPanel.style('color', 'white');
  uiPanel.style('font-family', 'Arial, sans-serif');
  uiPanel.style('overflow-y', 'auto');

  // --- File Input ---
  createDiv("Importer média").parent(uiPanel).style('margin-bottom', '5px');
  fileInput = createFileInput(handleFiles, true).parent(uiPanel);
  fileInput.style('width', '100%').style('margin-bottom', '15px');

  // --- Background color ---
  createDiv("Couleur fond").parent(uiPanel).style('margin-bottom', '5px');
  bgColorInput = createColorPicker("#000000").parent(uiPanel);
  bgColorInput.input(() => bgColor = bgColorInput.value());
  bgColorInput.style('width', '100%').style('margin-bottom', '15px');

  // --- Autoplay ---
  autoplayInput = createCheckbox("Autoplay", true).parent(uiPanel);
  autoplayInput.changed(() => autoplay = autoplayInput.checked());
  autoplayInput.style('margin-bottom', '15px');

  // --- Rotation speed ---
  createDiv("Vitesse rotation").parent(uiPanel).style('margin-bottom', '5px');
  speedInput = createSlider(0, 5, 0.6, 0.1).parent(uiPanel);
  speedInput.input(() => rotSpeed = speedInput.value());
  speedInput.style('width', '100%').style('margin-bottom', '15px');

  // --- Zoom ---
  createDiv("Zoom").parent(uiPanel).style('margin-bottom', '5px');
  zoomInput = createSlider(0.6, 2, 1, 0.05).parent(uiPanel);
  zoomInput.input(() => zoomFactor = zoomInput.value());
  zoomInput.style('width', '100%').style('margin-bottom', '15px');

  // --- Recording Buttons ---
  let recDiv = createDiv("Enregistrement").parent(uiPanel).style('margin-bottom', '5px');
  let recBtns = createDiv().parent(uiPanel);

  startRecBtn = createButton("🎥 Démarrer").parent(recBtns);
  startRecBtn.mousePressed(startRecording);
  startRecBtn.style('margin-right', '10px');

  stopRecBtn = createButton("⏹️ Arrêter").parent(recBtns);
  stopRecBtn.attribute("disabled", "");
  stopRecBtn.style('background', '#888'); // grisé initialement
  stopRecBtn.mousePressed(stopRecording);

  // Style des boutons
  [startRecBtn, stopRecBtn].forEach(btn => {
    btn.style('padding', '8px 12px')
       .style('border', 'none')
       .style('border-radius', '8px')
       .style('color', 'white')
       .style('cursor', 'pointer')
       .mouseOver(() => {
         if (!btn.elt.disabled) btn.style('background', '#ff7b7b');
       })
       .mouseOut(() => {
         if (btn.elt.disabled) btn.style('background', '#888');
         else btn.style('background', '#ff5c5c');
       });
  });
}

// ------------------------------
// Redimensionnement dynamique
// ------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
