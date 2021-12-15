// @flow

import invariant from 'invariant';

import type { MessageStore } from '../types/message-types';
import { messageTypes } from '../types/message-types';
import { reduceMessageStore } from './message-reducer';

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
          uri:
            'assets-library://asset/asset.HEIC?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=HEIC',
          type: 'photo',
          dimensions: { height: 3024, width: 4032 },
          localMediaSelection: {
            step: 'photo_library',
            dimensions: { height: 3024, width: 4032 },
            uri:
              'assets-library://asset/asset.HEIC?id=CC95F08C-88C3-4012-9D6D-64A413D254B3&ext=HEIC',
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
    const {
      messageStore: storeWithoutLocalMediaSelectionUpdate,
    } = reduceMessageStore(
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
    const {
      messageStore: updatedMessageStoreWithReplacement,
    } = reduceMessageStore(
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
