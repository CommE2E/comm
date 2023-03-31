// @flow
import { segmentAndStem, stopwords, punctuationRegex } from './search-utils.js';

const alphaNumericRegex = /^[A-Za-z0-9 ]*$/;
const lowerCaseRegex = /^[a-z ]*$/;

describe('segmentAndStem(message: string)', () => {
  it('should remove punctuation', () => {
    expect(segmentAndStem("o'clock")).toMatch(alphaNumericRegex);
    expect(segmentAndStem('test@example')).toMatch(alphaNumericRegex);
    expect(segmentAndStem('100,000')).toMatch(alphaNumericRegex);
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
});

describe('punctuationRegex', () => {
  it('should unicode match punctuation', () => {
    //Pc
    expect('︴').toMatch(punctuationRegex);
    expect('﹍').toMatch(punctuationRegex);
    expect('﹎').toMatch(punctuationRegex);

    //Pd
    expect('᐀').toMatch(punctuationRegex);
    expect('⸺').toMatch(punctuationRegex);
    expect('〰').toMatch(punctuationRegex);

    //Pe
    expect('༻').toMatch(punctuationRegex);
    expect('༽').toMatch(punctuationRegex);
    expect('⦔').toMatch(punctuationRegex);

    //Pf
    expect('»').toMatch(punctuationRegex);
    expect('›').toMatch(punctuationRegex);
    expect('⸃').toMatch(punctuationRegex);

    //Pi
    expect('«').toMatch(punctuationRegex);
    expect('⸉').toMatch(punctuationRegex);
    expect('⸠').toMatch(punctuationRegex);

    //Po
    expect('%').toMatch(punctuationRegex);
    expect('#').toMatch(punctuationRegex);
    expect('¿').toMatch(punctuationRegex);

    //Ps
    expect('【').toMatch(punctuationRegex);
    expect('﹃').toMatch(punctuationRegex);
    expect('｟').toMatch(punctuationRegex);
  });

  it('should not match if there is no punctuation', () => {
    expect('hello test').not.toMatch(punctuationRegex);
    expect('👍').not.toMatch(punctuationRegex);
    expect('🫡').not.toMatch(punctuationRegex);
    expect('ł Å Ø ķ Ƈ Ɯ ẘ Ͼ л Ѻ Ӂ ؠ ܓ').not.toMatch(punctuationRegex);
  });
});
