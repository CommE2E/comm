// @flow

import * as React from 'react';

import {
  childThreadInfos,
  communityThreadSelector,
} from 'lib/selectors/thread-selectors.js';
import {
  createRecursiveDrawerItemsData,
  appendSuffix,
} from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfos } from 'lib/utils/entity-helpers.js';

import CommunityDrawerItemCommunity from './community-drawer-item-community.react.js';
import css from './community-drawer.css';
import { ThreadListProvider } from '../chat/thread-list-provider.js';
import { useSelector } from '../redux/redux-utils.js';

const maxDepth = 2;
const labelStyles = ['titleLevel0', 'titleLevel1', 'titleLevel2'];

function CommunityDrawer(): React.Node {
  const childThreadInfosMap = useSelector(childThreadInfos);
  const communities = useSelector(communityThreadSelector);
  const resolvedCommunities = useResolvedThreadInfos(communities);
  const communitiesSuffixed = React.useMemo(
    () => appendSuffix(resolvedCommunities),
    [resolvedCommunities],
  );

  const drawerItemsData = createRecursiveDrawerItemsData(
    childThreadInfosMap,
    communitiesSuffixed,
    labelStyles,
    maxDepth,
  );

  const [openCommunity, setOpenCommunity] = React.useState(
    communitiesSuffixed.length === 1 ? communitiesSuffixed[0].id : null,
  );

  const setOpenCommunityOrClose = React.useCallback((communityID: string) => {
    setOpenCommunity(open => (open === communityID ? null : communityID));
  }, []);

  const communitiesComponents = React.useMemo(
    () =>
      drawerItemsData.map(item => (
        <CommunityDrawerItemCommunity
          itemData={item}
          key={item.threadInfo.id}
          toggleExpanded={setOpenCommunityOrClose}
          expanded={item.threadInfo.id === openCommunity}
        />
      )),
    [drawerItemsData, openCommunity, setOpenCommunityOrClose],
  );

  return (
    <ThreadListProvider>
      <div className={css.container}>{communitiesComponents}</div>
    </ThreadListProvider>
  );
}

export default CommunityDrawer;
