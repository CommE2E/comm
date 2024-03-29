// @flow

import {
  segmentAndStem,
  stopwords,
  processQueryForSearch,
} from './search-utils.js';

const alphaNumericRegex = /^[A-Za-z0-9 ]*$/;
const lowerCaseRegex = /^[a-z ]*$/;

describe('segmentAndStem(message: string)', () => {
  it('should remove punctuation', () => {
    expect(segmentAndStem("o'clock")).toMatch(alphaNumericRegex);
    expect(segmentAndStem('test@example')).toMatch(alphaNumericRegex);
    expect(segmentAndStem('100,000')).toMatch(alphaNumericRegex);
    expect(segmentAndStem('100,000,000')).toMatch(alphaNumericRegex);
    expect(segmentAndStem('hello, bye')).toMatch(alphaNumericRegex);
    expect(segmentAndStem('hello []!"#$%&\'()*,./:;?@\\_{}- bye')).toMatch(
      alphaNumericRegex,
    );
  });

  it('should remove uppercase', () => {
    expect(segmentAndStem('Hi Comm')).toMatch(lowerCaseRegex);
    expect(segmentAndStem('HELLO')).toMatch(lowerCaseRegex);
  });

  it('should remove stopwords', () => {
    const [stopWord1, stopWord2, stopWord3, stopWord4, stopWord5] = stopwords;
    expect(segmentAndStem(`hello ${stopWord1}`)).toBe('hello');
    expect(segmentAndStem(`${stopWord2} ${stopWord3} ${stopWord4}`)).toBe('');
    expect(segmentAndStem(`${stopWord5} bye`)).toBe('bye');
  });

  it('should remove excess whithespace', () => {
    expect(segmentAndStem('hello    bye')).not.toMatch(/[\s]{2}/);
  });

  it('should remove unicode punctuation', () => {
    expect(segmentAndStem('︴﹍⸺〰༻༽»⸃«⸠%¿【﹃')).toBe('');
  });

  it('should not remove emojis', () => {
    const emojiTumbsUp = '👍';
    const emojiFace = '🫡';
    expect(segmentAndStem(emojiTumbsUp)).toBe(emojiTumbsUp);
    expect(segmentAndStem(emojiFace)).toBe(emojiFace);
  });

  it('should leave + < = > ^ ` | ~', () => {
    const notRemovedASCIIPunctuation = '+ < = > ^ ` | ~';
    expect(segmentAndStem(notRemovedASCIIPunctuation)).toBe(
      notRemovedASCIIPunctuation,
    );
  });
});

describe('processQueryForSearch(query: string)', () => {
  it('should add + before every word', () => {
    expect(processQueryForSearch('test')).toBe('+test');
    expect(processQueryForSearch('test hello')).toBe('+test +hello');
    expect(processQueryForSearch('test  \nhello')).toBe('+test +hello');
  });
  it('should remove + < > ~ from the query', () => {
    expect(processQueryForSearch('+ < > ~')).toBe('');
  });
  it('should return an empty string, if the input consists only of stopwords', () => {
    const [stopWord1, stopWord2, stopWord3] = stopwords;
    expect(processQueryForSearch(stopWord1)).toBe('');
    expect(segmentAndStem(`${stopWord1} ${stopWord2} ${stopWord3}`)).toBe('');
  });
});
