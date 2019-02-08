let recorder = null;
let analyser = null;
let visualizer = null;
let animationFrameID = null;

const barCount = 32;

let barColor = null;
const colorListening = 'rgb(200,200,50)';
const colorRecording = 'rgb(200,50,50)';
const colorPlaying = 'rgb(50,200,50)';
const colorBackground = 'rgb(0, 0, 0)';
const labelColor = 'rgb(255, 255, 255)';
const labelFont = '14px sans-serif';
const lineHeight = 20;

class Visualizer {
  constructor(canvasID) {
    const canvas = document.getElementById(canvasID);
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');
    this.graphOffsetX = 40;
    this.graphOffsetY = 20;
    this.graphWidth = this.width - this.graphOffsetX;
    this.graphHeight = this.height - this.graphOffsetY;
  }

  clear() {
    this.ctx.fillStyle = colorBackground;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.font = labelFont;
    this.ctx.fillStyle = labelColor;
    let vol = 0;
    for(let y = 0; y < this.graphHeight; y += lineHeight) {
      vol = Math.floor(y / this.graphHeight * 256)
      this.ctx.fillText(vol.toString(), 2, this.graphHeight - y);
    }
  }

  graph(dataArray) {
    this.clear();

    const barWidth = (this.graphWidth / dataArray.length) - 1;

    this.ctx.font = labelFont;
    this.ctx.fillStyle = labelColor;
    let f = 1;
    for(let x = 0; x < this.graphWidth; x += (barWidth+1)) {
      this.ctx.fillText(f.toString(), this.graphOffsetX + x, this.height - 2);
      f++;
    }

    let barHeight = 0;
    let x = this.graphOffsetX;
    this.ctx.fillStyle = barColor;

    for (let f of dataArray) {
      barHeight = f * (this.height - this.graphOffsetY) / 256;
      this.ctx.fillRect(x, this.height-this.graphOffsetY-barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
}

class Analyser {
  constructor() {
    this.audioCtx = new window.webkitAudioContext();
  }

  fromStream(stream) {
    this.analyser = this.audioCtx.createAnalyser();
    const source = this.audioCtx.createMediaStreamSource(stream);
    this._connectSource(source)
  }

  fromMediaElement(mediaElement) {
    this.analyser = this.audioCtx.createAnalyser();
    const source = this.audioCtx.createMediaElementSource(mediaElement);
    this._connectSource(source)
  }

  _connectSource(source) {
    this.analyser.fftSize = barCount * 2;
    source.connect(this.analyser);

    console.log(`fftSize ${this.analyser.fftSize}`);
    console.log(`frequencyBinCount ${this.analyser.frequencyBinCount}`);
    console.log(`minDecibels ${this.analyser.minDecibels}`);
    console.log(`maxDecibels ${this.analyser.maxDecibels}`);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  getFrequencyData() {
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }
}

async function getMicrophone() {
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
  return navigator.mediaDevices.getUserMedia(constraints);
}

function visualize() {
  animationFrameID = requestAnimationFrame(visualize);
  const dataArray = analyser.getFrequencyData();
  visualizer.graph(dataArray);
}

function startRecording(stream) {
  recordButton.disabled = true;
  stopButton.disabled = false;

  barColor = colorRecording;
  recorder = new MediaRecorder(stream);
  recorder.addEventListener('dataavailable', onRecordingReady);
  recorder.start();
}

function stopRecording() {
  recordButton.disabled = false;
  stopButton.disabled = true;
  recorder.stop();
  barColor = colorListening;
  // cancelAnimationFrame(animationFrameID);
}

function onRecordingReady(e) {
  const audio = document.getElementById('audio');
  audio.src = URL.createObjectURL(e.data);
  audio.style.display = 'block';
}

window.onload = function () {
  analyser = new Analyser();
  const audioControl = document.getElementById('audio');
  const micButton = document.getElementById('microphone');
  recordButton = document.getElementById('record');
  stopButton = document.getElementById('stop');
  visualizer = new Visualizer('canvas');

  micButton.addEventListener('click', async () => {
    const microphone = await getMicrophone();
    micButton.style.display = 'none';
    document.getElementById('interface').style.display = 'block';
    analyser.fromStream(microphone);
    barColor = colorListening;
    visualize();

    recordButton.addEventListener('click', () => startRecording(microphone));
    stopButton.addEventListener('click', stopRecording);
    audioControl.addEventListener('play', () => {
      console.log('play');
      analyser.fromMediaElement(audioControl);
      barColor = colorPlaying;
    });
    audioControl.addEventListener('ended', () => {
      console.log('ended');
      analyser.fromStream(microphone);
      barColor = colorListening;
    });
    recordButton.disabled = false;
  });
}