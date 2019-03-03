let analyser = null;
let visualizerFull = null;
let visualizerZoom = null;

const barCount = 512;
const maxkHz = 24; // 0 hertz to 22,050 hertz

const colorBar = "rgb(200,200,50)";
const colorPeak = "rgb(200,0,0)";
const colorBackground = "rgb(0, 0, 0)";
const labelColor = "rgb(255, 255, 255)";
const labelFont = "9px San Francisco Display";
const decayStart = 25;

class Visualizer {
  constructor(canvasID, startkHz, labels) {
    const canvas = document.getElementById(canvasID);
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext("2d");
    if (labels) {
      this.barWidth = 19;
      this.paddedBarWidth = 20;
      this.graphOffsetX = 40;
      this.graphReserveY = 20;
    } else {
      this.paddedBarWidth = this.width / barCount;
      this.barWidth = this.paddedBarWidth - 1;
      this.graphOffsetX = 0;
      this.graphReserveY = 0;
    }
    this.graphWidth = this.width - this.graphOffsetX;
    this.graphHeight = this.height - this.graphReserveY;
    this.firstBar = Math.ceil((barCount * startkHz) / maxkHz);
    this.peaks = [];

    this.ctx.fillStyle = colorBackground;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (labels) {
      this.dBAxis(-100, -30);
      this.freqAxis();
    }
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
    for (let vol = min; vol <= max; vol += inc) {
      this.ctx.fillText(vol.toString(), 2, this.graphHeight - y);
      y += lineHeight;
    }
  }

  freqAxis() {
    this.ctx.font = labelFont;
    this.ctx.fillStyle = labelColor;

    let x = 0;
    let hz = 0;
    for (let b = this.firstBar; b < barCount; b++) {
      hz = (b / barCount) * maxkHz;
      this.ctx.fillText(hz.toFixed(1), this.graphOffsetX + x, this.height - 2);
      x += this.paddedBarWidth;
    }
  }

  graph(dataArray) {
    this.clear();

    let barHeight = 0;
    let peakHeight = 0;
    let peakY = 0;
    let x = this.graphOffsetX;
    let f = 0;

    this.ctx.fillStyle = colorBar;
    this.ctx.strokeStyle = colorPeak;

    for (let i = this.firstBar; i < dataArray.length; i++) {
      f = dataArray[i];
      barHeight = (f * (this.height - this.graphReserveY)) / 256;
      this.ctx.fillRect(
        x,
        this.height - this.graphReserveY - barHeight,
        this.barWidth,
        barHeight
      );

      if (!this.peaks[i] || f > this.peaks[i].freq) {
        this.peaks[i] = { freq: f, decay: decayStart };
      }
      // draw peaks
      if (this.peaks[i].freq > 0) {
        peakHeight =
          (this.peaks[i].freq * (this.height - this.graphReserveY)) / 256;
        peakY = this.height - this.graphReserveY - peakHeight;
        this.ctx.beginPath();
        this.ctx.moveTo(x, peakY);
        this.ctx.lineTo(x + this.barWidth - 1, peakY);
        this.ctx.stroke();
      }
      // decay peaks
      this.peaks[i].decay -= 1;
      if (this.peaks[i].decay <= 0) {
        this.peaks[i].freq = 0; // reset
      }

      x += this.paddedBarWidth;
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
    this._connectSource(source);
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
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

function visualize() {
  requestAnimationFrame(visualize);
  const dataArray = analyser.getFrequencyData();
  visualizerFull.graph(dataArray);
  visualizerZoom.graph(dataArray);
}

window.onload = function() {
  const audioControl = document.getElementById("audio");
  const micButton = document.getElementById("microphone");
  visualizerFull = new Visualizer("full", 0, false);
  visualizerZoom = new Visualizer("zoom", 18, true);

  micButton.addEventListener("click", async () => {
    analyser = new Analyser();
    const microphone = await getMicrophone();

    micButton.style.display = "none";
    document.getElementById("interface").style.display = "block";
    analyser.fromStream(microphone);
    visualize();
  });
};
