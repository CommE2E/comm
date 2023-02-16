// @flow

import invariant from 'invariant';

import { reduceMessageStore } from './message-reducer.js';
import { createPendingThread } from '../shared/thread-utils.js';
import type { MessageStore } from '../types/message-types.js';
import { messageTypes } from '../types/message-types.js';
import { threadTypes } from '../types/thread-types.js';

const messageStoreBeforeMediaUpdate: MessageStore = {
  messages: {
    local1: {
      type: 14,
      threadID: '91140',
      creatorID: '91097',
      time: 1639522317443,
      media: [
        {
          id: 'localUpload2',
          uri: 'assets-library://asset/asset.HEIC?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=HEIC',
          type: 'photo',
          dimensions: { height: 3024, width: 4032 },
          localMediaSelection: {
            step: 'photo_library',
            dimensions: { height: 3024, width: 4032 },
            uri: 'assets-library://asset/asset.HEIC?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=HEIC',
            filename: 'IMG_0006.HEIC',
            mediaNativeID: 'CC95F08C-88C3-4012-9D6D-64A413D254B3/L0/001',
            selectTime: 1639522317349,
            sendTime: 1639522317349,
            retries: 0,
          },
        },
      ],
      localID: 'local1',
    },
  },
  threads: {
    '91140': {
      messageIDs: ['local1'],
      startReached: true,
      lastNavigatedTo: 1639522314170,
      lastPruned: 1639522292271,
    },
  },
  local: {},
  currentAsOf: 1639522292174,
};

describe('UPDATE_MULTIMEDIA_MESSAGE_MEDIA', () => {
  const updateMultiMediaMessageMediaAction = {
    type: 'UPDATE_MULTIMEDIA_MESSAGE_MEDIA',
    payload: {
      messageID: 'local1',
      currentMediaID: 'localUpload2',
      mediaUpdate: {
        id: '91172',
        type: 'photo',
        uri: 'http://localhost/comm/upload/91172/dfa9b9fe7eb03fde',
        dimensions: { height: 1440, width: 1920 },
        localMediaSelection: undefined,
      },
    },
  };
  const { messageStore: updatedMessageStore } = reduceMessageStore(
    messageStoreBeforeMediaUpdate,
    updateMultiMediaMessageMediaAction,
    {},
  );

  test('replace local media with uploaded media', () => {
    expect(
      updatedMessageStore.messages[
        updateMultiMediaMessageMediaAction.payload.messageID
      ],
    ).toStrictEqual({
      type: 14,
      threadID: '91140',
      creatorID: '91097',
      time: 1639522317443,
      media: [
        {
          id: '91172',
          type: 'photo',
          uri: 'http://localhost/comm/upload/91172/dfa9b9fe7eb03fde',
          dimensions: { height: 1440, width: 1920 },
        },
      ],
      localID: 'local1',
    });
  });

  test('localMediaSelection is unset when undefined in update', () => {
    const msg =
      updatedMessageStore.messages[
        updateMultiMediaMessageMediaAction.payload.messageID
      ];

    expect(msg.type).toEqual(messageTypes.IMAGES);
    invariant(msg.type === messageTypes.IMAGES, 'message is of type IMAGES');
    expect(msg.media[0]).not.toHaveProperty('localMediaSelection');
  });

  test('localMediaSelection is unchanged when missing in update', () => {
    const actionWithoutLocalMediaSelectionUpdate = {
      type: 'UPDATE_MULTIMEDIA_MESSAGE_MEDIA',
      payload: {
        messageID: 'local1',
        currentMediaID: 'localUpload2',
        mediaUpdate: {
          id: '91172',
          type: 'photo',
          uri: 'http://localhost/comm/upload/91172/dfa9b9fe7eb03fde',
          dimensions: { height: 1440, width: 1920 },
        },
      },
    };
    const { messageStore: storeWithoutLocalMediaSelectionUpdate } =
      reduceMessageStore(
        messageStoreBeforeMediaUpdate,
        actionWithoutLocalMediaSelectionUpdate,
        {},
      );
    const prevMsg =
      messageStoreBeforeMediaUpdate.messages[
        actionWithoutLocalMediaSelectionUpdate.payload.messageID
      ];
    const updatedMsg =
      storeWithoutLocalMediaSelectionUpdate.messages[
        actionWithoutLocalMediaSelectionUpdate.payload.messageID
      ];

    expect(updatedMsg.type).toEqual(messageTypes.IMAGES);
    expect(prevMsg.type).toEqual(messageTypes.IMAGES);
    invariant(
      updatedMsg.type === messageTypes.IMAGES &&
        prevMsg.type === messageTypes.IMAGES,
      'message is of type IMAGES',
    );

    expect(updatedMsg.media[0].localMediaSelection).toStrictEqual(
      prevMsg.media[0].localMediaSelection,
    );
  });

  test('localMediaSelection is updated when included in update', () => {
    const updateMultiMediaMessageMediaActionWithReplacement = {
      type: 'UPDATE_MULTIMEDIA_MESSAGE_MEDIA',
      payload: {
        messageID: 'local1',
        currentMediaID: 'localUpload2',
        mediaUpdate: {
          id: '91172',
          type: 'photo',
          uri: 'http://localhost/comm/upload/91172/dfa9b9fe7eb03fde',
          dimensions: { height: 1440, width: 1920 },
          localMediaSelection: {
            step: 'photo_library',
            dimensions: { height: 10, width: 10 },
            uri: 'assets-library://asset/new/path',
            filename: 'NEWNAME.PNG',
            mediaNativeID: 'CC95F08C-88C3-4012-9D6D-64A413D254B3/L0/001',
            selectTime: 1639522317349,
            sendTime: 1639522317349,
            retries: 1,
          },
        },
      },
    };
    const { messageStore: updatedMessageStoreWithReplacement } =
      reduceMessageStore(
        messageStoreBeforeMediaUpdate,
        updateMultiMediaMessageMediaActionWithReplacement,
        {},
      );
    const updatedMsg =
      updatedMessageStoreWithReplacement.messages[
        updateMultiMediaMessageMediaActionWithReplacement.payload.messageID
      ];
    expect(updatedMsg.type).toEqual(messageTypes.IMAGES);
    invariant(
      updatedMsg.type === messageTypes.IMAGES,
      'message is of type IMAGES',
    );

    expect(updatedMsg.media[0].localMediaSelection).toStrictEqual({
      step: 'photo_library',
      dimensions: { height: 10, width: 10 },
      uri: 'assets-library://asset/new/path',
      filename: 'NEWNAME.PNG',
      mediaNativeID: 'CC95F08C-88C3-4012-9D6D-64A413D254B3/L0/001',
      selectTime: 1639522317349,
      sendTime: 1639522317349,
      retries: 1,
    });
  });
});

describe('SET_MESSAGE_STORE_MESSAGES', () => {
  const clientDBMessages = [
    {
      id: '103502',
      local_id: null,
      thread: '88471',
      user: '83809',
      type: '14',
      future_type: null,
      content: '[103501]',
      time: '1658168455316',
      media_infos: [
        {
          id: '103501',
          uri: 'http://localhost/comm/upload/103501/425db25471f3acd5',
          type: 'photo',
          extras: '{"dimensions":{"width":1920,"height":1440},"loop":false}',
        },
      ],
    },
    {
      id: 'local10',
      local_id: 'local10',
      thread: '88471',
      user: '83809',
      type: '14',
      future_type: null,
      content: '[null]',
      time: '1658172650495',
      media_infos: [
        {
          id: 'localUpload0',
          uri: 'assets-library://asset/asset.heic?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=heic',
          type: 'photo',
          extras:
            '{"dimensions":{"height":3024,"width":4032},"loop":false,"local_media_selection":{"step":"photo_library","dimensions":{"height":3024,"width":4032},"uri":"assets-library://asset/asset.heic?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=heic","filename":"IMG_0006.HEIC","mediaNativeID":"CC95F08C-88C3-4012-9D6D-64A413D254B3/L0/001","selectTime":1658172650370,"sendTime":1658172650370,"retries":0}}',
        },
      ],
    },
    {
      id: 'local11',
      local_id: 'local11',
      thread: '88471',
      user: '83809',
      type: '14',
      future_type: null,
      content: '[null,null]',
      time: '1658172656976',
      media_infos: [
        {
          id: 'localUpload2',
          uri: 'assets-library://asset/asset.heic?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=heic',
          type: 'photo',
          extras:
            '{"dimensions":{"height":3024,"width":4032},"loop":false,"local_media_selection":{"step":"photo_library","dimensions":{"height":3024,"width":4032},"uri":"assets-library://asset/asset.heic?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=heic","filename":"IMG_0006.HEIC","mediaNativeID":"CC95F08C-88C3-4012-9D6D-64A413D254B3/L0/001","selectTime":1658172656826,"sendTime":1658172656826,"retries":0}}',
        },
        {
          id: 'localUpload4',
          uri: 'assets-library://asset/asset.jpg?id=ED7AC36B-A150-4C38-BB8C-B6D696F4F2ED&ext=jpg',
          type: 'photo',
          extras:
            '{"dimensions":{"height":2002,"width":3000},"loop":false,"local_media_selection":{"step":"photo_library","dimensions":{"height":2002,"width":3000},"uri":"assets-library://asset/asset.jpg?id=ED7AC36B-A150-4C38-BB8C-B6D696F4F2ED&ext=jpg","filename":"IMG_0005.JPG","mediaNativeID":"ED7AC36B-A150-4C38-BB8C-B6D696F4F2ED/L0/001","selectTime":1658172656826,"sendTime":1658172656826,"retries":0}}',
        },
      ],
    },
  ];

  const threads = {
    '88471': {
      messageIDs: ['local11', 'local10', '103502'],
      startReached: false,
      lastNavigatedTo: 1658172614602,
      lastPruned: 1658169913623,
    },
  };

  const { messageStore: updatedMessageStore } = reduceMessageStore(
    {
      messages: {},
      threads,
      local: {},
      currentAsOf: 1234567890123,
    },
    {
      type: 'SET_CLIENT_DB_STORE',
      payload: {
        currentUserID: '',
        drafts: [],
        threadStore: {
          threadInfos: {},
        },
        messages: clientDBMessages,
      },
    },
    {
      [88471]: createPendingThread({
        viewerID: '',
        threadType: threadTypes.LOCAL,
        members: [{ id: '', username: '' }],
      }),
    },
  );
  test('removes local media when constructing messageStore.messages', () => {
    expect(updatedMessageStore.messages).toHaveProperty('103502');
    expect(updatedMessageStore.messages).not.toHaveProperty('local10');
    expect(updatedMessageStore.messages).not.toHaveProperty('local11');
  });

  test('removes local media when constructing messageStore.threads', () => {
    expect(updatedMessageStore).toBeDefined();
    expect(updatedMessageStore.threads).toBeDefined();
    expect(updatedMessageStore.threads['88471']).toBeDefined();
    expect(updatedMessageStore.threads['88471'].messageIDs).toBeDefined();
    expect(updatedMessageStore.threads['88471'].messageIDs).toEqual(['103502']);
  });
});
