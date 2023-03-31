// @flow

type SegmenterOptions = {
  localeMatcher?: 'best fit' | 'lookup',
  granularity?: 'grapheme' | 'word' | 'sentence',
};

type ResolvedSegmenterOptions = {
  locale: string,
  granularity: 'grapheme' | 'word' | 'sentence',
};

declare class Segmenter {
  constructor(
    locales?: Intl$Locale | Intl$Locale[],
    options?: SegmenterOptions,
  ): Segmenter;

  resolvedOptions(): ResolvedSegmenterOptions;

  segment(input: string): Segments;
}

type SegmentData = {
  segment: string,
  index: number,
  input: string,
  isWordLike?: boolean,
};

declare class Segments {
  containing(codeUnitIndex?: number): SegmentData;
  @@iterator: () => Iterator<SegmentData>;
}

type OurIntlType = {
  +Collator: Class<Intl$Collator>,
  +DateTimeFormat: Class<Intl$DateTimeFormat>,
  +NumberFormat: Class<Intl$NumberFormat>,
  +PluralRules: ?Class<Intl$PluralRules>,
  +getCanonicalLocales?: (locales?: Intl$Locales) => Intl$Locale[],
  +Segmenter: Class<Segmenter>,
};

const OurIntl: OurIntlType = (Intl: any);
const segmenter = new OurIntl.Segmenter('eng', { granularity: 'word' });

function getSegmenter(): Segmenter {
  return segmenter;
}

export { getSegmenter };
