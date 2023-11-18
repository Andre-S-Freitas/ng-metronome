export class Phrase {
    bpm: number;
    bars: number;
    beatsPerBar: number;

    constructor(bpm: number, bars: number, beatsPerBar: number) {
        this.bpm = bpm;
        this.bars = bars;
        this.beatsPerBar = beatsPerBar;
    }

    // gets the duration of a phrase in milliseconds
    phraseLength(): number {
        return 60 / this.bpm * this.bars * this.beatsPerBar * 1000;
    }

    // gets the duration of a bar in milliseconds
    barLength(): number {
        return 60 / this.bpm * this.beatsPerBar * 1000;
    }

    // gets the duration of a beat in milliseconds
    beatLength(): number {
        return 60 / this.bpm * 1000;
    }

    // get how long until the end of the phrase
    timeUntilEnd(bar: number, beat: number): number {
        return this.phraseLength() - (beat * this.beatLength()) - (bar * this.barLength());
    }

}