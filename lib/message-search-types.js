// @flow

type UpdateSearchMessageOperation = {
  +type: 'update_search_messages',
  +payload: { +originalMessageID: string, messageID: string, content: string },
};

export type MessageSearchStoreOperation = UpdateSearchMessageOperation;
export type ClientDBMessageSearchStoreOperation = MessageSearchStoreOperation;
