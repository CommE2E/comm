// @flow

import clone from 'just-clone';
import stringHash from 'string-hash';

import { setNewSessionActionType } from './action-utils.js';
import { setDeviceTokenActionTypes } from '../actions/device-actions.js';
import type {
  BaseAction,
  NativeAppState,
  AppState,
} from '../types/redux-types.js';

export type ReduxCrashReport = {
  +preloadedState: AppState,
  +currentState: AppState,
  +actions: $ReadOnlyArray<BaseAction>,
};

export type RedactionHelpers = {
  +redactString: string => string,
  +redactColor: string => string,
};

// eg {"email":"squad@bot.com"} => {"email":"[redacted]"}
const keysWithStringsToBeRedacted = new Set([
  'source',
  'value',
  'targetID',
  'sourceMessageAuthorID',
  'content',
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
  'extras',
  'filename',
  'first255Chars',
  'id',
  'inputFilename',
  'latestMessage',
  'local_id',
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
  'thread',
  'threadID',
  'thumbnailID',
  'uploadLocalID',
  'uploadServerID',
  'uiName',
  'uri',
  'user',
  'username',
  'deletedUserID',
  'deviceToken',
  'updatedUserID',
  'role',
  'ed25519',
  'curve25519',
  'picklingKey',
  'pickledAccount',
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
  'roles',
]);

// eg {"text":"hello world"} => {"text":"z6lgz waac5"}
const keysWithStringsToBeScrambled = new Set(['text', 'robotext']);

// eg {"uri":"https://comm.app/1234/5678"}
// => {"uri":"https://comm.app/images/placeholder.png"}
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

function generateSaltedRedactionFn(): string => string {
  const salt = Math.random().toString(36);
  return (str: string) => {
    return `[redacted-${stringHash(str.concat(salt))}]`;
  };
}

function generateColorRedactionFn(): string => string {
  const salt = Math.random().toString(16);
  return (oldColor: string) => {
    return `${stringHash(oldColor.concat(salt)).toString(16).slice(0, 6)}`;
  };
}

function placeholderImageURI(): string {
  return 'https://comm.app/images/placeholder.png';
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

function sanitizeReduxReport(reduxReport: ReduxCrashReport): ReduxCrashReport {
  const redactionHelpers: RedactionHelpers = {
    redactString: generateSaltedRedactionFn(),
    redactColor: generateColorRedactionFn(),
  };

  return {
    preloadedState: sanitizeState(reduxReport.preloadedState, redactionHelpers),
    currentState: sanitizeState(reduxReport.currentState, redactionHelpers),
    actions: reduxReport.actions.map(x =>
      sanitizeAction(sanitizeActionSecrets(x), redactionHelpers),
    ),
  };
}

const MessageListRouteName = 'MessageList';
const ThreadSettingsRouteName = 'ThreadSettings';

function potentiallyRedactReactNavigationKey(
  key: string,
  redactionFn: string => string,
): string {
  if (key.startsWith(MessageListRouteName)) {
    return `${MessageListRouteName}${redactionFn(
      key.substring(MessageListRouteName.length),
    )}`;
  } else if (key.startsWith(ThreadSettingsRouteName)) {
    return `${ThreadSettingsRouteName}${redactionFn(
      key.substring(ThreadSettingsRouteName.length),
    )}`;
  }
  return key;
}

function sanitizeNavState(
  obj: Object,
  redactionHelpers: RedactionHelpers,
): void {
  for (const k in obj) {
    if (k === 'params') {
      sanitizePII(obj[k], redactionHelpers);
    } else if (k === 'key') {
      obj[k] = potentiallyRedactReactNavigationKey(
        obj[k],
        redactionHelpers.redactString,
      );
    } else if (typeof obj[k] === 'object') {
      sanitizeNavState(obj[k], redactionHelpers);
    }
  }
}

function sanitizePII(obj: Object, redactionHelpers: RedactionHelpers): void {
  for (const k in obj) {
    if (k === 'navState') {
      sanitizeNavState(obj[k], redactionHelpers);
      continue;
    }

    if (keysWithObjectsWithKeysToBeRedacted.has(k)) {
      for (const keyToBeRedacted in obj[k]) {
        obj[k][redactionHelpers.redactString(keyToBeRedacted)] =
          obj[k][keyToBeRedacted];
        delete obj[k][keyToBeRedacted];
      }
    }

    if (keysWithObjectsWithArraysToBeRedacted.has(k)) {
      for (const arrayToBeRedacted in obj[k]) {
        obj[k][arrayToBeRedacted] = obj[k][arrayToBeRedacted].map(
          redactionHelpers.redactString,
        );
      }
    }

    if (keysWithStringsToBeRedacted.has(k) && typeof obj[k] === 'string') {
      obj[k] = redactionHelpers.redactString(obj[k]);
    } else if (k === 'key') {
      obj[k] = potentiallyRedactReactNavigationKey(
        obj[k],
        redactionHelpers.redactString,
      );
    } else if (k === 'color') {
      obj[k] = redactionHelpers.redactColor(obj[k]);
    } else if (keysWithStringsToBeScrambled.has(k)) {
      obj[k] = scrambleText(obj[k]);
    } else if (keysWithImageURIsToBeReplaced.has(k)) {
      obj[k] = placeholderImageURI();
    } else if (keysWithArraysToBeRedacted.has(k)) {
      obj[k] = obj[k].map(redactionHelpers.redactString);
    } else if (typeof obj[k] === 'object') {
      sanitizePII(obj[k], redactionHelpers);
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
  redactionHelpers: RedactionHelpers,
): BaseAction {
  const actionCopy = clone(action);
  sanitizePII(actionCopy, redactionHelpers);
  return actionCopy;
}

function sanitizeState(
  state: AppState,
  redactionHelpers: RedactionHelpers,
): AppState {
  if (state.cookie !== undefined && state.cookie !== null) {
    const oldState: NativeAppState = state;
    state = { ...oldState, cookie: null };
  }
  if (state.deviceToken !== undefined && state.deviceToken !== null) {
    const oldState: AppState = state;
    state = { ...oldState, deviceToken: null };
  }
  const stateCopy = clone(state);
  sanitizePII(stateCopy, redactionHelpers);
  return stateCopy;
}

export {
  sanitizeActionSecrets,
  sanitizeAction,
  sanitizeState,
  sanitizeReduxReport,
};
