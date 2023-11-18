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
  ];

  sheet = [
    new Phrase(158, 8, 3),
    new Phrase(191, 8, 3),
    new Phrase(180, 8, 3),
    new Phrase(240, 8, 3),
    new Phrase(212, 8, 3),
  ];

  context: AudioContext = null;
  bufferSounds: AudioBuffer[] = [];

  constructor(
    private http: HttpClient
  ) {

  }

  async initilise(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      await this.loadSounds();
    }

    let startTime = 0;

    for (let phraseI = 0; phraseI < this.sheet.length; phraseI++) {
      const phrase = this.sheet[phraseI];

      for (let barI = 0; barI < phrase.bars; barI++) {
        for (let beatI = 0; beatI < phrase.beatsPerBar; beatI++) {
          const sound = this.isOdd(phraseI) ? 1 : 0;
          this.playSound(sound, startTime);
          console.log({ phraseI, barI, beatI, startTime, sound });
          startTime += phrase.beatLength();
        }
      }

      if (phraseI < this.sheet.length - 1) {
        const phraseAheadI = phraseI + 1;
        let startTimeBack = startTime;
        const phraseAhead = this.sheet[phraseI + 1];

        for (let barAheadI = 0; barAheadI < 2; barAheadI++) {

          for (let beatAheadI = 0; beatAheadI < phraseAhead.beatsPerBar; beatAheadI++) {
            const sound = this.isOdd(phraseAheadI) ? 1 : 0;
            this.playSound(sound, startTimeBack);
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

  playSound(sound: number, time: number): void {
    const source = this.context.createBufferSource();
    source.buffer = this.bufferSounds[sound];
    source.connect(this.context.destination);
    source.start(time / 1000);
  }

}
