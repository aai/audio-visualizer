let recorder = null;
let analyser = null;
let visualizer = null;
let animationFrameID = null;

class Visualizer {
  constructor(canvasID) {
    const canvas = document.getElementById(canvasID);
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');
  }

  clear() {
    this.ctx.fillStyle = 'rgb(0, 0, 0)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  graph(dataArray) {
    this.clear();

    const barWidth = (this.width / dataArray.length) - 1;
    let barHeight = 0;
    let x = 0;

    for (let f of dataArray) {
      barHeight = f/4;
      this.ctx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
      this.ctx.fillRect(x, this.height-barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
}

class Analyser {
  constructor(stream) {
    const audioCtx = new window.webkitAudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256; // default 2048 (number of bars)

    console.log(analyser.fftSize);
    console.log(analyser.minDecibels);
    console.log(analyser.maxDecibels);

    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  getData() {
    this.analyser.getByteTimeDomainData(this.dataArray);
    return this.dataArray;
  }
}

async function getRecorder() {
  const constraints = {
    audio: {
      sampleRate: 48000,
      channelCount: 2,
      echoCancellation: false,
      noiseSuppression: false,
      volume: 1.0
    },
    video: false
  }
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  recorder = new MediaRecorder(stream);
  recorder.addEventListener('dataavailable', onRecordingReady);

  analyser = new Analyser(stream);
}

function visualize() {
  animationFrameID = requestAnimationFrame(visualize);
  const dataArray = analyser.getData();
  visualizer.graph(dataArray);
}

function startRecording() {
  recordButton.disabled = true;
  stopButton.disabled = false;
  recorder.start();
  visualize();
}

function stopRecording() {
  recordButton.disabled = false;
  stopButton.disabled = true;
  recorder.stop();
  cancelAnimationFrame(animationFrameID);
}

function onRecordingReady(e) {
  const audio = document.getElementById('audio');
  audio.src = URL.createObjectURL(e.data);
}

window.onload = function async () {
  getRecorder();

  visualizer = new Visualizer('canvas');

  recordButton = document.getElementById('record');
  stopButton = document.getElementById('stop');
  recordButton.addEventListener('click', startRecording);
  stopButton.addEventListener('click', stopRecording);
  recordButton.disabled = false;
}
