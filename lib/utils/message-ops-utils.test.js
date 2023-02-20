// @flow

import {
  translateRawMessageInfoToClientDBMessageInfo,
  translateClientDBMessageInfoToRawMessageInfo,
  translateClientDBMediaInfosToMedia,
} from './message-ops-utils.js';
import type {
  ClientDBMessageInfo,
  RawSidebarSourceMessageInfo,
} from '../types/message-types.js';
import type { RawAddMembersMessageInfo } from '../types/messages/add-members.js';
import type { RawChangeSettingsMessageInfo } from '../types/messages/change-settings.js';
import type { RawCreateEntryMessageInfo } from '../types/messages/create-entry.js';
import type { RawCreateSidebarMessageInfo } from '../types/messages/create-sidebar.js';
import type { RawCreateSubthreadMessageInfo } from '../types/messages/create-subthread.js';
import type { RawCreateThreadMessageInfo } from '../types/messages/create-thread.js';
import type { RawDeleteEntryMessageInfo } from '../types/messages/delete-entry.js';
import type { RawEditEntryMessageInfo } from '../types/messages/edit-entry.js';
import type { RawImagesMessageInfo } from '../types/messages/images.js';
import type { RawJoinThreadMessageInfo } from '../types/messages/join-thread.js';
import type { RawLeaveThreadMessageInfo } from '../types/messages/leave-thread.js';
import type { RawRemoveMembersMessageInfo } from '../types/messages/remove-members.js';
import type { RawRestoreEntryMessageInfo } from '../types/messages/restore-entry.js';
import type { RawTextMessageInfo } from '../types/messages/text.js';
import type { RawUpdateRelationshipMessageInfo } from '../types/messages/update-relationship.js';

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

test('TEXT (local): rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const localRawTextMessageInfo: RawTextMessageInfo = {
    type: 0,
    localID: 'local7',
    threadID: '85466',
    text: 'Hello world',
    creatorID: '85435',
    time: 1637788332565,
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(localRawTextMessageInfo),
    ),
  ).toStrictEqual(localRawTextMessageInfo);
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

test('DELETE_ENTRY: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawDeleteEntryMessageInfo: RawDeleteEntryMessageInfo = {
    type: 11,
    threadID: '85630',
    creatorID: '85435',
    time: 1638240286574,
    entryID: '86151',
    date: '2021-11-29',
    text: 'Hello universe',
    id: '86189',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawDeleteEntryMessageInfo),
    ),
  ).toStrictEqual(rawDeleteEntryMessageInfo);
});

test('RESTORE_ENTRY: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawRestoreEntryMessageInfo: RawRestoreEntryMessageInfo = {
    type: 12,
    threadID: '85630',
    creatorID: '83809',
    time: 1638240605195,
    entryID: '86151',
    date: '2021-11-29',
    text: 'Hello universe',
    id: '86211',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawRestoreEntryMessageInfo),
    ),
  ).toStrictEqual(rawRestoreEntryMessageInfo);
});

test('IMAGES: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawImagesMessageInfo: RawImagesMessageInfo = {
    type: 14,
    threadID: '85466',
    creatorID: '85435',
    time: 1637779260087,
    media: [
      {
        id: '85504',
        type: 'photo',
        uri: 'http://localhost/comm/upload/85504/ba36cea2b5a796f6',
        dimensions: {
          width: 1920,
          height: 1281,
        },
      },
    ],
    id: '85505',
  };
  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawImagesMessageInfo),
    ),
  ).toStrictEqual(rawImagesMessageInfo);
});

test('IMAGES (local): rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const localRawImagesMessageInfo: RawImagesMessageInfo = {
    type: 14,
    threadID: '85466',
    creatorID: '85435',
    time: 1637779260087,
    media: [
      {
        id: '85504',
        type: 'photo',
        uri: 'http://localhost/comm/upload/85504/ba36cea2b5a796f6',
        dimensions: {
          width: 1920,
          height: 1281,
        },
      },
    ],
    localID: 'local123',
  };
  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(localRawImagesMessageInfo),
    ),
  ).toStrictEqual(localRawImagesMessageInfo);
});

test('UPDATE_RELATIONSHIP: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawUpdateRelationshipMessageInfo: RawUpdateRelationshipMessageInfo = {
    type: 16,
    id: '85651',
    threadID: '85630',
    time: 1638235869690,
    creatorID: '83809',
    targetID: '85435',
    operation: 'request_accepted',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(
        rawUpdateRelationshipMessageInfo,
      ),
    ),
  ).toStrictEqual(rawUpdateRelationshipMessageInfo);
});

test('SIDEBAR_SOURCE: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawSidebarSourceMessageInfo: RawSidebarSourceMessageInfo = {
    type: 17,
    threadID: '86219',
    creatorID: '85435',
    time: 1638250532831,
    sourceMessage: {
      type: 0,
      id: '85486',
      threadID: '85466',
      time: 1637778853216,
      creatorID: '256',
      text: 'as you inevitably discover bugs, have feature requests, or design suggestions, feel free to message them to me in the app.',
    },
    id: '86223',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawSidebarSourceMessageInfo),
    ),
  ).toStrictEqual(rawSidebarSourceMessageInfo);
});

test('CREATE_SIDEBAR: rawMessageInfo -> clientDBMessageInfo -> rawMessageInfo', () => {
  const rawCreateSidebarMessageInfo: RawCreateSidebarMessageInfo = {
    type: 18,
    threadID: '86219',
    creatorID: '85435',
    time: 1638250532831,
    sourceMessageAuthorID: '256',
    initialThreadState: {
      name: 'as you inevitably discover ...',
      parentThreadID: '85466',
      color: 'ffffff',
      memberIDs: ['256', '85435'],
    },
    id: '86224',
  };

  expect(
    translateClientDBMessageInfoToRawMessageInfo(
      translateRawMessageInfoToClientDBMessageInfo(rawCreateSidebarMessageInfo),
    ),
  ).toStrictEqual(rawCreateSidebarMessageInfo);
});

test('Test translateClientDBMediaInfosToMedia(...) with one video', () => {
  const clientDBMessageInfo: ClientDBMessageInfo = {
    id: 'local0',
    local_id: 'local0',
    thread: '90145',
    user: '90134',
    type: '15',
    future_type: null,
    time: '1665014145088',
    content:
      '[{"type":"video","uploadID":"localUpload0","thumbnailUploadID":"localUpload1"}]',
    media_infos: [
      {
        id: 'localUpload0',
        uri: 'assets-library://asset/asset.mov?id=6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2&ext=mov',
        type: 'video',
        extras:
          '{"dimensions":{"height":1010,"width":576},"loop":false,"local_media_selection":{"step":"video_library","dimensions":{"height":1010,"width":576},"uri":"assets-library://asset/asset.mov?id=6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2&ext=mov","filename":"IMG_0007.MOV","mediaNativeID":"6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2/L0/001","duration":25.866666666666667,"selectTime":1665014144968,"sendTime":1665014144968,"retries":0}}',
      },
      {
        id: 'localUpload1',
        uri: 'assets-library://asset/asset.mov?id=6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2&ext=mov',
        type: 'photo',
        extras: '{"dimensions":{"height":1010,"width":576},"loop":false}',
      },
    ],
  };
  const rawMessageInfo = {
    type: 15,
    threadID: '90145',
    creatorID: '90134',
    time: 1665014145088,
    media: [
      {
        id: 'localUpload0',
        uri: 'assets-library://asset/asset.mov?id=6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2&ext=mov',
        type: 'video',
        dimensions: { height: 1010, width: 576 },
        localMediaSelection: {
          step: 'video_library',
          dimensions: { height: 1010, width: 576 },
          uri: 'assets-library://asset/asset.mov?id=6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2&ext=mov',
          filename: 'IMG_0007.MOV',
          mediaNativeID: '6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2/L0/001',
          duration: 25.866666666666667,
          selectTime: 1665014144968,
          sendTime: 1665014144968,
          retries: 0,
        },
        loop: false,
        thumbnailID: 'localUpload1',
        thumbnailURI:
          'assets-library://asset/asset.mov?id=6F1BEA56-3875-474C-B3AF-B11DEDCBAFF2&ext=mov',
      },
    ],
    localID: 'local0',
  };
  expect(translateClientDBMediaInfosToMedia(clientDBMessageInfo)).toStrictEqual(
    rawMessageInfo.media,
  );
});
