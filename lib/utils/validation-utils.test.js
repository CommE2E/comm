// @flow

import { threadTypes } from '../types/thread-types';
import { values } from '../utils/objects';
import { tNumEnum } from './validation-utils';

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
});
