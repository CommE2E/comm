// @flow

import {
  tMediaMessagePhoto,
  tMediaMessageVideo,
  tNumEnum,
} from './validation-utils.js';
import { threadTypes } from '../types/thread-types.js';
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
});
