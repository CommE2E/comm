// @flow

import t from 'tcomb';
import type {
  TStructProps,
  TIrreducible,
  TRefinement,
  TEnums,
  TInterface,
  TUnion,
} from 'tcomb';

import {
  validEmailRegex,
  oldValidUsernameRegex,
  validHexColorRegex,
} from '../shared/account-utils.js';

function tBool(value: boolean): TIrreducible<boolean> {
  return t.irreducible('literal bool', x => x === value);
}

function tString(value: string): TIrreducible<string> {
  return t.irreducible('literal string', x => x === value);
}

function tNumber(value: number): TIrreducible<number> {
  return t.irreducible('literal number', x => x === value);
}

function tShape(spec: TStructProps): TInterface {
  return t.interface(spec, { strict: true });
}

type TRegex = TRefinement<string>;
function tRegex(regex: RegExp): TRegex {
  return t.refinement(t.String, val => regex.test(val));
}

function tNumEnum(nums: $ReadOnlyArray<number>): TRefinement<number> {
  return t.refinement(t.Number, (input: number) => {
    for (const num of nums) {
      if (input === num) {
        return true;
      }
    }
    return false;
  });
}

const tDate: TRegex = tRegex(/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/);
const tColor: TRegex = tRegex(validHexColorRegex); // we don't include # char
const tPlatform: TEnums = t.enums.of([
  'ios',
  'android',
  'web',
  'windows',
  'macos',
]);
const tDeviceType: TEnums = t.enums.of(['ios', 'android']);
const tPlatformDetails: TInterface = tShape({
  platform: tPlatform,
  codeVersion: t.maybe(t.Number),
  stateVersion: t.maybe(t.Number),
});
const tPassword: TRefinement<string> = t.refinement(
  t.String,
  (password: string) => !!password,
);
const tCookie: TRegex = tRegex(/^(user|anonymous)=[0-9]+:[0-9a-f]+$/);
const tEmail: TRegex = tRegex(validEmailRegex);
const tOldValidUsername: TRegex = tRegex(oldValidUsernameRegex);
const tID: TRefinement<string> = t.refinement(t.String, (id: string) => !!id);

const tMediaMessagePhoto: TInterface = tShape({
  type: tString('photo'),
  uploadID: t.String,
});

const tMediaMessageVideo: TInterface = tShape({
  type: tString('video'),
  uploadID: t.String,
  thumbnailUploadID: t.String,
});

const tMediaMessageMedia: TUnion<TInterface> = t.union([
  tMediaMessagePhoto,
  tMediaMessageVideo,
]);

export {
  tBool,
  tString,
  tNumber,
  tShape,
  tRegex,
  tNumEnum,
  tDate,
  tColor,
  tPlatform,
  tDeviceType,
  tPlatformDetails,
  tPassword,
  tCookie,
  tEmail,
  tOldValidUsername,
  tID,
  tMediaMessagePhoto,
  tMediaMessageVideo,
  tMediaMessageMedia,
};
