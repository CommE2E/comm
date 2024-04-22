// @flow

export type ReceivedMessageToDevice = {
  +messageID: string,
  +senderDeviceID: string,
  +plaintext: string,
  +status: string,
};
