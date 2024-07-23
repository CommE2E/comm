// @flow

export type MessageReceiveConfirmation = {
  +type: 'MessageReceiveConfirmation',
  +messageIDs: $ReadOnlyArray<string>,
};
