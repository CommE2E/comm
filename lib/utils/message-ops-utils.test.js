// @flow

import type { RawAddMembersMessageInfo } from '../types/messages/add-members';
import type { RawChangeSettingsMessageInfo } from '../types/messages/change-settings';
import type { RawCreateEntryMessageInfo } from '../types/messages/create-entry';
import type { RawCreateSubthreadMessageInfo } from '../types/messages/create-subthread';
import type { RawCreateThreadMessageInfo } from '../types/messages/create-thread.js';
import type { RawEditEntryMessageInfo } from '../types/messages/edit-entry';
import type { RawJoinThreadMessageInfo } from '../types/messages/join-thread';
import type { RawLeaveThreadMessageInfo } from '../types/messages/leave-thread';
import type { RawRemoveMembersMessageInfo } from '../types/messages/remove-members';
import type { RawTextMessageInfo } from '../types/messages/text';
import {
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBMessageInfoToRawMessageInfo,
} from './message-ops-utils';

test('TEXT: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawTextMessageInfo: RawTextMessageInfo = {
    type: 0,
    localID: 'local7',
    threadID: '85466',
    text: 'Hello world',
    creatorID: '85435',
    time: 1637788332565,
    id: '85551',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawTextMessageInfo),
    ),
  ).toStrictEqual(rawTextMessageInfo);
});

test('CREATE_THREAD: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawCreateThreadMessageInfo: RawCreateThreadMessageInfo = {
    type: 1,
    threadID: '85466',
    creatorID: '85435',
    time: 1637778853178,
    initialThreadState: {
      type: 6,
      name: null,
      parentThreadID: '1',
      color: '648CAA',
      memberIDs: ['256', '85435'],
    },
    id: '85482',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawCreateThreadMessageInfo),
    ),
  ).toStrictEqual(rawCreateThreadMessageInfo);
});

test('ADD_MEMBER: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawAddMemberMessageInfo: RawAddMembersMessageInfo = {
    type: 2,
    threadID: '85946',
    creatorID: '83809',
    time: 1638236346010,
    addedUserIDs: ['256'],
    id: '85986',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawAddMemberMessageInfo),
    ),
  ).toStrictEqual(rawAddMemberMessageInfo);
});

test('CREATE_SUB_THREAD: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawCreateSubthreadMessageInfo: RawCreateSubthreadMessageInfo = {
    type: 3,
    threadID: '85946',
    creatorID: '83809',
    time: 1638237345553,
    childThreadID: '85990',
    id: '85997',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(
        rawCreateSubthreadMessageInfo,
      ),
    ),
  ).toStrictEqual(rawCreateSubthreadMessageInfo);
});

test('CHANGE_SETTINGS: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawChangeSettingsMessageInfo: RawChangeSettingsMessageInfo = {
    type: 4,
    threadID: '85946',
    creatorID: '83809',
    time: 1638236125774,
    field: 'color',
    value: '009cc8',
    id: '85972',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(
        rawChangeSettingsMessageInfo,
      ),
    ),
  ).toStrictEqual(rawChangeSettingsMessageInfo);
});

test('REMOVE_MEMBERS: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawRemoveMembersMessageInfo: RawRemoveMembersMessageInfo = {
    type: 5,
    threadID: '85990',
    creatorID: '83809',
    time: 1638237832234,
    removedUserIDs: ['85435'],
    id: '86014',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawRemoveMembersMessageInfo),
    ),
  ).toStrictEqual(rawRemoveMembersMessageInfo);
});

test('LEAVE_THREAD: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawLeaveThreadMessageInfo: RawLeaveThreadMessageInfo = {
    type: 7,
    id: '86088',
    threadID: '85946',
    time: 1638238389038,
    creatorID: '85435',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawLeaveThreadMessageInfo),
    ),
  ).toStrictEqual(rawLeaveThreadMessageInfo);
});

test('JOIN_THREAD: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawJoinThreadMessageInfo: RawJoinThreadMessageInfo = {
    type: 8,
    threadID: '86125',
    creatorID: '85435',
    time: 1638239691665,
    id: '86149',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawJoinThreadMessageInfo),
    ),
  ).toStrictEqual(rawJoinThreadMessageInfo);
});

test('CREATE_ENTRY: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawCreateEntryMessageInfo: RawCreateEntryMessageInfo = {
    type: 9,
    threadID: '85630',
    creatorID: '85435',
    time: 1638239928303,
    entryID: '86151',
    date: '2021-11-29',
    text: 'Hello world',
    id: '86154',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawCreateEntryMessageInfo),
    ),
  ).toStrictEqual(rawCreateEntryMessageInfo);
});

test('EDIT_ENTRY: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawEditEntryMessageInfo: RawEditEntryMessageInfo = {
    type: 10,
    threadID: '85630',
    creatorID: '85435',
    time: 1638240110661,
    entryID: '86151',
    date: '2021-11-29',
    text: 'Hello universe',
    id: '86179',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawEditEntryMessageInfo),
    ),
  ).toStrictEqual(rawEditEntryMessageInfo);
});
