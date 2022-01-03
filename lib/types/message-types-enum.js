// @flow

import invariant from 'invariant';

export const messageTypes = Object.freeze({
  TEXT: 0,
  CREATE_THREAD: 1,
  ADD_MEMBERS: 2,
  CREATE_SUB_THREAD: 3,
  CHANGE_SETTINGS: 4,
  REMOVE_MEMBERS: 5,
  CHANGE_ROLE: 6,
  LEAVE_THREAD: 7,
  JOIN_THREAD: 8,
  CREATE_ENTRY: 9,
  EDIT_ENTRY: 10,
  DELETE_ENTRY: 11,
  RESTORE_ENTRY: 12,
  // When the server has a message to deliver that the client can't properly
  // render because the client is too old, the server will send this message
  // type instead. Consequently, there is no MessageData for UNSUPPORTED - just
  // a RawMessageInfo and a MessageInfo. Note that native/persist.js handles
  // converting these MessageInfos when the client is upgraded.
  UNSUPPORTED: 13,
  IMAGES: 14,
  MULTIMEDIA: 15,
  UPDATE_RELATIONSHIP: 16,
  SIDEBAR_SOURCE: 17,
  CREATE_SIDEBAR: 18,
});
export type MessageType = $Values<typeof messageTypes>;
export function assertMessageType(ourMessageType: number): MessageType {
  invariant(
    ourMessageType === 0 ||
      ourMessageType === 1 ||
      ourMessageType === 2 ||
      ourMessageType === 3 ||
      ourMessageType === 4 ||
      ourMessageType === 5 ||
      ourMessageType === 6 ||
      ourMessageType === 7 ||
      ourMessageType === 8 ||
      ourMessageType === 9 ||
      ourMessageType === 10 ||
      ourMessageType === 11 ||
      ourMessageType === 12 ||
      ourMessageType === 13 ||
      ourMessageType === 14 ||
      ourMessageType === 15 ||
      ourMessageType === 16 ||
      ourMessageType === 17 ||
      ourMessageType === 18,
    'number is not MessageType enum',
  );
  return ourMessageType;
}
