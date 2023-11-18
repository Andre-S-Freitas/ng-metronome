// export function playBeat(beatI, barI, phraseI, timeSinceStart = 0) {
//     // stop if the stop button was pressed
//     if (stop) {
//         return;
//     }

//     // stop when the sheet is over
//     if (sheet.length <= phraseI) {
//         console.log("Done");
//         return;
//     }

//     // get the current phrase
//     const phrase = sheet[phraseI];

//     // play the sound
//     console.log({ beatI, barI, phraseI, timeSinceStart });
//     if (isOdd(phraseI)) {
//         sound.play();
//     } else {
//         sound2.play();
//     }

//     const beatLength = phrase.beatLength();

//     let nextBeatI = beatI;
//     let nextBarI = barI;
//     let nextPhraseI = phraseI;

//     if (beatI == phrase.beatsPerBar) {
//         nextBeatI = 0;
//         nextBarI++;
//     } else {
//         nextBeatI++;
//     }

//     if (barI == phrase.bars) {
//         nextBarI = 0;
//         nextPhraseI++;
//     }


//     console.log({ nextPhraseI, nextBarI, nextBeatI });

//     // if we are not at the last phrase
//     if (phraseI != sheet.length - 1) {
//         const nextPhrase = sheet[phraseI + 1];
//         const aheadTime = nextPhrase.barLength() * barsAhead;

//         const timeUntilEnd = phrase.timeUntilEnd(beatI);

//         if (aheadTime > timeUntilEnd) {
//             // we should play the first beat of the next phrase
//         }
//     }

//     // schedule the next beat
//     setTimeout(() => {
//         playBeat(nextBeatI, nextBarI, nextPhraseI, timeSinceStart + beatLength);
//     }, beatLength);
// }