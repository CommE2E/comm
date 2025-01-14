// @flow

import { main } from './utils.js';
import { deleteFarcasterChannelTag } from '../deleters/farcaster-channel-tag-deleters.js';
import { fetchNativeDrawerAndDirectoryInfos } from '../fetchers/community-fetchers.js';
import { createScriptViewer } from '../session/scripts.js';
import { thisKeyserverAdmin } from '../user/identity.js';

async function deleteAllFCChannelTags() {
  const admin = await thisKeyserverAdmin();
  const adminViewer = createScriptViewer(admin.id);

  const allCommunityInfosWithNames =
    await fetchNativeDrawerAndDirectoryInfos(adminViewer);

  const deleteFarcasterChannelTagPromises = allCommunityInfosWithNames
    .map(communityInfoWithName => {
      if (!communityInfoWithName.farcasterChannelID) {
        return null;
      }
      return deleteFarcasterChannelTag(adminViewer, {
        commCommunityID: communityInfoWithName.id,
        farcasterChannelID: communityInfoWithName.farcasterChannelID,
      });
    })
    .filter(Boolean);
  await Promise.all(deleteFarcasterChannelTagPromises);
}

main([deleteAllFCChannelTags]);
