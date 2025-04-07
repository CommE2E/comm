// @flow

type UpdateSearchMessageOperation = {
  +type: 'update_search_messages',
  +payload: {
    +originalMessageID: string,
    +messageID: string,
    +content: string,
  },
};

type DeleteSearchMessageOperation = {
  +type: 'delete_search_message',
  +payload: {
    +messageID: string,
  },
};

export type MessageSearchStoreOperation =
  | UpdateSearchMessageOperation
  | DeleteSearchMessageOperation;
export type ClientDBMessageSearchStoreOperation = MessageSearchStoreOperation;
