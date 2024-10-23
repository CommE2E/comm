// @flow

import t, { type TInterface, type TMaybe } from 'tcomb';

import { changeThreadSettingsResultValidator } from './thread-validators.js';
import { tShape, tID } from '../../utils/validation-utils.js';
import type {
  CreateOrUpdateFarcasterChannelTagResponse,
  DeleteFarcasterChannelTagResponse,
} from '../community-types';
import { rawMessageInfoValidator } from '../message-types.js';
import {
  serverUpdateInfoValidator,
  type ServerUpdateInfo,
} from '../update-types.js';

const updatesResultValidator: TInterface<{
  +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
}> = tShape<{
  +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
}>({
  newUpdates: t.list(serverUpdateInfoValidator),
});

export const createOrUpdateFarcasterChannelTagResponseValidator: TInterface<CreateOrUpdateFarcasterChannelTagResponse> =
  tShape<CreateOrUpdateFarcasterChannelTagResponse>({
    commCommunityID: tID,
    farcasterChannelID: t.String,
    newMessageInfos: t.maybe(t.list(rawMessageInfoValidator)),
    updatesResult: t.maybe(updatesResultValidator),
  });

export const deleteFarcasterChannelTagResponseValidator: TMaybe<void | DeleteFarcasterChannelTagResponse> =
  t.maybe(changeThreadSettingsResultValidator);
