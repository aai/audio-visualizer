let analyser = null;
let visualizer = null;

const barCount = 32;

let barColor = null;
const colorListening = 'rgb(200,200,50)';
const colorBackground = 'rgb(0, 0, 0)';
const labelColor = 'rgb(255, 255, 255)';
const labelFont = '14px sans-serif';

class Visualizer {
  constructor(canvasID) {
    const canvas = document.getElementById(canvasID);
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');
    this.graphOffsetX = 40;
    this.graphReserveY = 20;
    this.graphWidth = this.width - this.graphOffsetX;
    this.graphHeight = this.height - this.graphReserveY;

    this.ctx.fillStyle = colorBackground;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.dBAxis(-100, -30);
    this.freqAxis();
  }

  clear() {
    this.ctx.fillStyle = colorBackground;
    this.ctx.fillRect(this.graphOffsetX, 0, this.graphWidth, this.graphHeight);
  }

  dBAxis(min, max) {
    this.ctx.font = labelFont;
    this.ctx.fillStyle = labelColor;

    const inc = 10;
    const steps = (max - min) / inc + 1;
    const lineHeight = this.graphHeight / steps;

    let y = 0;
    for(let vol = min; vol <= max; vol += inc) {
      this.ctx.fillText(vol.toString(), 2, this.graphHeight - y);
      y += lineHeight;
    }
  }

  freqAxis() {
    this.ctx.font = labelFont;
    this.ctx.fillStyle = labelColor;

    const paddedBarWidth = this.graphWidth / barCount;

    let x = 0;
    let hz = 0;
    // 0 hertz to 22,050 hertz
    for(let b = 0; b < barCount; b++) {
      hz = Math.ceil(b / barCount * 22)
      this.ctx.fillText(hz.toString(), this.graphOffsetX + x, this.height - 2);
      x += paddedBarWidth;
    }
  }

  graph(dataArray) {
    this.clear();

    const barWidth = (this.graphWidth / barCount) - 1;

    let barHeight = 0;
    let x = this.graphOffsetX;
    this.ctx.fillStyle = barColor;

    for (let f of dataArray) {
      barHeight = f * (this.height - this.graphReserveY) / 256;
      this.ctx.fillRect(x, this.height-this.graphReserveY-barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
}

class Analyser {
  constructor() {
    this.audioCtx = new (window.webkitAudioContext || window.AudioContext)();
  }

  fromStream(stream) {
    const track = stream.getAudioTracks()[0];
    console.log(track.getSettings());

    this.analyser = this.audioCtx.createAnalyser();
    const source = this.audioCtx.createMediaStreamSource(stream);
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
  requestAnimationFrame(visualize);
  const dataArray = analyser.getFrequencyData();
  visualizer.graph(dataArray);
}

window.onload = function () {
  const audioControl = document.getElementById('audio');
  const micButton = document.getElementById('microphone');
  visualizer = new Visualizer('canvas');

  micButton.addEventListener('click', async () => {
    analyser = new Analyser();
    const microphone = await getMicrophone();

    micButton.style.display = 'none';
    document.getElementById('interface').style.display = 'block';
    analyser.fromStream(microphone);
    barColor = colorListening;
    visualize();
  });
}