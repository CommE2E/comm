// @flow

import {
  idSchemaRegExp,
  tMediaMessagePhoto,
  tMediaMessageVideo,
  isKeyserverThreadID,
  thickIDRegExp,
  farcasterThreadIDRegExp,
  tNumEnum,
} from './validation-utils.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { values } from '../utils/objects.js';

describe('Validation utils', () => {
  describe('tNumEnum validator', () => {
    it('Should discard when accepted set is empty', () => {
      expect(tNumEnum([]).is(1)).toBe(false);
    });

    it('Should accept when array contains number', () => {
      expect(tNumEnum([1, 2, 3]).is(2)).toBe(true);
    });

    it('Should discard when array does not contain number', () => {
      expect(tNumEnum([1, 2, 3]).is(4)).toBe(false);
    });

    it('Should accept when value is a part of enum', () => {
      expect(tNumEnum(values(threadTypes)).is(threadTypes.SIDEBAR)).toBe(true);
    });

    it('Should discard when value is not a part of enum', () => {
      expect(tNumEnum(values(threadTypes)).is(123)).toBe(false);
    });
  });

  describe('tMediaMessagePhoto validator', () => {
    it('Should succeed when valid MediaMessagePhoto', () => {
      expect(tMediaMessagePhoto.is({ type: 'photo', uploadID: '12345' })).toBe(
        true,
      );
    });

    it('Should fail when missing uploadID', () => {
      expect(tMediaMessagePhoto.is({ type: 'photo' })).toBe(false);
    });

    it('Should fail when uploadID is not a string', () => {
      expect(tMediaMessagePhoto.is({ type: 'photo', uploadID: 12345 })).toBe(
        false,
      );
    });

    it('Should fail when type is not photo', () => {
      expect(tMediaMessagePhoto.is({ type: 'blah', uploadID: '12345' })).toBe(
        false,
      );
    });

    it('Should fail when type is video', () => {
      expect(tMediaMessagePhoto.is({ type: 'video', uploadID: '12345' })).toBe(
        false,
      );
    });
  });

  describe('tMediaMessageVideo validator', () => {
    it('Should succeed when valid tMediaMessageVideo', () => {
      expect(
        tMediaMessageVideo.is({
          type: 'video',
          uploadID: '12345',
          thumbnailUploadID: '7890',
        }),
      ).toBe(true);
    });

    it('Should fail when missing thumbnailUploadID', () => {
      expect(
        tMediaMessageVideo.is({
          type: 'video',
          uploadID: '12345',
        }),
      ).toBe(false);
    });

    it('Should fail when uploadID is not a string', () => {
      expect(
        tMediaMessageVideo.is({
          type: 'video',
          uploadID: 12345,
          thumbnailUploadID: '7890',
        }),
      ).toBe(false);
    });

    it('Should fail when type is not video', () => {
      expect(
        tMediaMessageVideo.is({
          type: 'blah',
          uploadID: '12345',
          thumbnailUploadID: '7890',
        }),
      ).toBe(false);
    });

    it('Should fail when type is photo', () => {
      expect(
        tMediaMessageVideo.is({
          type: 'photo',
          uploadID: '12345',
          thumbnailUploadID: '7890',
        }),
      ).toBe(false);
    });
  });

  describe('tMediaMessageMedia validator', () => {
    it('Should succeed when valid MediaMessagePhoto', () => {
      expect(tMediaMessagePhoto.is({ type: 'photo', uploadID: '12345' })).toBe(
        true,
      );
    });

    it('Should succeed when valid tMediaMessageVideo', () => {
      expect(
        tMediaMessageVideo.is({
          type: 'video',
          uploadID: '12345',
          thumbnailUploadID: '7890',
        }),
      ).toBe(true);
    });

    it('Should fail when not valid MediaMessagePhoto or tMediaMessageVideo', () => {
      expect(
        tMediaMessageVideo.is({
          type: 'audio',
          uploadID: '1000',
          thumbnailUploadID: '1000',
        }),
      ).toBe(false);
    });
  });

  describe('ID regex tests', () => {
    describe('Keyserver ID regex', () => {
      it('Should match compound IDs with keyserver components', () => {
        expect(isKeyserverThreadID('256|123')).toBe(true);
        expect(isKeyserverThreadID('123|456')).toBe(true);
        expect(
          isKeyserverThreadID('550e8400-e29b-41d4-a716-446655440000|456'),
        ).toBe(true);
      });

      it('Should not match thick IDs (UUIDs)', () => {
        expect(
          isKeyserverThreadID('550e8400-e29b-41d4-a716-446655440000'),
        ).toBe(false);
      });

      it('Should not match Farcaster IDs', () => {
        expect(isKeyserverThreadID('FARCASTER#ef5a742bca')).toBe(false);
        expect(isKeyserverThreadID('FARCASTER#12345-635')).toBe(false);
      });

      it('Should not match invalid formats', () => {
        expect(isKeyserverThreadID('')).toBe(false);
        expect(isKeyserverThreadID('abc')).toBe(false);
        expect(isKeyserverThreadID('123abc')).toBe(false);
      });
    });

    describe('Thick ID regex', () => {
      it('Should match valid UUIDs', () => {
        expect(thickIDRegExp.test('550e8400-e29b-41d4-a716-446655440000')).toBe(
          true,
        );
        expect(thickIDRegExp.test('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(
          true,
        );
        expect(thickIDRegExp.test('12345678-1234-1234-1234-123456789abc')).toBe(
          true,
        );
      });

      it('Should not match keyserver IDs', () => {
        expect(thickIDRegExp.test('256')).toBe(false);
        expect(thickIDRegExp.test('1234567890')).toBe(false);
      });

      it('Should not match Farcaster IDs', () => {
        expect(thickIDRegExp.test('FARCASTER#ef5a742bca')).toBe(false);
        expect(thickIDRegExp.test('FARCASTER#12345-635')).toBe(false);
      });

      it('Should not match malformed UUIDs', () => {
        expect(thickIDRegExp.test('550e8400-e29b-41d4-a716-44665544000')).toBe(
          false,
        );
        expect(
          thickIDRegExp.test('550e8400-e29b-41d4-a716-446655440000-extra'),
        ).toBe(false);
        expect(thickIDRegExp.test('550e8400-e29b-41d4-a716')).toBe(false);
      });
    });

    describe('Farcaster ID regex', () => {
      it('Should match group conversation', () => {
        expect(farcasterThreadIDRegExp.test('FARCASTER#ef5a742bca')).toBe(true);
        expect(farcasterThreadIDRegExp.test('FARCASTER#abc123')).toBe(true);
        expect(farcasterThreadIDRegExp.test('FARCASTER#0123456789abcdef')).toBe(
          true,
        );
      });

      it('Should match 1:1 conversation', () => {
        expect(farcasterThreadIDRegExp.test('FARCASTER#12345-635')).toBe(true);
        expect(farcasterThreadIDRegExp.test('FARCASTER#1-2')).toBe(true);
        expect(farcasterThreadIDRegExp.test('FARCASTER#111111-999999')).toBe(
          true,
        );
      });

      it('Should not match keyserver IDs', () => {
        expect(farcasterThreadIDRegExp.test('256')).toBe(false);
        expect(farcasterThreadIDRegExp.test('1234567890')).toBe(false);
      });

      it('Should not match thick IDs', () => {
        expect(
          farcasterThreadIDRegExp.test('550e8400-e29b-41d4-a716-446655440000'),
        ).toBe(false);
      });

      it('Should not match malformed Farcaster IDs', () => {
        expect(farcasterThreadIDRegExp.test('farcaster')).toBe(false);
        expect(farcasterThreadIDRegExp.test('FARCASTER#')).toBe(false);
        expect(farcasterThreadIDRegExp.test('notFARCASTER#12345')).toBe(false);
      });
    });

    describe('idSchemaRegex', () => {
      it('Should match keyserver IDs', () => {
        expect(idSchemaRegExp.test('256')).toBe(true);
        expect(idSchemaRegExp.test('1234567890')).toBe(true);
        expect(idSchemaRegExp.test('1')).toBe(true);
      });

      it('Should match thick IDs', () => {
        expect(
          idSchemaRegExp.test('550e8400-e29b-41d4-a716-446655440000'),
        ).toBe(true);
        expect(
          idSchemaRegExp.test('6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
        ).toBe(true);
      });

      it('Should match Farcaster IDs', () => {
        expect(idSchemaRegExp.test('FARCASTER#ef5a742bca')).toBe(true);
        expect(idSchemaRegExp.test('FARCASTER#12345-635')).toBe(true);
      });

      it('Should match compound IDs with keyserver prefix', () => {
        expect(
          idSchemaRegExp.test('256|550e8400-e29b-41d4-a716-446655440000'),
        ).toBe(true);
      });

      it('Should match compound IDs with UUID prefix', () => {
        expect(
          idSchemaRegExp.test('550e8400-e29b-41d4-a716-446655440000|256'),
        ).toBe(true);
      });

      it('Should not match invalid formats', () => {
        expect(idSchemaRegExp.test('')).toBe(false);
        expect(idSchemaRegExp.test('invalid')).toBe(false);
        expect(idSchemaRegExp.test('123abc')).toBe(false);
        expect(idSchemaRegExp.test('farcaster')).toBe(false);
        expect(idSchemaRegExp.test('550e8400-e29b-41d4-a716')).toBe(false);
      });

      it('Should not match multiple pipe separators', () => {
        expect(idSchemaRegExp.test('256|123|456')).toBe(false);
        expect(idSchemaRegExp.test('256||123')).toBe(false);
      });
    });
  });
});
