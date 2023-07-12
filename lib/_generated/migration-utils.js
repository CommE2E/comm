// @flow

import { entries } from '../utils/objects.js';

export function convertRawMessageInfoToNewIDSchema(input: any): any {
  return input.type === 0
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        id:
          input.id !== null && input.id !== undefined
            ? '256|' + input.id
            : input.id,
      }
    : input.type === 14
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        media: input.media.map(elem => ({ ...elem, id: '256|' + elem.id })),
        id:
          input.id !== null && input.id !== undefined
            ? '256|' + input.id
            : input.id,
      }
    : input.type === 15
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        media: input.media.map(elem =>
          elem.type === 'photo'
            ? { ...elem, id: '256|' + elem.id }
            : elem.type === 'video'
            ? {
                ...elem,
                id: '256|' + elem.id,
                thumbnailID: '256|' + elem.thumbnailID,
              }
            : elem.type === 'encrypted_photo'
            ? ({ ...elem, id: '256|' + elem.id }: any)
            : elem.type === 'encrypted_video'
            ? ({
                ...elem,
                id: '256|' + elem.id,
                thumbnailID: '256|' + elem.thumbnailID,
              }: any)
            : elem,
        ),
        id:
          input.id !== null && input.id !== undefined
            ? '256|' + input.id
            : input.id,
      }
    : input.type === 1
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        initialThreadState: {
          ...input.initialThreadState,
          parentThreadID:
            input.initialThreadState.parentThreadID !== null &&
            input.initialThreadState.parentThreadID !== undefined
              ? '256|' + input.initialThreadState.parentThreadID
              : input.initialThreadState.parentThreadID,
          memberIDs: input.initialThreadState.memberIDs,
        },
        id: '256|' + input.id,
      }
    : input.type === 2
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        addedUserIDs: input.addedUserIDs,
        id: '256|' + input.id,
      }
    : input.type === 3
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        childThreadID: '256|' + input.childThreadID,
        id: '256|' + input.id,
      }
    : input.type === 4
    ? { ...input, threadID: '256|' + input.threadID, id: '256|' + input.id }
    : input.type === 5
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        removedUserIDs: input.removedUserIDs,
        id: '256|' + input.id,
      }
    : input.type === 6
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        userIDs: input.userIDs,
        newRole: '256|' + input.newRole,
        id: '256|' + input.id,
      }
    : input.type === 7
    ? { ...input, threadID: '256|' + input.threadID, id: '256|' + input.id }
    : input.type === 8
    ? { ...input, threadID: '256|' + input.threadID, id: '256|' + input.id }
    : input.type === 9
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        entryID: '256|' + input.entryID,
        id: '256|' + input.id,
      }
    : input.type === 10
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        entryID: '256|' + input.entryID,
        id: '256|' + input.id,
      }
    : input.type === 11
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        entryID: '256|' + input.entryID,
        id: '256|' + input.id,
      }
    : input.type === 12
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        entryID: '256|' + input.entryID,
        id: '256|' + input.id,
      }
    : input.type === 16
    ? { ...input, threadID: '256|' + input.threadID, id: '256|' + input.id }
    : input.type === 18
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        initialThreadState: {
          ...input.initialThreadState,
          parentThreadID: '256|' + input.initialThreadState.parentThreadID,
          memberIDs: input.initialThreadState.memberIDs,
        },
        id: '256|' + input.id,
      }
    : input.type === 13
    ? { ...input, id: '256|' + input.id, threadID: '256|' + input.threadID }
    : input.type === 21
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        targetMessageID: '256|' + input.targetMessageID,
        id: '256|' + input.id,
      }
    : input.type === 17
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        sourceMessage:
          input.sourceMessage !== null && input.sourceMessage !== undefined
            ? input.sourceMessage.type === 0
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  id:
                    input.sourceMessage.id !== null &&
                    input.sourceMessage.id !== undefined
                      ? '256|' + input.sourceMessage.id
                      : input.sourceMessage.id,
                }
              : input.sourceMessage.type === 14
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  id:
                    input.sourceMessage.id !== null &&
                    input.sourceMessage.id !== undefined
                      ? '256|' + input.sourceMessage.id
                      : input.sourceMessage.id,
                  media: input.sourceMessage.media.map(elem => ({
                    ...elem,
                    id: '256|' + elem.id,
                  })),
                }
              : input.sourceMessage.type === 15
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  id:
                    input.sourceMessage.id !== null &&
                    input.sourceMessage.id !== undefined
                      ? '256|' + input.sourceMessage.id
                      : input.sourceMessage.id,
                  media: input.sourceMessage.media.map(elem =>
                    elem.type === 'photo'
                      ? { ...elem, id: '256|' + elem.id }
                      : elem.type === 'video'
                      ? {
                          ...elem,
                          id: '256|' + elem.id,
                          thumbnailID: '256|' + elem.thumbnailID,
                        }
                      : elem.type === 'encrypted_photo'
                      ? ({ ...elem, id: '256|' + elem.id }: any)
                      : elem.type === 'encrypted_video'
                      ? ({
                          ...elem,
                          id: '256|' + elem.id,
                          thumbnailID: '256|' + elem.thumbnailID,
                        }: any)
                      : elem,
                  ),
                }
              : input.sourceMessage.type === 1
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  initialThreadState: {
                    ...input.sourceMessage.initialThreadState,
                    parentThreadID:
                      input.sourceMessage.initialThreadState.parentThreadID !==
                        null &&
                      input.sourceMessage.initialThreadState.parentThreadID !==
                        undefined
                        ? '256|' +
                          input.sourceMessage.initialThreadState.parentThreadID
                        : input.sourceMessage.initialThreadState.parentThreadID,
                    memberIDs: input.sourceMessage.initialThreadState.memberIDs,
                  },
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 2
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  addedUserIDs: input.sourceMessage.addedUserIDs,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 3
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  childThreadID: '256|' + input.sourceMessage.childThreadID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 4
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 5
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  removedUserIDs: input.sourceMessage.removedUserIDs,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 6
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  userIDs: input.sourceMessage.userIDs,
                  newRole: '256|' + input.sourceMessage.newRole,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 7
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 8
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 9
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  entryID: '256|' + input.sourceMessage.entryID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 10
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  entryID: '256|' + input.sourceMessage.entryID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 11
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  entryID: '256|' + input.sourceMessage.entryID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 12
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  entryID: '256|' + input.sourceMessage.entryID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 16
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 18
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  initialThreadState: {
                    ...input.sourceMessage.initialThreadState,
                    parentThreadID:
                      '256|' +
                      input.sourceMessage.initialThreadState.parentThreadID,
                    memberIDs: input.sourceMessage.initialThreadState.memberIDs,
                  },
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage.type === 13
              ? {
                  ...input.sourceMessage,
                  id: '256|' + input.sourceMessage.id,
                  threadID: '256|' + input.sourceMessage.threadID,
                }
              : input.sourceMessage.type === 21
              ? {
                  ...input.sourceMessage,
                  threadID: '256|' + input.sourceMessage.threadID,
                  targetMessageID: '256|' + input.sourceMessage.targetMessageID,
                  id: '256|' + input.sourceMessage.id,
                }
              : input.sourceMessage
            : input.sourceMessage,
        id: '256|' + input.id,
      }
    : input.type === 19
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        targetMessageID: '256|' + input.targetMessageID,
        id:
          input.id !== null && input.id !== undefined
            ? '256|' + input.id
            : input.id,
      }
    : input.type === 20
    ? {
        ...input,
        threadID: '256|' + input.threadID,
        targetMessageID: '256|' + input.targetMessageID,
        id: '256|' + input.id,
      }
    : input;
}

export function convertRawThreadInfoToNewIDSchema(input: any): any {
  return {
    ...input,
    id: '256|' + input.id,
    parentThreadID:
      input.parentThreadID !== null && input.parentThreadID !== undefined
        ? '256|' + input.parentThreadID
        : input.parentThreadID,
    containingThreadID:
      input.containingThreadID !== null &&
      input.containingThreadID !== undefined
        ? '256|' + input.containingThreadID
        : input.containingThreadID,
    community:
      input.community !== null && input.community !== undefined
        ? '256|' + input.community
        : input.community,
    members: input.members.map(elem => ({
      ...elem,
      role:
        elem.role !== null && elem.role !== undefined
          ? '256|' + elem.role
          : elem.role,
      permissions: Object.fromEntries(
        entries(elem.permissions).map(([key, value]) => [
          key,
          value.value === true
            ? { ...value, source: '256|' + value.source }
            : value,
        ]),
      ),
    })),
    roles: Object.fromEntries(
      entries(input.roles).map(([key, value]) => [
        '256|' + key,
        { ...value, id: '256|' + value.id },
      ]),
    ),
    currentUser: {
      ...input.currentUser,
      role:
        input.currentUser.role !== null && input.currentUser.role !== undefined
          ? '256|' + input.currentUser.role
          : input.currentUser.role,
      permissions: Object.fromEntries(
        entries(input.currentUser.permissions).map(([key, value]) => [
          key,
          value.value === true
            ? { ...value, source: '256|' + value.source }
            : value,
        ]),
      ),
    },
    sourceMessageID:
      input.sourceMessageID !== null && input.sourceMessageID !== undefined
        ? '256|' + input.sourceMessageID
        : input.sourceMessageID,
  };
}

export function convertMessageStoreToNewIDSchema(input: any): any {
  return {
    ...input,
    messages: Object.fromEntries(
      entries(input.messages).map(([key, value]) => [
        '256|' + key,
        value.type === 0
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              id:
                value.id !== null && value.id !== undefined
                  ? '256|' + value.id
                  : value.id,
            }
          : value.type === 14
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              media: value.media.map(elem => ({
                ...elem,
                id: '256|' + elem.id,
              })),
              id:
                value.id !== null && value.id !== undefined
                  ? '256|' + value.id
                  : value.id,
            }
          : value.type === 15
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              media: value.media.map(elem =>
                elem.type === 'photo'
                  ? { ...elem, id: '256|' + elem.id }
                  : elem.type === 'video'
                  ? {
                      ...elem,
                      id: '256|' + elem.id,
                      thumbnailID: '256|' + elem.thumbnailID,
                    }
                  : elem.type === 'encrypted_photo'
                  ? ({ ...elem, id: '256|' + elem.id }: any)
                  : elem.type === 'encrypted_video'
                  ? ({
                      ...elem,
                      id: '256|' + elem.id,
                      thumbnailID: '256|' + elem.thumbnailID,
                    }: any)
                  : elem,
              ),
              id:
                value.id !== null && value.id !== undefined
                  ? '256|' + value.id
                  : value.id,
            }
          : value.type === 1
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              initialThreadState: {
                ...value.initialThreadState,
                parentThreadID:
                  value.initialThreadState.parentThreadID !== null &&
                  value.initialThreadState.parentThreadID !== undefined
                    ? '256|' + value.initialThreadState.parentThreadID
                    : value.initialThreadState.parentThreadID,
                memberIDs: value.initialThreadState.memberIDs,
              },
              id: '256|' + value.id,
            }
          : value.type === 2
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              addedUserIDs: value.addedUserIDs,
              id: '256|' + value.id,
            }
          : value.type === 3
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              childThreadID: '256|' + value.childThreadID,
              id: '256|' + value.id,
            }
          : value.type === 4
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              id: '256|' + value.id,
            }
          : value.type === 5
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              removedUserIDs: value.removedUserIDs,
              id: '256|' + value.id,
            }
          : value.type === 6
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              userIDs: value.userIDs,
              newRole: '256|' + value.newRole,
              id: '256|' + value.id,
            }
          : value.type === 7
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              id: '256|' + value.id,
            }
          : value.type === 8
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              id: '256|' + value.id,
            }
          : value.type === 9
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              entryID: '256|' + value.entryID,
              id: '256|' + value.id,
            }
          : value.type === 10
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              entryID: '256|' + value.entryID,
              id: '256|' + value.id,
            }
          : value.type === 11
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              entryID: '256|' + value.entryID,
              id: '256|' + value.id,
            }
          : value.type === 12
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              entryID: '256|' + value.entryID,
              id: '256|' + value.id,
            }
          : value.type === 16
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              id: '256|' + value.id,
            }
          : value.type === 18
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              initialThreadState: {
                ...value.initialThreadState,
                parentThreadID:
                  '256|' + value.initialThreadState.parentThreadID,
                memberIDs: value.initialThreadState.memberIDs,
              },
              id: '256|' + value.id,
            }
          : value.type === 13
          ? {
              ...value,
              id: '256|' + value.id,
              threadID: '256|' + value.threadID,
            }
          : value.type === 21
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              targetMessageID: '256|' + value.targetMessageID,
              id: '256|' + value.id,
            }
          : value.type === 17
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              sourceMessage:
                value.sourceMessage !== null &&
                value.sourceMessage !== undefined
                  ? value.sourceMessage.type === 0
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        id:
                          value.sourceMessage.id !== null &&
                          value.sourceMessage.id !== undefined
                            ? '256|' + value.sourceMessage.id
                            : value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 14
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        id:
                          value.sourceMessage.id !== null &&
                          value.sourceMessage.id !== undefined
                            ? '256|' + value.sourceMessage.id
                            : value.sourceMessage.id,
                        media: value.sourceMessage.media.map(elem => ({
                          ...elem,
                          id: '256|' + elem.id,
                        })),
                      }
                    : value.sourceMessage.type === 15
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        id:
                          value.sourceMessage.id !== null &&
                          value.sourceMessage.id !== undefined
                            ? '256|' + value.sourceMessage.id
                            : value.sourceMessage.id,
                        media: value.sourceMessage.media.map(elem =>
                          elem.type === 'photo'
                            ? { ...elem, id: '256|' + elem.id }
                            : elem.type === 'video'
                            ? {
                                ...elem,
                                id: '256|' + elem.id,
                                thumbnailID: '256|' + elem.thumbnailID,
                              }
                            : elem.type === 'encrypted_photo'
                            ? ({ ...elem, id: '256|' + elem.id }: any)
                            : elem.type === 'encrypted_video'
                            ? ({
                                ...elem,
                                id: '256|' + elem.id,
                                thumbnailID: '256|' + elem.thumbnailID,
                              }: any)
                            : elem,
                        ),
                      }
                    : value.sourceMessage.type === 1
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        initialThreadState: {
                          ...value.sourceMessage.initialThreadState,
                          parentThreadID:
                            value.sourceMessage.initialThreadState
                              .parentThreadID !== null &&
                            value.sourceMessage.initialThreadState
                              .parentThreadID !== undefined
                              ? '256|' +
                                value.sourceMessage.initialThreadState
                                  .parentThreadID
                              : value.sourceMessage.initialThreadState
                                  .parentThreadID,
                          memberIDs:
                            value.sourceMessage.initialThreadState.memberIDs,
                        },
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 2
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        addedUserIDs: value.sourceMessage.addedUserIDs,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 3
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        childThreadID:
                          '256|' + value.sourceMessage.childThreadID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 4
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 5
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        removedUserIDs: value.sourceMessage.removedUserIDs,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 6
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        userIDs: value.sourceMessage.userIDs,
                        newRole: '256|' + value.sourceMessage.newRole,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 7
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 8
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 9
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        entryID: '256|' + value.sourceMessage.entryID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 10
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        entryID: '256|' + value.sourceMessage.entryID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 11
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        entryID: '256|' + value.sourceMessage.entryID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 12
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        entryID: '256|' + value.sourceMessage.entryID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 16
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 18
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        initialThreadState: {
                          ...value.sourceMessage.initialThreadState,
                          parentThreadID:
                            '256|' +
                            value.sourceMessage.initialThreadState
                              .parentThreadID,
                          memberIDs:
                            value.sourceMessage.initialThreadState.memberIDs,
                        },
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage.type === 13
                    ? {
                        ...value.sourceMessage,
                        id: '256|' + value.sourceMessage.id,
                        threadID: '256|' + value.sourceMessage.threadID,
                      }
                    : value.sourceMessage.type === 21
                    ? {
                        ...value.sourceMessage,
                        threadID: '256|' + value.sourceMessage.threadID,
                        targetMessageID:
                          '256|' + value.sourceMessage.targetMessageID,
                        id: '256|' + value.sourceMessage.id,
                      }
                    : value.sourceMessage
                  : value.sourceMessage,
              id: '256|' + value.id,
            }
          : value.type === 19
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              targetMessageID: '256|' + value.targetMessageID,
              id:
                value.id !== null && value.id !== undefined
                  ? '256|' + value.id
                  : value.id,
            }
          : value.type === 20
          ? {
              ...value,
              threadID: '256|' + value.threadID,
              targetMessageID: '256|' + value.targetMessageID,
              id: '256|' + value.id,
            }
          : value,
      ]),
    ),
    threads: Object.fromEntries(
      entries(input.threads).map(([key, value]) => [
        '256|' + key,
        { ...value, messageIDs: value.messageIDs.map(elem => '256|' + elem) },
      ]),
    ),
  };
}

export function convertEntryStoreToNewIDSchema(input: any): any {
  return {
    ...input,
    entryInfos: Object.fromEntries(
      entries(input.entryInfos).map(([key, value]) => [
        '256|' + key,
        {
          ...value,
          id:
            value.id !== null && value.id !== undefined
              ? '256|' + value.id
              : value.id,
          threadID: '256|' + value.threadID,
        },
      ]),
    ),
    daysToEntries: Object.fromEntries(
      entries(input.daysToEntries).map(([key, value]) => [
        key,
        value.map(elem => '256|' + elem),
      ]),
    ),
  };
}

export function convertInviteLinksStoreToNewIDSchema(input: any): any {
  return {
    ...input,
    links: Object.fromEntries(
      entries(input.links).map(([key, value]) => [
        '256|' + key,
        {
          ...value,
          primaryLink:
            value.primaryLink !== null && value.primaryLink !== undefined
              ? {
                  ...value.primaryLink,
                  role: '256|' + value.primaryLink.role,
                  communityID: '256|' + value.primaryLink.communityID,
                }
              : value.primaryLink,
        },
      ]),
    ),
  };
}

export function convertCalendarFilterToNewIDSchema(input: any): any {
  return input.type === 'threads'
    ? { ...input, threadIDs: input.threadIDs.map(elem => '256|' + elem) }
    : input;
}

export function convertConnectionInfoToNewIDSchema(input: any): any {
  return {
    ...input,
    queuedActivityUpdates: input.queuedActivityUpdates.map(elem => ({
      ...elem,
      threadID: '256|' + elem.threadID,
      latestMessage:
        elem.latestMessage !== null && elem.latestMessage !== undefined
          ? '256|' + elem.latestMessage
          : elem.latestMessage,
    })),
    actualizedCalendarQuery: {
      ...input.actualizedCalendarQuery,
      filters: input.actualizedCalendarQuery.filters.map(elem =>
        elem.type === 'threads'
          ? { ...elem, threadIDs: elem.threadIDs.map(elem2 => '256|' + elem2) }
          : elem,
      ),
    },
  };
}
