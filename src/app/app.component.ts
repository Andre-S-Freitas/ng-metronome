import { Component } from '@angular/core';
import { Phrase } from './classes/phrase';
import { BufferLoader } from './classes/bufferLoader';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';


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
  playing = false;

  barsAhead = 2;

  constructor(
    private http: HttpClient
  ) { }

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
    this.context.close();
    this.context = null;
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

  async initilise(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.merger = new ChannelMergerNode(this.context, { numberOfInputs: 2 });
      await this.loadSounds();
    }

    let startTime = 0;

    // play 3 clicks in a different sound in the same tempo as the first phrase
    for (let i = 0; i < 3; i++) {
      this.scheduleSound(2, startTime);
      startTime += this.phrases[0].beatLength();
    }

    for (let phraseI = 0; phraseI < this.phrases.length; phraseI++) {
      const phrase = this.phrases[phraseI];

      for (let barI = 0; barI < phrase.bars; barI++) {
        for (let beatI = 0; beatI < phrase.beatsPerBar; beatI++) {
          const sound = this.isOdd(phraseI) ? 1 : 0;
          this.scheduleSound(sound, startTime, sound);
          console.log({ phraseI, barI, beatI, startTime, sound });
          startTime += phrase.beatLength();
        }
      }

      if (phraseI < this.phrases.length - 1) {
        const phraseAheadI = phraseI + 1;
        let startTimeBack = startTime;
        const phraseAhead = this.phrases[phraseI + 1];

        for (let barAheadI = 0; barAheadI < this.barsAhead; barAheadI++) {

          for (let beatAheadI = 0; beatAheadI < phraseAhead.beatsPerBar; beatAheadI++) {
            const sound = this.isOdd(phraseAheadI) ? 1 : 0;
            this.scheduleSound(sound, startTimeBack, sound);
            console.log({ phraseAheadI, barAheadI, beatAheadI, startTimeBack, sound });
            startTimeBack -= phraseAhead.beatLength();
          }
        }
      }
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

  scheduleSound(soundIndex: number, timeInMs: number, channel?: number, gainAmount: number = 1,): void {
    const source = this.context.createBufferSource();

    if (!this.bufferSounds[soundIndex]) {
      throw new Error(`Sound ${soundIndex} not loaded`);
    }

    // set the sound to be played
    source.buffer = this.bufferSounds[soundIndex];

    // set volume gains
    const gain = this.context.createGain();
    gain.gain.value = gainAmount;
    source.connect(gain);

    if (channel === undefined) {
      source.connect(this.merger, 0, 0);
      source.connect(this.merger, 0, 1);
    } else {
      channel = channel === 1 ? 1 : 0;
      source.connect(this.merger, 0, channel);
    }

    // connect nodes
    this.merger.connect(this.context.destination);

    // schedule sound
    source.start(timeInMs / 1000);
  }

}
