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

const labelStyles = ['titleLevel0', 'titleLevel1', 'titleLevel2'];

const maxDepth = 2;

function CommunityDrawer(): React.Node {
  const tab = useSelector(state => state.navInfo.tab);
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

  const communitiesComponentsDefault = React.useMemo(
    () =>
      drawerItemsData.map(item => (
        <CommunityDrawerItemCommunity
          itemData={item}
          key={`${item.threadInfo.id}_chat`}
          toggleExpanded={setOpenCommunityOrClose}
          expanded={item.threadInfo.id === openCommunity}
        />
      )),
    [drawerItemsData, openCommunity, setOpenCommunityOrClose],
  );

  const communitiesComponentsCal = React.useMemo(
    () =>
      drawerItemsData.map(item => (
        <CommunityDrawerItemCommunity
          itemData={item}
          key={`${item.threadInfo.id}_cal`}
          toggleExpanded={() => {}}
          expanded={false}
        />
      )),
    [drawerItemsData],
  );

  const defaultStyle = React.useMemo(
    () => (tab === 'calendar' ? { display: 'none' } : null),
    [tab],
  );
  const calStyle = React.useMemo(
    () => (tab !== 'calendar' ? { display: 'none' } : null),
    [tab],
  );

  return (
    <ThreadListProvider>
      <div className={css.container}>
        <div style={defaultStyle}>{communitiesComponentsDefault}</div>
        <div style={calStyle}>{communitiesComponentsCal}</div>
      </div>
    </ThreadListProvider>
  );
}

export default CommunityDrawer;
