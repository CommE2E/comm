// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import {
  type FetchMessageInfosResponse,
  type SendMessageResponse,
  type SendEditMessageResponse,
  type FetchPinnedMessagesResult,
  type SearchMessagesResponse,
  type DeleteMessageResponse,
} from '../message-types.js';
import {
  rawMessageInfoValidator,
  messageTruncationStatusesValidator,
} from '../message-types.js';
import { userInfosValidator } from '../user-types.js';

export const sendMessageResponseValidator: TInterface<SendMessageResponse> =
  tShape<SendMessageResponse>({ newMessageInfo: rawMessageInfoValidator });

export const sendEditMessageResponseValidator: TInterface<SendEditMessageResponse> =
  tShape<SendEditMessageResponse>({
    newMessageInfos: t.list(rawMessageInfoValidator),
  });

export const fetchMessageInfosResponseValidator: TInterface<FetchMessageInfosResponse> =
  tShape<FetchMessageInfosResponse>({
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: userInfosValidator,
  });

export const fetchPinnedMessagesResultValidator: TInterface<FetchPinnedMessagesResult> =
  tShape<FetchPinnedMessagesResult>({
    pinnedMessages: t.list(rawMessageInfoValidator),
  });

export const searchMessagesResponseValidator: TInterface<SearchMessagesResponse> =
  tShape<SearchMessagesResponse>({
    messages: t.list(rawMessageInfoValidator),
    endReached: t.Boolean,
  });

export const deleteMessageResponseValidator: TInterface<DeleteMessageResponse> =
  tShape<DeleteMessageResponse>({
    newMessageInfos: t.list(rawMessageInfoValidator),
  });
