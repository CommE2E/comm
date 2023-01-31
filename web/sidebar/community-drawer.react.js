// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import {
  childThreadInfos,
  communityThreadSelector,
} from 'lib/selectors/thread-selectors';
import {
  createRecursiveDrawerItemsData,
  appendSuffix,
} from 'lib/utils/drawer-utils.react';

import { ThreadListProvider } from '../chat/thread-list-provider';
import CommunityDrawerItemCommunity from './community-drawer-item-community.react';
import css from './community-drawer.css';

const maxDepth = 2;
const labelStyles = ['titleLevel0', 'titleLevel1', 'titleLevel2'];

function CommunityDrawer(): React.Node {
  const childThreadInfosMap = useSelector(childThreadInfos);
  const communities = useSelector(communityThreadSelector);
  const communitiesSuffixed = React.useMemo(() => appendSuffix(communities), [
    communities,
  ]);

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

  const communitiesComponents = drawerItemsData.map(item => (
    <CommunityDrawerItemCommunity
      itemData={item}
      key={item.threadInfo.id}
      toggleExpanded={setOpenCommunityOrClose}
      expanded={item.threadInfo.id === openCommunity}
    />
  ));

  return (
    <ThreadListProvider>
      <div className={css.container}>{communitiesComponents}</div>
    </ThreadListProvider>
  );
}

export default CommunityDrawer;
