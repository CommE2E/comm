// @flow
import { segmentAndStem, stopwords } from './search-utils.js';

const alphaNumericRegex = /^[A-Za-z0-9 ]*$/g;
const lowerCaseRegex = /^[a-z ]*$/g;

describe('segmentAndStem(message: string)', () => {
  it('should remove punctuation', () => {
    expect(segmentAndStem("o'clock")).toMatch(alphaNumericRegex);
    expect(segmentAndStem('test@example')).toMatch(alphaNumericRegex);
    expect(segmentAndStem('100,000')).toMatch(alphaNumericRegex);
    expect(segmentAndStem('hello, bye')).toMatch(alphaNumericRegex);
    expect(
      segmentAndStem('hello []!"#$%&\'()*+,./:;<=>?@\\^_`{|}~- bye'),
    ).toMatch(alphaNumericRegex);
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
});
