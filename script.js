const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");
const angleDisplay = document.getElementById("angle-display");
const resetButton = document.getElementById("reset-btn");
const closeCameraButton = document.getElementById("close-camera-btn");

let lastSmileTime = 0; // Tempo do último sorriso detectado
const smileDelay = 3000; // Delay aumentado para 3 segundos
const scanInterval = 2000; // **Leitura apenas a cada 2 segundos**

// Configuração do som de alerta
const alertSound = new Howl({
    src: ["static/beep.mp3"],
    volume: 0.5,
    html5: true,
});

// Ajusta tamanho do canvas para coincidir com o vídeo
videoElement.addEventListener("loadedmetadata", () => {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
});

// Converte coordenadas normalizadas para pixels reais
function toCanvasCoords(point) {
    return {
        x: point.x * canvasElement.width, 
        y: point.y * canvasElement.height
    };
}

// Função para exibir mensagens baseadas no índice de sorriso
function getSmileMessage(smileRatio) {
    if (smileRatio < 0.05) {
        return "Não vai ter nada! Esquece! Leva pro um xsalada e racha a conta. 😐";
    } else if (smileRatio >= 0.05 && smileRatio <= 0.20) {
        return "O pae acredita em você, pensa que es o milior! 🙂";
    } else {
        return "Sorriu? Mandioca no bombril! 😃";
    }
}

// Variável para armazenar os últimos resultados do MediaPipe
let latestResults = null;

// Salva os resultados para serem processados a cada 2 segundos
function onResults(results) {
    latestResults = results; // Apenas armazena os resultados
}

// Desenha landmarks faciais e detecta sorriso a cada 2 segundos
function processSmileDetection() {
    if (!latestResults) return; // Se não houver resultados ainda, não faz nada

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (latestResults.multiFaceLandmarks) {
        for (const landmarks of latestResults.multiFaceLandmarks) {
            const pTopLip = toCanvasCoords(landmarks[13]);
            const pBottomLip = toCanvasCoords(landmarks[14]);
            const pLeftMouth = toCanvasCoords(landmarks[308]);
            const pRightMouth = toCanvasCoords(landmarks[78]);

            // Desenha pontos da boca
            canvasCtx.fillStyle = "#00FFFF";
            [pTopLip, pBottomLip, pLeftMouth, pRightMouth].forEach((point) => {
                canvasCtx.beginPath();
                canvasCtx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                canvasCtx.fill();
            });

            // Calcula o índice de sorriso
            const mouthHeight = Math.abs(pTopLip.y - pBottomLip.y);
            const mouthWidth = Math.abs(pLeftMouth.x - pRightMouth.x);
            const smileRatio = mouthHeight / mouthWidth;

            // Aplica o delay na detecção
            const now = Date.now();
            if (smileRatio > 0.20 && now - lastSmileTime > smileDelay) {
                lastSmileTime = now;
                alertSound.play();
            }

            // Atualiza a exibição
            angleDisplay.innerHTML = `Índice de Sorriso: ${smileRatio.toFixed(2)}<br>${getSmileMessage(smileRatio)}`;
        }
    }
}

// Configuração do MediaPipe FaceMesh
const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
faceMesh.onResults(onResults); // Apenas armazena os resultados

// Inicia a câmera
const camera = new Camera(videoElement, { onFrame: async () => { await faceMesh.send({ image: videoElement }); }, width: 640, height: 480 });
camera.start();

// **Chama a função de detecção a cada 2 segundos**
setInterval(processSmileDetection, scanInterval);
