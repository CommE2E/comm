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

import css from './community-drawer-content.css';
import CommunityDrawerItemCommunity from './community-drawer-item-community.react';

const labelStyles = ['titleLevel0', 'titleLevel1', 'titleLevel2'];

function CommunityDrawerContent(): React.Node {
  const tab = useSelector(state => state.navInfo.tab);
  const maxDepth = tab === 'calendar' ? 0 : 2;
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

  const setOpenCommunityOrClose = React.useCallback((index: string) => {
    setOpenCommunity(open => (open === index ? null : index));
  }, []);

  const communitiesComponents = drawerItemsData.map(item => (
    <CommunityDrawerItemCommunity
      itemData={item}
      key={item.threadInfo.id}
      toggleExpanded={setOpenCommunityOrClose}
      expanded={item.threadInfo.id === openCommunity}
      paddingLeft={10}
      showExpandButton={maxDepth > 0}
    />
  ));

  return <div className={css.container}>{communitiesComponents}</div>;
}

export default CommunityDrawerContent;
