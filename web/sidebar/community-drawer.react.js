// @flow

import * as React from 'react';

import {
  childThreadInfos,
  communityThreadSelector,
} from 'lib/selectors/thread-selectors';
import {
  createRecursiveDrawerItemsData,
  appendSuffix,
} from 'lib/utils/drawer-utils.react';
import { useResolvedThreadInfos } from 'lib/utils/entity-helpers';

import { ThreadListProvider } from '../chat/thread-list-provider';
import { useSelector } from '../redux/redux-utils';
import CommunityDrawerItemCommunity from './community-drawer-item-community.react';
import { getCommunityDrawerItemHandler } from './community-drawer-item-handlers.react';
import css from './community-drawer.css';

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

  const [openCommunity, setOpenCommunity] = React.useState(
    communitiesSuffixed.length === 1 ? communitiesSuffixed[0].id : null,
  );

  const setOpenCommunityOrClose = React.useCallback((index: string) => {
    setOpenCommunity(open => (open === index ? null : index));
  }, []);

  const HandlerChat = React.useMemo(
    () => getCommunityDrawerItemHandler('chat'),
    [],
  );

  const communitiesComponentsDefault = React.useMemo(
    () =>
      drawerItemsData.map(item => (
        <CommunityDrawerItemCommunity
          itemData={item}
          key={`${item.threadInfo.id}_chat`}
          toggleExpanded={setOpenCommunityOrClose}
          expanded={item.threadInfo.id === openCommunity}
          paddingLeft={10}
          expandable={true}
          Handler={HandlerChat}
        />
      )),
    [HandlerChat, drawerItemsData, openCommunity, setOpenCommunityOrClose],
  );

  const HandlerCal = React.useMemo(
    () => getCommunityDrawerItemHandler('calendar'),
    [],
  );

  const communitiesComponentsCal = React.useMemo(
    () =>
      drawerItemsData.map(item => (
        <CommunityDrawerItemCommunity
          itemData={item}
          key={`${item.threadInfo.id}_cal`}
          expanded={false}
          paddingLeft={10}
          expandable={false}
          Handler={HandlerCal}
        />
      )),
    [drawerItemsData, HandlerCal],
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
