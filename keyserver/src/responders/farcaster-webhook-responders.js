// @flow

import { createHmac } from 'crypto';
import type { $Request } from 'express';
import { getRustAPI } from 'rust-node-addon';

import bots from 'lib/facts/bots.js';
import { extractKeyserverIDFromID } from 'lib/keyserver-conn/keyserver-call-utils.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type NewThreadResponse } from 'lib/types/thread-types.js';
import { neynarWebhookCastCreatedEventValidator } from 'lib/types/validators/farcaster-webhook-validators.js';
import { ServerError } from 'lib/utils/errors.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import {
  getFarcasterChannelTagBlob,
  createOrUpdateFarcasterChannelTag,
  farcasterChannelTagBlobValidator,
} from '../creators/farcaster-channel-tag-creator.js';
import { createThread } from '../creators/thread-creator.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import { verifyUserIDs } from '../fetchers/user-fetchers.js';
import { createBotViewer } from '../session/bots.js';
import { updateRole } from '../updaters/thread-updaters.js';
import { thisKeyserverAdmin, thisKeyserverID } from '../user/identity.js';
import { getFarcasterBotConfig } from '../utils/farcaster-bot.js';
import { getNeynarConfig, neynarClient } from '../utils/fc-cache.js';

const taggedCommFarcasterInputValidator =
  neynarWebhookCastCreatedEventValidator;

const noChannelCommunityID = '80887273';
const { commbot } = bots;

async function createTaggedFarcasterCommunity(
  channelID: string,
  taggerFID: string,
): Promise<NewThreadResponse> {
  const neynarChannel =
    await neynarClient?.fetchFarcasterChannelByID(channelID);
  if (!neynarChannel) {
    throw new ServerError('channel_not_found');
  }

  const keyserverAdmin = await thisKeyserverAdmin();
  let communityAdminID = keyserverAdmin.id;
  const leadFID = neynarChannel.lead.fid.toString();

  const rustAPI = await getRustAPI();
  const farcasterUsers = await rustAPI.getFarcasterUsers([leadFID, taggerFID]);

  const validUserIDs = await verifyUserIDs(
    farcasterUsers.map(user => user.userID),
  );

  const validFarcasterUsers = farcasterUsers.filter(user =>
    validUserIDs.includes(user.userID),
  );

  if (validFarcasterUsers.length > 0) {
    communityAdminID =
      validFarcasterUsers.find(user => user.farcasterID === leadFID)?.userID ||
      validFarcasterUsers[0].userID;
  }

  const commbotViewer = createBotViewer(commbot.userID);
  const initialMemberIDs = validUserIDs.includes(communityAdminID)
    ? validUserIDs
    : [...validUserIDs, communityAdminID];

  const newThreadResponse = await createThread(
    commbotViewer,
    {
      type: threadTypes.COMMUNITY_ROOT,
      name: neynarChannel.name,
      initialMemberIDs,
    },
    {
      forceAddMembers: true,
    },
  );

  const { newThreadID } = newThreadResponse;
  const fetchThreadResult = await fetchThreadInfos(commbotViewer, {
    threadID: newThreadResponse.newThreadID,
  });
  const threadInfo = fetchThreadResult.threadInfos[newThreadID];

  if (!threadInfo) {
    throw new ServerError('fetch_failed');
  }

  const adminRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].name === 'Admins',
  );

  if (!adminRoleID) {
    throw new ServerError('community_missing_admin');
  }

  await updateRole(commbotViewer, {
    threadID: newThreadID,
    memberIDs: [communityAdminID],
    role: adminRoleID,
  });

  await createOrUpdateFarcasterChannelTag(commbotViewer, {
    commCommunityID: newThreadResponse.newThreadID,
    farcasterChannelID: channelID,
  });

  return newThreadResponse;
}

async function taggedCommFarcasterResponder(req: $Request): Promise<void> {
  const body = req.body;

  const event = assertWithValidator(body, taggedCommFarcasterInputValidator);

  const sig = req.header('X-Neynar-Signature');
  if (!sig) {
    throw new ServerError('missing_neynar_signature');
  }

  const neynarSecret = await getNeynarConfig();
  if (!neynarSecret?.neynarWebhookSecret) {
    throw new Error('missing_webhook_secret');
  }

  const hmac = createHmac('sha512', neynarSecret.neynarWebhookSecret);
  hmac.update(JSON.stringify(event));

  const generatedSignature = hmac.digest('hex');
  const isValid = generatedSignature === sig;
  if (!isValid) {
    throw new ServerError('invalid_webhook_signature');
  }

  const farcasterBotConfig = await getFarcasterBotConfig();
  const isAuthoritativeFarcasterBot =
    farcasterBotConfig.authoritativeFarcasterBot ?? false;
  const eventChannelID = event.data.channel?.id;
  const eventTaggerFID = event.data.author.fid;

  if (!eventChannelID && !isAuthoritativeFarcasterBot) {
    return;
  }

  let channelCommunityID = noChannelCommunityID;
  if (eventChannelID) {
    const blobDownload = await getFarcasterChannelTagBlob(eventChannelID);
    if (blobDownload.found) {
      const blobText = await blobDownload.blob.text();
      const blobObject = JSON.parse(blobText);
      const farcasterChannelTagBlob = assertWithValidator(
        blobObject,
        farcasterChannelTagBlobValidator,
      );

      const { commCommunityID } = farcasterChannelTagBlob;
      const commCommunityKeyserverID =
        extractKeyserverIDFromID(commCommunityID);
      const keyserverID = await thisKeyserverID();

      if (keyserverID !== commCommunityKeyserverID) {
        return;
      }
      channelCommunityID = commCommunityID.split('|')[1];
    } else if (!blobDownload.found && blobDownload.status === 404) {
      if (!isAuthoritativeFarcasterBot) {
        return;
      }
      const newThreadResponse = await createTaggedFarcasterCommunity(
        eventChannelID,
        eventTaggerFID.toString(),
      );
      channelCommunityID = newThreadResponse.newThreadID;
    } else {
      throw new ServerError('blob_fetch_failed');
    }
  }
  console.log(channelCommunityID);
}

export { taggedCommFarcasterResponder, taggedCommFarcasterInputValidator };
