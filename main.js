let recorder = null;
let analyser = null;
let visualizer = null;
let animationFrameID = null;

const colorListening = 'rgb(200,200,50)';
const colorRecording = 'rgb(200,50,50)';
const colorPlaying = 'rgb(50,200,50)';
let barColor = colorListening;

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

    this.ctx.fillStyle = barColor;

    for (let f of dataArray) {
      barHeight = f * this.height / 256;
      this.ctx.fillRect(x, this.height-barHeight, barWidth, barHeight);
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
    source.connect(this.analyser);
    this.analyser.fftSize = 256; // default 2048 (number of bars)

    // console.log(this.analyser.fftSize);
    // console.log(this.analyser.frequencyBinCount);
    // console.log(this.analyser.minDecibels);
    // console.log(this.analyser.maxDecibels);

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