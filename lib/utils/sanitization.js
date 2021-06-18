// @flow

import clone from 'just-clone';
import stringHash from 'string-hash';

import { setDeviceTokenActionTypes } from '../actions/device-actions';
import type {
  BaseAction,
  NativeAppState,
  AppState,
} from '../types/redux-types';
import { setNewSessionActionType } from './action-utils';

// eg {"email":"squad@bot.com"} => {"email":"[redacted]"}
const keysWithStringsToBeRedacted = new Set([
  'source',
  'value',
  'targetID',
  'sourceMessageAuthorID',
  'cookie',
  'creatorID',
  'currentMediaID',
  'currentUser',
  'childThreadID',
  'dbText',
  'description',
  'draft',
  'email',
  'entryID',
  'filename',
  'first255Chars',
  'id',
  'inputFilename',
  'latestMessage',
  'localID',
  'mediaLocalID',
  'mediaNativeID',
  'messageID',
  'messageLocalID',
  'messageServerID',
  'name',
  'newThreadID',
  'parentThreadID',
  'path',
  'serverID',
  'sessionID',
  'sourceMessageID',
  'threadID',
  'thumbnailID',
  'uploadLocalID',
  'uploadServerID',
  'uiName',
  'username',
  'deletedUserID',
  'deviceToken',
  'updatedUserID',
]);

// eg {"memberIDs":["123", "456"]} => {"memberIDs":["redacted", "redacted"]}
const keysWithArraysToBeRedacted = new Set([
  'memberIDs',
  'messageIDs',
  'already_friends',
  'invalid_user',
  'user_blocked',
  'deletedEntryIDs',
  'addedUserIDs',
]);

// eg "userInfos":{"1":[Object]} => "userInfos":{"redacted":[Object]}
const keysWithObjectsWithKeysToBeRedacted = new Set([
  'userInfos',
  'threadInfos',
  'threads',
  'messages',
  'entryInfos',
]);

// eg {"text":"hello world"} => {"text":"z6lgz waac5"}
const keysWithStringsToBeScrambled = new Set(['text', 'robotext']);

// eg {"uri":"https://comm.app/1234/5678"}
// => {"uri":"https://comm.app/images/background.png"}
const keysWithImageURIsToBeReplaced = new Set([
  'uri',
  'localURI',
  'inputURI',
  'outputURI',
  'newURI',
  'thumbnailURI',
]);

// (special case that redacts triply-linked [] to handle `daysToEntries` )
// eg "daysToEntries":{"2020-12-29":["123"]}
// => "daysToEntries":{"2020-12-29":["redacted"]}
const keysWithObjectsWithArraysToBeRedacted = new Set(['daysToEntries']);

function generateSaltedRedactionFn(): (string) => string {
  const salt = Math.random().toString(36);
  return (str: string) => {
    return `[redacted-${stringHash(str.concat(salt))}]`;
  };
}

function placeholderImageURI(): string {
  return 'https://comm.app/images/background.png';
}

function scrambleText(str: string): string {
  const arr = [];
  for (const char of str) {
    if (char === ' ') {
      arr.push(' ');
      continue;
    }
    const randomChar = Math.random().toString(36)[2];
    arr.push(randomChar);
  }
  return arr.join('');
}

const MessageListRouteName = 'MessageList';
const ThreadSettingsRouteName = 'ThreadSettings';

function sanitizeNavState(obj: Object, redact: (string) => string): void {
  for (const k in obj) {
    if (k === 'params') {
      sanitizePII(obj[k], redact);
    } else if (k === 'key' && obj[k].startsWith(MessageListRouteName)) {
      obj[k] = `${MessageListRouteName}${redact(
        obj[k].substring(MessageListRouteName.length),
      )}`;
    } else if (k === 'key' && obj[k].startsWith(ThreadSettingsRouteName)) {
      obj[k] = `${ThreadSettingsRouteName}${redact(
        obj[k].substring(ThreadSettingsRouteName.length),
      )}`;
    } else if (typeof obj[k] === 'object') {
      sanitizeNavState(obj[k], redact);
    }
  }
}

function sanitizePII(obj: Object, redact: (string) => string): void {
  for (const k in obj) {
    if (k === 'navState') {
      sanitizeNavState(obj[k], redact);
      continue;
    }

    if (keysWithObjectsWithKeysToBeRedacted.has(k)) {
      for (const keyToBeRedacted in obj[k]) {
        obj[k][redact(keyToBeRedacted)] = obj[k][keyToBeRedacted];
        delete obj[k][keyToBeRedacted];
      }
    }

    if (keysWithObjectsWithArraysToBeRedacted.has(k)) {
      for (const arrayToBeRedacted in obj[k]) {
        obj[k][arrayToBeRedacted] = obj[k][arrayToBeRedacted].map(redact);
      }
    }

    if (keysWithStringsToBeRedacted.has(k) && typeof obj[k] === 'string') {
      obj[k] = redact(obj[k]);
    } else if (k === 'key' && obj[k].startsWith(MessageListRouteName)) {
      obj[k] = `${MessageListRouteName}${redact(
        obj[k].substring(MessageListRouteName.length),
      )}`;
    } else if (k === 'key' && obj[k].startsWith(ThreadSettingsRouteName)) {
      obj[k] = `${ThreadSettingsRouteName}${redact(
        obj[k].substring(ThreadSettingsRouteName.length),
      )}`;
    } else if (keysWithStringsToBeScrambled.has(k)) {
      obj[k] = scrambleText(obj[k]);
    } else if (keysWithImageURIsToBeReplaced.has(k)) {
      obj[k] = placeholderImageURI();
    } else if (keysWithArraysToBeRedacted.has(k)) {
      obj[k] = obj[k].map(redact);
    } else if (typeof obj[k] === 'object') {
      sanitizePII(obj[k], redact);
    }
  }
}

function sanitizeActionSecrets(action: BaseAction): BaseAction {
  if (action.type === setNewSessionActionType) {
    const { sessionChange } = action.payload;
    if (sessionChange.cookieInvalidated) {
      const { cookie, ...rest } = sessionChange;
      return {
        type: 'SET_NEW_SESSION',
        payload: {
          ...action.payload,
          sessionChange: { cookieInvalidated: true, ...rest },
        },
      };
    } else {
      const { cookie, ...rest } = sessionChange;
      return {
        type: 'SET_NEW_SESSION',
        payload: {
          ...action.payload,
          sessionChange: { cookieInvalidated: false, ...rest },
        },
      };
    }
  } else if (
    action.type === setDeviceTokenActionTypes.started &&
    action.payload
  ) {
    return ({
      type: 'SET_DEVICE_TOKEN_STARTED',
      payload: 'FAKE',
      loadingInfo: action.loadingInfo,
    }: any);
  } else if (action.type === setDeviceTokenActionTypes.success) {
    return {
      type: 'SET_DEVICE_TOKEN_SUCCESS',
      payload: 'FAKE',
      loadingInfo: action.loadingInfo,
    };
  }
  return action;
}

function sanitizeAction(
  action: BaseAction,
  redact: (string) => string,
): BaseAction {
  const actionCopy = clone(action);
  sanitizePII(actionCopy, redact);
  return actionCopy;
}

function sanitizeState(state: AppState, redact: (string) => string): AppState {
  if (state.cookie !== undefined && state.cookie !== null) {
    const oldState: NativeAppState = state;
    state = { ...oldState, cookie: null };
  }
  if (state.deviceToken !== undefined && state.deviceToken !== null) {
    const oldState: NativeAppState = state;
    state = { ...oldState, deviceToken: null };
  }
  const stateCopy = clone(state);
  sanitizePII(stateCopy, redact);
  return stateCopy;
}

export {
  sanitizeActionSecrets,
  sanitizeAction,
  sanitizeState,
  generateSaltedRedactionFn,
};
