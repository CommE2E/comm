// @flow

import { createHmac } from 'crypto';
import type { $Request } from 'express';
import invariant from 'invariant';

import bots from 'lib/facts/bots.js';
import { extractKeyserverIDFromID } from 'lib/keyserver-conn/keyserver-call-utils.js';
import { createSidebarThreadName } from 'lib/shared/sidebar-utils.js';
import { type NeynarWebhookCastCreatedEvent } from 'lib/types/farcaster-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
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
import createMessages from '../creators/message-creator.js';
import { createThread } from '../creators/thread-creator.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { createBotViewer } from '../session/bots.js';
import { createScriptViewer } from '../session/scripts.js';
import {
  changeRole,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters.js';
import { updateRole, joinThread } from '../updaters/thread-updaters.js';
import { thisKeyserverAdmin, thisKeyserverID } from '../user/identity.js';
import { getFarcasterBotConfig } from '../utils/farcaster-bot.js';
import { getVerifiedUserIDForFID } from '../utils/farcaster-utils.js';
import { neynarClient } from '../utils/fc-cache.js';
import { getNeynarConfig } from '../utils/neynar-utils.js';

const taggedCommFarcasterInputValidator =
  neynarWebhookCastCreatedEventValidator;

const noChannelCommunityID = '80887273';
const { commbot } = bots;
const commbotViewer = createBotViewer(commbot.userID);

async function createCastSidebar(
  sidebarCastHash: string,
  channelName: ?string,
  channelCommunityID: string,
  taggerUserID: ?string,
): Promise<?NewThreadResponse> {
  const sidebarCast =
    await neynarClient?.fetchFarcasterCastByHash(sidebarCastHash);

  if (!sidebarCast) {
    return null;
  }

  const castAuthor = sidebarCast.author.username;
  const channelText = channelName ? ` in channel ${channelName}` : '';
  const messageText = `${castAuthor} said "${sidebarCast.text}"${channelText}`;

  let viewer = commbotViewer;
  if (taggerUserID) {
    viewer = createScriptViewer(taggerUserID);
    await joinThread(viewer, {
      threadID: channelCommunityID,
    });
  } else {
    const changeset = await changeRole(
      channelCommunityID,
      [commbot.userID],
      -1,
    );
    await commitMembershipChangeset(viewer, changeset);
  }

  const [{ id: messageID }] = await createMessages(viewer, [
    {
      type: messageTypes.TEXT,
      threadID: channelCommunityID,
      creatorID: viewer.id,
      time: Date.now(),
      text: messageText,
    },
  ]);

  invariant(
    messageID,
    'message returned from createMessages always has ID set',
  );
  const sidebarThreadName = createSidebarThreadName(messageText);

  const response = await createThread(
    viewer,
    {
      type: threadTypes.SIDEBAR,
      parentThreadID: channelCommunityID,
      name: sidebarThreadName,
      sourceMessageID: messageID,
    },
    {
      addViewerAsGhost: !taggerUserID,
    },
  );

  return response;
}

async function createTaggedFarcasterCommunity(
  channelID: string,
  taggerUserID: ?string,
): Promise<NewThreadResponse> {
  const keyserverAdminPromise = thisKeyserverAdmin();

  const neynarChannel =
    await neynarClient?.fetchFarcasterChannelByID(channelID);
  if (!neynarChannel) {
    throw new ServerError('channel_not_found');
  }

  const leadFID = neynarChannel.lead.fid.toString();
  const [leadUserID, keyserverAdmin] = await Promise.all([
    getVerifiedUserIDForFID(leadFID),
    keyserverAdminPromise,
  ]);

  const communityAdminID = leadUserID
    ? leadUserID
    : taggerUserID || keyserverAdmin.id;

  const initialMemberIDs = [
    ...new Set([leadUserID, taggerUserID, communityAdminID].filter(Boolean)),
  ];

  const newThreadResponse = await createThread(
    commbotViewer,
    {
      type: threadTypes.COMMUNITY_ROOT,
      name: neynarChannel.name,
      initialMemberIDs,
    },
    {
      forceAddMembers: true,
      addViewerAsGhost: true,
    },
  );

  const { newThreadID } = newThreadResponse;
  const fetchThreadResult = await fetchServerThreadInfos({
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

async function verifyNeynarWebhookSignature(
  signature: string,
  event: NeynarWebhookCastCreatedEvent,
): Promise<boolean> {
  const neynarSecret = await getNeynarConfig();
  if (!neynarSecret?.neynarWebhookSecret) {
    throw new ServerError('missing_webhook_secret');
  }

  const hmac = createHmac('sha512', neynarSecret.neynarWebhookSecret);
  hmac.update(JSON.stringify(event));

  return hmac.digest('hex') === signature;
}

async function taggedCommFarcasterResponder(req: $Request): Promise<void> {
  const { body } = req;

  const event = assertWithValidator(body, taggedCommFarcasterInputValidator);
  const eventTaggerFID = event.data.author.fid;

  const taggerUserIDPromise = getVerifiedUserIDForFID(
    eventTaggerFID.toString(),
  );

  const threadHashTagRegex: RegExp = new RegExp('#createathread', 'i');
  const foundCreateThreadHashTag = threadHashTagRegex.test(event.data.text);
  if (!foundCreateThreadHashTag) {
    return;
  }

  const signature = req.header('X-Neynar-Signature');
  if (!signature) {
    throw new ServerError('missing_neynar_signature');
  }

  const [isValidSignature, farcasterBotConfig] = await Promise.all([
    verifyNeynarWebhookSignature(signature, event),
    getFarcasterBotConfig(),
  ]);

  if (!isValidSignature) {
    throw new ServerError('invalid_webhook_signature');
  }

  const eventChannelID = event.data.channel?.id;
  const isAuthoritativeFarcasterBot =
    farcasterBotConfig.authoritativeFarcasterBot;

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

      const taggerUserID = await taggerUserIDPromise;
      const newThreadResponse = await createTaggedFarcasterCommunity(
        eventChannelID,
        taggerUserID,
      );
      channelCommunityID = newThreadResponse.newThreadID;
    } else {
      throw new ServerError('blob_fetch_failed');
    }
  }

  const { hash: castHash, parent_hash: parentHash } = event.data;
  const taggerUserID = await taggerUserIDPromise;

  // we use the parent cast to create the sidebar source message if it exists
  const sidebarCastHash = parentHash ?? castHash;
  const sidebarThreadResponse = await createCastSidebar(
    sidebarCastHash,
    event.data.channel?.name,
    channelCommunityID,
    taggerUserID,
  );

  if (!sidebarThreadResponse) {
    return;
  }

  console.log(sidebarThreadResponse);
}

export { taggedCommFarcasterResponder, taggedCommFarcasterInputValidator };
