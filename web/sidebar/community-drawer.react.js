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
const labelStyles = ['title'];

function CommunityDrawer(): React.Node {
  const tab = useSelector(state => state.navInfo.tab);
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

  const communitiesComponentsDefault = React.useMemo(
    () =>
      drawerItemsData.map(item => (
        <CommunityDrawerItemCommunity
          itemData={item}
          key={`${item.threadInfo.id}_chat`}
          paddingLeft={10}
          expandable={true}
          handlerType="chat"
        />
      )),
    [drawerItemsData],
  );

  const communitiesComponentsCal = React.useMemo(
    () =>
      drawerItemsData.map(item => (
        <CommunityDrawerItemCommunity
          itemData={item}
          key={`${item.threadInfo.id}_cal`}
          paddingLeft={10}
          expandable={false}
          handlerType="calendar"
        />
      )),
    [drawerItemsData],
  );

  const defaultStyle = tab === 'calendar' ? css.hidden : null;
  const calStyle = tab !== 'calendar' ? css.hidden : null;

  return (
    <ThreadListProvider>
      <div className={css.container}>
        <div className={defaultStyle}>{communitiesComponentsDefault}</div>
        <div className={calStyle}>{communitiesComponentsCal}</div>
      </div>
    </ThreadListProvider>
  );
}

export default CommunityDrawer;
