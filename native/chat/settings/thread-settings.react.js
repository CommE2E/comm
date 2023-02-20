// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Platform } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { createSelector } from 'reselect';
import tinycolor from 'tinycolor2';

import {
  changeThreadSettingsActionTypes,
  leaveThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions.js';
import { usePromoteSidebar } from 'lib/hooks/promote-sidebar.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  threadInfoSelector,
  childThreadInfos,
} from 'lib/selectors/thread-selectors.js';
import { getAvailableRelationshipButtons } from 'lib/shared/relationship-utils.js';
import {
  threadHasPermission,
  viewerIsMember,
  threadInChatList,
  getSingleOtherUser,
  threadIsChannel,
} from 'lib/shared/thread-utils.js';
import threadWatcher from 'lib/shared/thread-watcher.js';
import type { RelationshipButton } from 'lib/types/relationship-types.js';
import {
  type ThreadInfo,
  type ResolvedThreadInfo,
  type RelativeMemberInfo,
  threadPermissions,
  threadTypes,
} from 'lib/types/thread-types.js';
import type { UserInfos } from 'lib/types/user-types.js';
import {
  useResolvedThreadInfo,
  useResolvedOptionalThreadInfo,
  useResolvedOptionalThreadInfos,
} from 'lib/utils/entity-helpers.js';

import type { CategoryType } from './thread-settings-category.react.js';
import {
  ThreadSettingsCategoryHeader,
  ThreadSettingsCategoryFooter,
} from './thread-settings-category.react.js';
import ThreadSettingsChildThread from './thread-settings-child-thread.react.js';
import ThreadSettingsColor from './thread-settings-color.react.js';
import ThreadSettingsDeleteThread from './thread-settings-delete-thread.react.js';
import ThreadSettingsDescription from './thread-settings-description.react.js';
import ThreadSettingsEditRelationship from './thread-settings-edit-relationship.react.js';
import ThreadSettingsHomeNotifs from './thread-settings-home-notifs.react.js';
import ThreadSettingsLeaveThread from './thread-settings-leave-thread.react.js';
import {
  ThreadSettingsSeeMore,
  ThreadSettingsAddMember,
  ThreadSettingsAddSubchannel,
} from './thread-settings-list-action.react.js';
import ThreadSettingsMember from './thread-settings-member.react.js';
import ThreadSettingsName from './thread-settings-name.react.js';
import ThreadSettingsParent from './thread-settings-parent.react.js';
import ThreadSettingsPromoteSidebar from './thread-settings-promote-sidebar.react.js';
import ThreadSettingsPushNotifs from './thread-settings-push-notifs.react.js';
import ThreadSettingsVisibility from './thread-settings-visibility.react.js';
import ThreadAncestors from '../../components/thread-ancestors.react.js';
import {
  type KeyboardState,
  KeyboardContext,
} from '../../keyboard/keyboard-state.js';
import { defaultStackScreenOptions } from '../../navigation/options.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../../navigation/overlay-context.js';
import {
  AddUsersModalRouteName,
  ComposeSubchannelModalRouteName,
} from '../../navigation/route-names.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import type { TabNavigationProp } from '../../navigation/tab-navigator.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import type { AppState } from '../../redux/state-types.js';
import {
  useStyles,
  type IndicatorStyle,
  useIndicatorStyle,
} from '../../themes/colors.js';
import type { VerticalBounds } from '../../types/layout-types.js';
import type { ViewStyle } from '../../types/styles.js';
import type { ChatNavigationProp } from '../chat.react.js';

const itemPageLength = 5;

export type ThreadSettingsParams = {
  +threadInfo: ThreadInfo,
};

export type ThreadSettingsNavigate = $PropertyType<
  ChatNavigationProp<'ThreadSettings'>,
  'navigate',
>;

type ChatSettingsItem =
  | {
      +itemType: 'header',
      +key: string,
      +title: string,
      +categoryType: CategoryType,
    }
  | {
      +itemType: 'footer',
      +key: string,
      +categoryType: CategoryType,
    }
  | {
      +itemType: 'name',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +nameEditValue: ?string,
      +canChangeSettings: boolean,
    }
  | {
      +itemType: 'color',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +colorEditValue: string,
      +canChangeSettings: boolean,
      +navigate: ThreadSettingsNavigate,
      +threadSettingsRouteKey: string,
    }
  | {
      +itemType: 'description',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +descriptionEditValue: ?string,
      +descriptionTextHeight: ?number,
      +canChangeSettings: boolean,
    }
  | {
      +itemType: 'parent',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +parentThreadInfo: ?ResolvedThreadInfo,
    }
  | {
      +itemType: 'visibility',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
    }
  | {
      +itemType: 'pushNotifs',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
    }
  | {
      +itemType: 'homeNotifs',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
    }
  | {
      +itemType: 'seeMore',
      +key: string,
      +onPress: () => void,
    }
  | {
      +itemType: 'childThread',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +firstListItem: boolean,
      +lastListItem: boolean,
    }
  | {
      +itemType: 'addSubchannel',
      +key: string,
    }
  | {
      +itemType: 'member',
      +key: string,
      +memberInfo: RelativeMemberInfo,
      +threadInfo: ResolvedThreadInfo,
      +canEdit: boolean,
      +navigate: ThreadSettingsNavigate,
      +firstListItem: boolean,
      +lastListItem: boolean,
      +verticalBounds: ?VerticalBounds,
      +threadSettingsRouteKey: string,
    }
  | {
      +itemType: 'addMember',
      +key: string,
    }
  | {
      +itemType: 'promoteSidebar' | 'leaveThread' | 'deleteThread',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +navigate: ThreadSettingsNavigate,
      +buttonStyle: ViewStyle,
    }
  | {
      +itemType: 'editRelationship',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +navigate: ThreadSettingsNavigate,
      +buttonStyle: ViewStyle,
      +relationshipButton: RelationshipButton,
    };

type BaseProps = {
  +navigation: ChatNavigationProp<'ThreadSettings'>,
  +route: NavigationRoute<'ThreadSettings'>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +userInfos: UserInfos,
  +viewerID: ?string,
  +threadInfo: ResolvedThreadInfo,
  +parentThreadInfo: ?ResolvedThreadInfo,
  +childThreadInfos: ?$ReadOnlyArray<ResolvedThreadInfo>,
  +somethingIsSaving: boolean,
  +styles: typeof unboundStyles,
  +indicatorStyle: IndicatorStyle,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  +canPromoteSidebar: boolean,
};
type State = {
  +numMembersShowing: number,
  +numSubchannelsShowing: number,
  +numSidebarsShowing: number,
  +nameEditValue: ?string,
  +descriptionEditValue: ?string,
  +descriptionTextHeight: ?number,
  +colorEditValue: string,
  +verticalBounds: ?VerticalBounds,
};
type PropsAndState = { ...Props, ...State };
class ThreadSettings extends React.PureComponent<Props, State> {
  flatListContainer: ?React.ElementRef<typeof View>;

  constructor(props: Props) {
    super(props);
    this.state = {
      numMembersShowing: itemPageLength,
      numSubchannelsShowing: itemPageLength,
      numSidebarsShowing: itemPageLength,
      nameEditValue: null,
      descriptionEditValue: null,
      descriptionTextHeight: null,
      colorEditValue: props.threadInfo.color,
      verticalBounds: null,
    };
  }

  static scrollDisabled(props: Props) {
    const { overlayContext } = props;
    invariant(overlayContext, 'ThreadSettings should have OverlayContext');
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  componentDidUpdate(prevProps: Props) {
    const prevThreadInfo = prevProps.threadInfo;
    const newThreadInfo = this.props.threadInfo;

    if (
      !tinycolor.equals(newThreadInfo.color, prevThreadInfo.color) &&
      tinycolor.equals(this.state.colorEditValue, prevThreadInfo.color)
    ) {
      this.setState({ colorEditValue: newThreadInfo.color });
    }

    if (defaultStackScreenOptions.gestureEnabled) {
      const scrollIsDisabled = ThreadSettings.scrollDisabled(this.props);
      const scrollWasDisabled = ThreadSettings.scrollDisabled(prevProps);
      if (!scrollWasDisabled && scrollIsDisabled) {
        this.props.navigation.setOptions({ gestureEnabled: false });
      } else if (scrollWasDisabled && !scrollIsDisabled) {
        this.props.navigation.setOptions({ gestureEnabled: true });
      }
    }
  }

  threadBasicsListDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.threadInfo,
    (propsAndState: PropsAndState) => propsAndState.parentThreadInfo,
    (propsAndState: PropsAndState) => propsAndState.nameEditValue,
    (propsAndState: PropsAndState) => propsAndState.colorEditValue,
    (propsAndState: PropsAndState) => propsAndState.descriptionEditValue,
    (propsAndState: PropsAndState) => propsAndState.descriptionTextHeight,
    (propsAndState: PropsAndState) => !propsAndState.somethingIsSaving,
    (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
    (propsAndState: PropsAndState) => propsAndState.route.key,
    (
      threadInfo: ResolvedThreadInfo,
      parentThreadInfo: ?ResolvedThreadInfo,
      nameEditValue: ?string,
      colorEditValue: string,
      descriptionEditValue: ?string,
      descriptionTextHeight: ?number,
      canStartEditing: boolean,
      navigate: ThreadSettingsNavigate,
      routeKey: string,
    ) => {
      const canEditThreadName = threadHasPermission(
        threadInfo,
        threadPermissions.EDIT_THREAD_NAME,
      );
      const canEditThreadDescription = threadHasPermission(
        threadInfo,
        threadPermissions.EDIT_THREAD_DESCRIPTION,
      );
      const canEditThreadColor = threadHasPermission(
        threadInfo,
        threadPermissions.EDIT_THREAD_COLOR,
      );
      const canChangeName = canEditThreadName && canStartEditing;
      const canChangeDescription = canEditThreadDescription && canStartEditing;
      const canChangeColor = canEditThreadColor && canStartEditing;

      const listData: ChatSettingsItem[] = [];
      listData.push({
        itemType: 'header',
        key: 'basicsHeader',
        title: 'Basics',
        categoryType: 'full',
      });
      listData.push({
        itemType: 'name',
        key: 'name',
        threadInfo,
        nameEditValue,
        canChangeSettings: canChangeName,
      });
      listData.push({
        itemType: 'color',
        key: 'color',
        threadInfo,
        colorEditValue,
        canChangeSettings: canChangeColor,
        navigate,
        threadSettingsRouteKey: routeKey,
      });
      listData.push({
        itemType: 'footer',
        key: 'basicsFooter',
        categoryType: 'full',
      });

      if (
        (descriptionEditValue !== null && descriptionEditValue !== undefined) ||
        threadInfo.description ||
        canEditThreadDescription
      ) {
        listData.push({
          itemType: 'description',
          key: 'description',
          threadInfo,
          descriptionEditValue,
          descriptionTextHeight,
          canChangeSettings: canChangeDescription,
        });
      }

      const isMember = viewerIsMember(threadInfo);
      if (isMember) {
        listData.push({
          itemType: 'header',
          key: 'subscriptionHeader',
          title: 'Subscription',
          categoryType: 'full',
        });
        listData.push({
          itemType: 'pushNotifs',
          key: 'pushNotifs',
          threadInfo,
        });
        if (threadInfo.type !== threadTypes.SIDEBAR) {
          listData.push({
            itemType: 'homeNotifs',
            key: 'homeNotifs',
            threadInfo,
          });
        }
        listData.push({
          itemType: 'footer',
          key: 'subscriptionFooter',
          categoryType: 'full',
        });
      }

      listData.push({
        itemType: 'header',
        key: 'privacyHeader',
        title: 'Privacy',
        categoryType: 'full',
      });
      listData.push({
        itemType: 'visibility',
        key: 'visibility',
        threadInfo,
      });
      listData.push({
        itemType: 'parent',
        key: 'parent',
        threadInfo,
        parentThreadInfo,
      });
      listData.push({
        itemType: 'footer',
        key: 'privacyFooter',
        categoryType: 'full',
      });
      return listData;
    },
  );

  subchannelsListDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.threadInfo,
    (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
    (propsAndState: PropsAndState) => propsAndState.childThreadInfos,
    (propsAndState: PropsAndState) => propsAndState.numSubchannelsShowing,
    (
      threadInfo: ResolvedThreadInfo,
      navigate: ThreadSettingsNavigate,
      childThreads: ?$ReadOnlyArray<ResolvedThreadInfo>,
      numSubchannelsShowing: number,
    ) => {
      const listData: ChatSettingsItem[] = [];

      const subchannels = childThreads?.filter(threadIsChannel) ?? [];
      const canCreateSubchannels = threadHasPermission(
        threadInfo,
        threadPermissions.CREATE_SUBCHANNELS,
      );
      if (subchannels.length === 0 && !canCreateSubchannels) {
        return listData;
      }

      listData.push({
        itemType: 'header',
        key: 'subchannelHeader',
        title: 'Subchannels',
        categoryType: 'unpadded',
      });

      if (canCreateSubchannels) {
        listData.push({
          itemType: 'addSubchannel',
          key: 'addSubchannel',
        });
      }

      const numItems = Math.min(numSubchannelsShowing, subchannels.length);
      for (let i = 0; i < numItems; i++) {
        const subchannelInfo = subchannels[i];
        listData.push({
          itemType: 'childThread',
          key: `childThread${subchannelInfo.id}`,
          threadInfo: subchannelInfo,
          firstListItem: i === 0 && !canCreateSubchannels,
          lastListItem: i === numItems - 1 && numItems === subchannels.length,
        });
      }

      if (numItems < subchannels.length) {
        listData.push({
          itemType: 'seeMore',
          key: 'seeMoreSubchannels',
          onPress: this.onPressSeeMoreSubchannels,
        });
      }

      listData.push({
        itemType: 'footer',
        key: 'subchannelFooter',
        categoryType: 'unpadded',
      });

      return listData;
    },
  );

  sidebarsListDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
    (propsAndState: PropsAndState) => propsAndState.childThreadInfos,
    (propsAndState: PropsAndState) => propsAndState.numSidebarsShowing,
    (
      navigate: ThreadSettingsNavigate,
      childThreads: ?$ReadOnlyArray<ResolvedThreadInfo>,
      numSidebarsShowing: number,
    ) => {
      const listData: ChatSettingsItem[] = [];

      const sidebars =
        childThreads?.filter(
          childThreadInfo => childThreadInfo.type === threadTypes.SIDEBAR,
        ) ?? [];
      if (sidebars.length === 0) {
        return listData;
      }

      listData.push({
        itemType: 'header',
        key: 'sidebarHeader',
        title: 'Threads',
        categoryType: 'unpadded',
      });

      const numItems = Math.min(numSidebarsShowing, sidebars.length);
      for (let i = 0; i < numItems; i++) {
        const sidebarInfo = sidebars[i];
        listData.push({
          itemType: 'childThread',
          key: `childThread${sidebarInfo.id}`,
          threadInfo: sidebarInfo,
          firstListItem: i === 0,
          lastListItem: i === numItems - 1 && numItems === sidebars.length,
        });
      }

      if (numItems < sidebars.length) {
        listData.push({
          itemType: 'seeMore',
          key: 'seeMoreSidebars',
          onPress: this.onPressSeeMoreSidebars,
        });
      }

      listData.push({
        itemType: 'footer',
        key: 'sidebarFooter',
        categoryType: 'unpadded',
      });

      return listData;
    },
  );

  threadMembersListDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.threadInfo,
    (propsAndState: PropsAndState) => !propsAndState.somethingIsSaving,
    (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
    (propsAndState: PropsAndState) => propsAndState.route.key,
    (propsAndState: PropsAndState) => propsAndState.numMembersShowing,
    (propsAndState: PropsAndState) => propsAndState.verticalBounds,
    (
      threadInfo: ResolvedThreadInfo,
      canStartEditing: boolean,
      navigate: ThreadSettingsNavigate,
      routeKey: string,
      numMembersShowing: number,
      verticalBounds: ?VerticalBounds,
    ) => {
      const listData: ChatSettingsItem[] = [];

      const canAddMembers = threadHasPermission(
        threadInfo,
        threadPermissions.ADD_MEMBERS,
      );
      if (threadInfo.members.length === 0 && !canAddMembers) {
        return listData;
      }

      listData.push({
        itemType: 'header',
        key: 'memberHeader',
        title: 'Members',
        categoryType: 'unpadded',
      });

      if (canAddMembers) {
        listData.push({
          itemType: 'addMember',
          key: 'addMember',
        });
      }

      const numItems = Math.min(numMembersShowing, threadInfo.members.length);
      for (let i = 0; i < numItems; i++) {
        const memberInfo = threadInfo.members[i];
        listData.push({
          itemType: 'member',
          key: `member${memberInfo.id}`,
          memberInfo,
          threadInfo,
          canEdit: canStartEditing,
          navigate,
          firstListItem: i === 0 && !canAddMembers,
          lastListItem:
            i === numItems - 1 && numItems === threadInfo.members.length,
          verticalBounds,
          threadSettingsRouteKey: routeKey,
        });
      }

      if (numItems < threadInfo.members.length) {
        listData.push({
          itemType: 'seeMore',
          key: 'seeMoreMembers',
          onPress: this.onPressSeeMoreMembers,
        });
      }

      listData.push({
        itemType: 'footer',
        key: 'memberFooter',
        categoryType: 'unpadded',
      });

      return listData;
    },
  );

  actionsListDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.threadInfo,
    (propsAndState: PropsAndState) => propsAndState.parentThreadInfo,
    (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
    (propsAndState: PropsAndState) => propsAndState.styles,
    (propsAndState: PropsAndState) => propsAndState.userInfos,
    (propsAndState: PropsAndState) => propsAndState.viewerID,
    (
      threadInfo: ResolvedThreadInfo,
      parentThreadInfo: ?ResolvedThreadInfo,
      navigate: ThreadSettingsNavigate,
      styles: typeof unboundStyles,
      userInfos: UserInfos,
      viewerID: ?string,
    ) => {
      const buttons = [];

      if (this.props.canPromoteSidebar) {
        buttons.push({
          itemType: 'promoteSidebar',
          key: 'promoteSidebar',
          threadInfo,
          navigate,
        });
      }

      const canLeaveThread = threadHasPermission(
        threadInfo,
        threadPermissions.LEAVE_THREAD,
      );

      if (viewerIsMember(threadInfo) && canLeaveThread) {
        buttons.push({
          itemType: 'leaveThread',
          key: 'leaveThread',
          threadInfo,
          navigate,
        });
      }

      const canDeleteThread = threadHasPermission(
        threadInfo,
        threadPermissions.DELETE_THREAD,
      );
      if (canDeleteThread) {
        buttons.push({
          itemType: 'deleteThread',
          key: 'deleteThread',
          threadInfo,
          navigate,
        });
      }

      const threadIsPersonal = threadInfo.type === threadTypes.PERSONAL;
      if (threadIsPersonal && viewerID) {
        const otherMemberID = getSingleOtherUser(threadInfo, viewerID);
        if (otherMemberID) {
          const otherUserInfo = userInfos[otherMemberID];
          const availableRelationshipActions =
            getAvailableRelationshipButtons(otherUserInfo);

          for (const action of availableRelationshipActions) {
            buttons.push({
              itemType: 'editRelationship',
              key: action,
              threadInfo,
              navigate,
              relationshipButton: action,
            });
          }
        }
      }

      const listData: ChatSettingsItem[] = [];
      if (buttons.length === 0) {
        return listData;
      }

      listData.push({
        itemType: 'header',
        key: 'actionsHeader',
        title: 'Actions',
        categoryType: 'unpadded',
      });
      for (let i = 0; i < buttons.length; i++) {
        // Necessary for Flow...
        if (buttons[i].itemType === 'editRelationship') {
          listData.push({
            ...buttons[i],
            buttonStyle: [
              i === 0 ? null : styles.nonTopButton,
              i === buttons.length - 1 ? styles.lastButton : null,
            ],
          });
        } else {
          listData.push({
            ...buttons[i],
            buttonStyle: [
              i === 0 ? null : styles.nonTopButton,
              i === buttons.length - 1 ? styles.lastButton : null,
            ],
          });
        }
      }
      listData.push({
        itemType: 'footer',
        key: 'actionsFooter',
        categoryType: 'unpadded',
      });

      return listData;
    },
  );

  listDataSelector = createSelector(
    this.threadBasicsListDataSelector,
    this.subchannelsListDataSelector,
    this.sidebarsListDataSelector,
    this.threadMembersListDataSelector,
    this.actionsListDataSelector,
    (
      threadBasicsListData: ChatSettingsItem[],
      subchannelsListData: ChatSettingsItem[],
      sidebarsListData: ChatSettingsItem[],
      threadMembersListData: ChatSettingsItem[],
      actionsListData: ChatSettingsItem[],
    ) => [
      ...threadBasicsListData,
      ...subchannelsListData,
      ...sidebarsListData,
      ...threadMembersListData,
      ...actionsListData,
    ],
  );

  get listData() {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  render() {
    return (
      <View
        style={this.props.styles.container}
        ref={this.flatListContainerRef}
        onLayout={this.onFlatListContainerLayout}
      >
        <ThreadAncestors threadInfo={this.props.threadInfo} />
        <FlatList
          data={this.listData}
          contentContainerStyle={this.props.styles.flatList}
          renderItem={this.renderItem}
          scrollEnabled={!ThreadSettings.scrollDisabled(this.props)}
          indicatorStyle={this.props.indicatorStyle}
          initialNumToRender={20}
        />
      </View>
    );
  }

  flatListContainerRef = (
    flatListContainer: ?React.ElementRef<typeof View>,
  ) => {
    this.flatListContainer = flatListContainer;
  };

  onFlatListContainerLayout = () => {
    const { flatListContainer } = this;
    if (!flatListContainer) {
      return;
    }

    const { keyboardState } = this.props;
    if (!keyboardState || keyboardState.keyboardShowing) {
      return;
    }

    flatListContainer.measure((x, y, width, height, pageX, pageY) => {
      if (
        height === null ||
        height === undefined ||
        pageY === null ||
        pageY === undefined
      ) {
        return;
      }
      this.setState({ verticalBounds: { height, y: pageY } });
    });
  };

  renderItem = (row: { item: ChatSettingsItem, ... }) => {
    const item = row.item;
    if (item.itemType === 'header') {
      return (
        <ThreadSettingsCategoryHeader
          type={item.categoryType}
          title={item.title}
        />
      );
    } else if (item.itemType === 'footer') {
      return <ThreadSettingsCategoryFooter type={item.categoryType} />;
    } else if (item.itemType === 'name') {
      return (
        <ThreadSettingsName
          threadInfo={item.threadInfo}
          nameEditValue={item.nameEditValue}
          setNameEditValue={this.setNameEditValue}
          canChangeSettings={item.canChangeSettings}
        />
      );
    } else if (item.itemType === 'color') {
      return (
        <ThreadSettingsColor
          threadInfo={item.threadInfo}
          colorEditValue={item.colorEditValue}
          setColorEditValue={this.setColorEditValue}
          canChangeSettings={item.canChangeSettings}
          navigate={item.navigate}
          threadSettingsRouteKey={item.threadSettingsRouteKey}
        />
      );
    } else if (item.itemType === 'description') {
      return (
        <ThreadSettingsDescription
          threadInfo={item.threadInfo}
          descriptionEditValue={item.descriptionEditValue}
          setDescriptionEditValue={this.setDescriptionEditValue}
          descriptionTextHeight={item.descriptionTextHeight}
          setDescriptionTextHeight={this.setDescriptionTextHeight}
          canChangeSettings={item.canChangeSettings}
        />
      );
    } else if (item.itemType === 'parent') {
      return (
        <ThreadSettingsParent
          threadInfo={item.threadInfo}
          parentThreadInfo={item.parentThreadInfo}
        />
      );
    } else if (item.itemType === 'visibility') {
      return <ThreadSettingsVisibility threadInfo={item.threadInfo} />;
    } else if (item.itemType === 'pushNotifs') {
      return <ThreadSettingsPushNotifs threadInfo={item.threadInfo} />;
    } else if (item.itemType === 'homeNotifs') {
      return <ThreadSettingsHomeNotifs threadInfo={item.threadInfo} />;
    } else if (item.itemType === 'seeMore') {
      return <ThreadSettingsSeeMore onPress={item.onPress} />;
    } else if (item.itemType === 'childThread') {
      return (
        <ThreadSettingsChildThread
          threadInfo={item.threadInfo}
          firstListItem={item.firstListItem}
          lastListItem={item.lastListItem}
        />
      );
    } else if (item.itemType === 'addSubchannel') {
      return (
        <ThreadSettingsAddSubchannel onPress={this.onPressComposeSubchannel} />
      );
    } else if (item.itemType === 'member') {
      return (
        <ThreadSettingsMember
          memberInfo={item.memberInfo}
          threadInfo={item.threadInfo}
          canEdit={item.canEdit}
          navigate={item.navigate}
          firstListItem={item.firstListItem}
          lastListItem={item.lastListItem}
          verticalBounds={item.verticalBounds}
          threadSettingsRouteKey={item.threadSettingsRouteKey}
        />
      );
    } else if (item.itemType === 'addMember') {
      return <ThreadSettingsAddMember onPress={this.onPressAddMember} />;
    } else if (item.itemType === 'leaveThread') {
      return (
        <ThreadSettingsLeaveThread
          threadInfo={item.threadInfo}
          buttonStyle={item.buttonStyle}
        />
      );
    } else if (item.itemType === 'deleteThread') {
      return (
        <ThreadSettingsDeleteThread
          threadInfo={item.threadInfo}
          navigate={item.navigate}
          buttonStyle={item.buttonStyle}
        />
      );
    } else if (item.itemType === 'promoteSidebar') {
      return (
        <ThreadSettingsPromoteSidebar
          threadInfo={item.threadInfo}
          buttonStyle={item.buttonStyle}
        />
      );
    } else if (item.itemType === 'editRelationship') {
      return (
        <ThreadSettingsEditRelationship
          threadInfo={item.threadInfo}
          relationshipButton={item.relationshipButton}
          buttonStyle={item.buttonStyle}
        />
      );
    } else {
      invariant(false, `unexpected ThreadSettings item type ${item.itemType}`);
    }
  };

  setNameEditValue = (value: ?string, callback?: () => void) => {
    this.setState({ nameEditValue: value }, callback);
  };

  setColorEditValue = (color: string) => {
    this.setState({ colorEditValue: color });
  };

  setDescriptionEditValue = (value: ?string, callback?: () => void) => {
    this.setState({ descriptionEditValue: value }, callback);
  };

  setDescriptionTextHeight = (height: number) => {
    this.setState({ descriptionTextHeight: height });
  };

  onPressComposeSubchannel = () => {
    this.props.navigation.navigate(ComposeSubchannelModalRouteName, {
      presentedFrom: this.props.route.key,
      threadInfo: this.props.threadInfo,
    });
  };

  onPressAddMember = () => {
    this.props.navigation.navigate(AddUsersModalRouteName, {
      presentedFrom: this.props.route.key,
      threadInfo: this.props.threadInfo,
    });
  };

  onPressSeeMoreMembers = () => {
    this.setState(prevState => ({
      numMembersShowing: prevState.numMembersShowing + itemPageLength,
    }));
  };

  onPressSeeMoreSubchannels = () => {
    this.setState(prevState => ({
      numSubchannelsShowing: prevState.numSubchannelsShowing + itemPageLength,
    }));
  };

  onPressSeeMoreSidebars = () => {
    this.setState(prevState => ({
      numSidebarsShowing: prevState.numSidebarsShowing + itemPageLength,
    }));
  };
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelBackground',
    flex: 1,
  },
  flatList: {
    paddingVertical: 16,
  },
  nonTopButton: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  lastButton: {
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
  },
};

const editNameLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:name`,
);
const editColorLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:color`,
);
const editDescriptionLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:description`,
);
const leaveThreadLoadingStatusSelector = createLoadingStatusSelector(
  leaveThreadActionTypes,
);

const somethingIsSaving = (
  state: AppState,
  threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
) => {
  if (
    editNameLoadingStatusSelector(state) === 'loading' ||
    editColorLoadingStatusSelector(state) === 'loading' ||
    editDescriptionLoadingStatusSelector(state) === 'loading' ||
    leaveThreadLoadingStatusSelector(state) === 'loading'
  ) {
    return true;
  }
  for (const threadMember of threadMembers) {
    const removeUserLoadingStatus = createLoadingStatusSelector(
      removeUsersFromThreadActionTypes,
      `${removeUsersFromThreadActionTypes.started}:${threadMember.id}`,
    )(state);
    if (removeUserLoadingStatus === 'loading') {
      return true;
    }
    const changeRoleLoadingStatus = createLoadingStatusSelector(
      changeThreadMemberRolesActionTypes,
      `${changeThreadMemberRolesActionTypes.started}:${threadMember.id}`,
    )(state);
    if (changeRoleLoadingStatus === 'loading') {
      return true;
    }
  }
  return false;
};

const ConnectedThreadSettings: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettings(props: BaseProps) {
    const userInfos = useSelector(state => state.userStore.userInfos);
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const threadID = props.route.params.threadInfo.id;

    const reduxThreadInfo: ?ThreadInfo = useSelector(
      state => threadInfoSelector(state)[threadID],
    );
    React.useEffect(() => {
      invariant(
        reduxThreadInfo,
        'ReduxThreadInfo should exist when ThreadSettings is opened',
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { setParams } = props.navigation;
    React.useEffect(() => {
      if (reduxThreadInfo) {
        setParams({ threadInfo: reduxThreadInfo });
      }
    }, [reduxThreadInfo, setParams]);
    const threadInfo: ThreadInfo =
      reduxThreadInfo ?? props.route.params.threadInfo;
    const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);

    React.useEffect(() => {
      if (threadInChatList(threadInfo)) {
        return undefined;
      }
      threadWatcher.watchID(threadInfo.id);
      return () => {
        threadWatcher.removeID(threadInfo.id);
      };
    }, [threadInfo]);

    const parentThreadID = threadInfo.parentThreadID;
    const parentThreadInfo: ?ThreadInfo = useSelector(state =>
      parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
    );
    const resolvedParentThreadInfo =
      useResolvedOptionalThreadInfo(parentThreadInfo);
    const threadMembers = threadInfo.members;
    const boundChildThreadInfos = useSelector(
      state => childThreadInfos(state)[threadID],
    );
    const resolvedChildThreadInfos = useResolvedOptionalThreadInfos(
      boundChildThreadInfos,
    );
    const boundSomethingIsSaving = useSelector(state =>
      somethingIsSaving(state, threadMembers),
    );

    const { navigation } = props;
    React.useEffect(() => {
      const tabNavigation: ?TabNavigationProp<'Chat'> = navigation.getParent();
      invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');

      const onTabPress = () => {
        if (navigation.isFocused() && !boundSomethingIsSaving) {
          navigation.popToTop();
        }
      };

      tabNavigation.addListener('tabPress', onTabPress);
      return () => tabNavigation.removeListener('tabPress', onTabPress);
    }, [navigation, boundSomethingIsSaving]);

    const styles = useStyles(unboundStyles);
    const indicatorStyle = useIndicatorStyle();
    const overlayContext = React.useContext(OverlayContext);
    const keyboardState = React.useContext(KeyboardContext);
    const { canPromoteSidebar } = usePromoteSidebar(threadInfo);
    return (
      <ThreadSettings
        {...props}
        userInfos={userInfos}
        viewerID={viewerID}
        threadInfo={resolvedThreadInfo}
        parentThreadInfo={resolvedParentThreadInfo}
        childThreadInfos={resolvedChildThreadInfos}
        somethingIsSaving={boundSomethingIsSaving}
        styles={styles}
        indicatorStyle={indicatorStyle}
        overlayContext={overlayContext}
        keyboardState={keyboardState}
        canPromoteSidebar={canPromoteSidebar}
      />
    );
  });

export default ConnectedThreadSettings;
