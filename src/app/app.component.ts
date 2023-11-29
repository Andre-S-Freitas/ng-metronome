import { Component } from '@angular/core';
import { Phrase } from './classes/phrase';
import { BufferLoader } from './classes/bufferLoader';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

type Channel = 'left' | 'right' | 'both';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ng-metronome';

  sounds = [
    'assets/sounds/Synth_Sine_E_hi.wav',
    'assets/sounds/Synth_Block_C_lo.wav',
    'assets/sounds/Perc_Castanet_hi.wav',
  ];

  phrases = [
    new Phrase(158, 8, 3),
    new Phrase(191, 8, 3),
    new Phrase(180, 8, 3),
    new Phrase(240, 8, 3),
    new Phrase(212, 8, 3),
  ];

  merger: ChannelMergerNode = null;
  context: AudioContext = null;
  bufferSounds: AudioBuffer[] = [];
  // TODO: make playing false when all phrases have been played
  playing = false;

  barsAhead = 2;

  constructor(
    private http: HttpClient
  ) {

  }

  toogleStart(): void {
    if (this.playing) {
      this.pause();
    } else {
      this.start();
    }
  }

  start(): void {
    if (this.context && !this.playing) {
      this.resume();
    } else {
      this.initilise();
    }
    this.playing = true;
  }

  resume(): void {
    this.playing = true;
    this.context.resume();
  }

  stop(): void {
    this.playing = false;
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }

  pause(): void {
    this.playing = false;
    this.context.suspend();
  }

  removePhrase(phrase: Phrase): void {
    this.phrases = this.phrases.filter(p => p !== phrase);
  }

  addPhrase(): void {
    const lastPhrase = this.phrases[this.phrases.length - 1];
    this.phrases.push(new Phrase(lastPhrase.bpm, lastPhrase.bars, lastPhrase.beatsPerBar));
  }

  schedulePhrase(phrase: Phrase, startTime: number, channel: Channel, audio: AudioBuffer): number {
    for (let i = 0; i < phrase.bars; i++) {
      startTime = this.scheduleBar(phrase.beatsPerBar, phrase.beatLength(), startTime, channel, audio);
    }
    return startTime;
  }

  scheduleBar(beatsPerBar: number, beatLength: number, startTime: number, channel: Channel, audio: AudioBuffer): number {
    for (let i = 0; i < beatsPerBar; i++) {
      const gain = i === 0 ? 3 : 1;
      this.scheduleSound(audio, startTime, channel, gain);
      startTime += beatLength;
    }
    return startTime;
  }

  scheduleCountIn(size: number, beatLength: number, startTime: number, audio: AudioBuffer): number {
    for (let i = 0; i < size; i++) {
      this.scheduleSound(audio, startTime, 'both', 1);
      startTime += beatLength;
    }
    return startTime;
  }

  async initilise(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.merger = new ChannelMergerNode(this.context, { numberOfInputs: 2 });
      await this.loadSounds();
    }

    let startTime = 0;
    startTime = this.scheduleCountIn(3, this.phrases[0].beatLength(), startTime, this.getSound(2));

    for (let i = 0; i < this.phrases.length; i++) {
      const phrase = this.phrases[i];
      const sound = this.isOdd(i) ? this.getSound(1) : this.getSound(0);
      const channel = this.isOdd(i) ? 'left' : 'right';
      // console.log('Scheduling phrase', { startTime, phrase, channel, sound });

      if (i !== 0) {
        // TODO: prevent bars ahead from longer than the previous phrase 
        startTime = startTime - phrase.barLength() * this.barsAhead;
        // console.log('Scheduling bars ahead', { startTime, barsAhead: this.barsAhead });
        for (let j = 0; j < this.barsAhead; j++) {
          startTime = this.scheduleBar(phrase.beatsPerBar, phrase.beatLength(), startTime, channel, sound);
        }
      }

      // console.log('Scheduling bars', { startTime });
      startTime = this.schedulePhrase(phrase, startTime, channel, sound);
    }
  }

  isOdd(num: number): boolean {
    return num % 2 === 1;
  }

  loadSounds(): Promise<void> {
    return new Promise((resolve, reject) => {
      forkJoin(
        this.sounds.map((url: string) => this.loadSound(url))
      ).subscribe((buffers: AudioBuffer[]) => {
        this.bufferSounds = buffers;
        resolve();
      }, err => {
        console.error('decodeAudioData error', err);
      });
    });
  }

  loadSound(url: string): Observable<AudioBuffer> {
    return this.http.get(url, { responseType: 'arraybuffer' }).pipe(
      switchMap((res: ArrayBuffer) => this.context.decodeAudioData(res))
    )
  }

  getSound(index: number): AudioBuffer {
    if (!this.bufferSounds[index]) {
      throw new Error(`Sound ${index} not loaded`);
    }

    return this.bufferSounds[index];
  }

  scheduleSound(audio: AudioBuffer, timeInMs: number, channel: Channel, gainAmount: number = 1,): void {
    // console.log('Scheduling sound', { audio, timeInMs, channel, gainAmount });
    const source = this.context.createBufferSource();

    // set the sound to be played
    source.buffer = audio;

    // set volume gains
    const gain = this.context.createGain();
    gain.gain.value = gainAmount;

    if (channel === 'both') {
      source.connect(gain).connect(this.merger, 0, 0);
      source.connect(gain).connect(this.merger, 0, 1);
    } else if (channel === 'left') {
      source.connect(gain).connect(this.merger, 0, 0);
    } else if (channel === 'right') {
      source.connect(gain).connect(this.merger, 0, 1);
    } else {
      throw new Error(`Unknown channel ${channel}`);
    }

    // connect nodes
    this.merger.connect(this.context.destination);

    // schedule sound
    source.start(timeInMs / 1000);
  }

}
