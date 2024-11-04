// @flow

import invariant from 'invariant';
import t from 'tcomb';
import type {
  TStructProps,
  TIrreducible,
  TRefinement,
  TEnums,
  TInterface,
  TUnion,
  TType,
} from 'tcomb';

import {
  validEmailRegex,
  oldValidUsernameRegex,
  validHexColorRegex,
} from '../shared/account-utils.js';
import type { PlatformDetails } from '../types/device-types';
import type {
  MediaMessageServerDBContent,
  PhotoMessageServerDBContent,
  VideoMessageServerDBContent,
} from '../types/messages/media';

function tBool(value: boolean): TIrreducible<boolean> {
  return t.irreducible(value.toString(), x => x === value);
}

function tString(value: string): TIrreducible<string> {
  return t.irreducible(`'${value}'`, x => x === value);
}

function tNumber(value: number): TIrreducible<number> {
  return t.irreducible(value.toString(), x => x === value);
}

function tShape<T>(spec: TStructProps<T>): TInterface<T> {
  return t.interface(spec, { strict: true });
}

export type TRegex = TRefinement<string>;
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
const tNull: TIrreducible<null> = t.irreducible('null', x => x === null);
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
const tPlatformDetails: TInterface<PlatformDetails> = tShape({
  platform: tPlatform,
  codeVersion: t.maybe(t.Number),
  stateVersion: t.maybe(t.Number),
  majorDesktopVersion: t.maybe(t.Number),
});
const tPassword: TRefinement<string> = t.refinement(
  t.String,
  (password: string) => !!password,
);
const tCookie: TRegex = tRegex(/^(user|anonymous)=[0-9]+:[0-9a-f]+$/);
const tEmail: TRegex = tRegex(validEmailRegex);
const tOldValidUsername: TRegex = tRegex(oldValidUsernameRegex);
const tID: TRefinement<string> = t.refinement(t.String, (id: string) => !!id);
const tUserID: TRefinement<string> = t.refinement(
  t.String,
  (id: string) => !!id,
);

const tMediaMessagePhoto: TInterface<PhotoMessageServerDBContent> = tShape({
  type: tString('photo'),
  uploadID: tID,
});

const tMediaMessageVideo: TInterface<VideoMessageServerDBContent> = tShape({
  type: tString('video'),
  uploadID: tID,
  thumbnailUploadID: tID,
});

const tMediaMessageMedia: TUnion<MediaMessageServerDBContent> = t.union([
  tMediaMessagePhoto,
  tMediaMessageVideo,
]);

function assertWithValidator<T>(data: mixed, validator: TType<T>): T {
  invariant(validator.is(data), "data isn't of type T");
  return (data: any);
}

const ashoatKeyserverID = '256';

const uuidRegex =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const idSchemaRegex = `(?:(?:[0-9]+|${uuidRegex})\\|)?(?:[0-9]+|${uuidRegex})`;

const pendingSidebarURLPrefix = 'sidebar';
const pendingThickSidebarURLPrefix = 'dm_sidebar';
const pendingThreadIDRegex = `pending/(type[0-9]+/[0-9]+(\\+[0-9]+)*|(${pendingSidebarURLPrefix}|${pendingThickSidebarURLPrefix})/${idSchemaRegex})`;
const thickIDRegex: RegExp = new RegExp(`^${uuidRegex}$`);

const chatNameMaxLength = 191;
const chatNameMinLength = 0;
const secondCharRange = `{${chatNameMinLength},${chatNameMaxLength}}`;
const validChatNameRegexString = `.${secondCharRange}`;
const validChatNameRegex: RegExp = new RegExp(`^${validChatNameRegexString}$`);

export {
  tBool,
  tString,
  tNumber,
  tShape,
  tRegex,
  tNumEnum,
  tNull,
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
  tUserID,
  tMediaMessagePhoto,
  tMediaMessageVideo,
  tMediaMessageMedia,
  assertWithValidator,
  ashoatKeyserverID,
  uuidRegex,
  idSchemaRegex,
  pendingSidebarURLPrefix,
  pendingThickSidebarURLPrefix,
  pendingThreadIDRegex,
  thickIDRegex,
  validChatNameRegex,
  validChatNameRegexString,
  chatNameMaxLength,
};
