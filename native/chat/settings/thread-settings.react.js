// @flow

import type {
  BottomTabNavigationEventMap,
  BottomTabOptions,
  TabNavigationState,
} from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import { Platform, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { createSelector } from 'reselect';
import tinycolor from 'tinycolor2';

import {
  fetchPrimaryInviteLinkActionTypes,
  useFetchPrimaryInviteLinks,
} from 'lib/actions/link-actions.js';
import {
  changeThreadMemberRolesActionTypes,
  changeThreadSettingsActionTypes,
  leaveThreadActionTypes,
  removeUsersFromThreadActionTypes,
} from 'lib/actions/thread-action-types.js';
import { usePromoteSidebar } from 'lib/hooks/promote-sidebar.react.js';
import { useAddUsersPermissions } from 'lib/permissions/add-users-permissions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  childThreadInfos,
  threadInfoSelector,
} from 'lib/selectors/thread-selectors.js';
import { getAvailableRelationshipButtons } from 'lib/shared/relationship-utils.js';
import {
  getSingleOtherUser,
  threadIsChannel,
  useThreadHasPermission,
  useIsThreadInChatList,
  viewerIsMember,
} from 'lib/shared/thread-utils.js';
import threadWatcher from 'lib/shared/thread-watcher.js';
import {
  threadSpecs,
  threadTypeIsPersonal,
  threadTypeIsSidebar,
} from 'lib/shared/threads/thread-specs.js';
import type {
  RelativeMemberInfo,
  ResolvedThreadInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { RelationshipButton } from 'lib/types/relationship-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type { UserInfos } from 'lib/types/user-types.js';
import {
  useResolvedOptionalThreadInfo,
  useResolvedOptionalThreadInfos,
  useResolvedThreadInfo,
} from 'lib/utils/entity-helpers.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import ThreadSettingsAvatar from './thread-settings-avatar.react.js';
import type { CategoryType } from './thread-settings-category.react.js';
import {
  ThreadSettingsCategoryActionHeader,
  ThreadSettingsCategoryFooter,
  ThreadSettingsCategoryHeader,
} from './thread-settings-category.react.js';
import ThreadSettingsChildThread from './thread-settings-child-thread.react.js';
import ThreadSettingsColor from './thread-settings-color.react.js';
import ThreadSettingsDeleteThread from './thread-settings-delete-thread.react.js';
import ThreadSettingsDescription from './thread-settings-description.react.js';
import ThreadSettingsEditRelationship from './thread-settings-edit-relationship.react.js';
import ThreadSettingsLeaveThread from './thread-settings-leave-thread.react.js';
import {
  ThreadSettingsAddMember,
  ThreadSettingsAddSubchannel,
  ThreadSettingsSeeMore,
} from './thread-settings-list-action.react.js';
import ThreadSettingsMediaGallery from './thread-settings-media-gallery.react.js';
import ThreadSettingsMember from './thread-settings-member.react.js';
import ThreadSettingsName from './thread-settings-name.react.js';
import ThreadSettingsParent from './thread-settings-parent.react.js';
import ThreadSettingsPromoteSidebar from './thread-settings-promote-sidebar.react.js';
import ThreadSettingsPushNotifs from './thread-settings-push-notifs.react.js';
import ThreadSettingsVisibility from './thread-settings-visibility.react.js';
import ThreadAncestors from '../../components/thread-ancestors.react.js';
import {
  KeyboardContext,
  type KeyboardState,
} from '../../keyboard/keyboard-state.js';
import { defaultStackScreenOptions } from '../../navigation/options.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../../navigation/overlay-context.js';
import {
  InviteLinkNavigatorRouteName,
  ViewInviteLinksRouteName,
  ManagePublicLinkRouteName,
  AddUsersModalRouteName,
} from '../../navigation/route-names.js';
import {
  ComposeSubchannelModalRouteName,
  FullScreenThreadMediaGalleryRouteName,
  type NavigationRoute,
  type ScreenParamList,
} from '../../navigation/route-names.js';
import type { TabNavigationProp } from '../../navigation/tab-navigator.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import type { AppState } from '../../redux/state-types.js';
import {
  type IndicatorStyle,
  useIndicatorStyle,
  useStyles,
} from '../../themes/colors.js';
import type { VerticalBounds } from '../../types/layout-types.js';
import type { ViewStyle } from '../../types/styles.js';
import type { ChatNavigationProp } from '../chat.react.js';

const itemPageLength = 5;

export type ThreadSettingsParams = {
  +threadInfo: ThreadInfo,
};

export type ThreadSettingsNavigate =
  ChatNavigationProp<'ThreadSettings'>['navigate'];

type ChatSettingsItem =
  | {
      +itemType: 'header',
      +key: string,
      +title: string,
      +categoryType: CategoryType,
    }
  | {
      +itemType: 'actionHeader',
      +key: string,
      +title: string,
      +actionText: string,
      +onPress: () => void,
    }
  | {
      +itemType: 'footer',
      +key: string,
      +categoryType: CategoryType,
    }
  | {
      +itemType: 'avatar',
      +key: string,
      +threadInfo: ResolvedThreadInfo,
      +canChangeSettings: boolean,
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
      +navigate: ThreadSettingsNavigate,
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
      +itemType: 'mediaGallery',
      +key: string,
      +threadInfo: ThreadInfo,
      +limit: number,
      +verticalBounds: ?VerticalBounds,
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
  +styles: $ReadOnly<typeof unboundStyles>,
  +indicatorStyle: IndicatorStyle,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  +canPromoteSidebar: boolean,
  +canEditThreadAvatar: boolean,
  +canEditThreadName: boolean,
  +canEditThreadDescription: boolean,
  +canEditThreadColor: boolean,
  +canCreateSubchannels: boolean,
  +canAddMembers: boolean,
  +canLeaveThread: boolean,
  +canDeleteThread: boolean,
  +canManageInviteLinks: boolean,
  +inviteLinkExists: boolean,
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

  static scrollDisabled(props: Props): boolean {
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

  threadBasicsListDataSelector: PropsAndState => $ReadOnlyArray<ChatSettingsItem> =
    createSelector(
      (propsAndState: PropsAndState) => propsAndState.threadInfo,
      (propsAndState: PropsAndState) => propsAndState.parentThreadInfo,
      (propsAndState: PropsAndState) => propsAndState.nameEditValue,
      (propsAndState: PropsAndState) => propsAndState.colorEditValue,
      (propsAndState: PropsAndState) => propsAndState.descriptionEditValue,
      (propsAndState: PropsAndState) => propsAndState.descriptionTextHeight,
      (propsAndState: PropsAndState) => !propsAndState.somethingIsSaving,
      (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
      (propsAndState: PropsAndState) => propsAndState.route.key,
      (propsAndState: PropsAndState) => propsAndState.canEditThreadAvatar,
      (propsAndState: PropsAndState) => propsAndState.canEditThreadName,
      (propsAndState: PropsAndState) => propsAndState.canEditThreadDescription,
      (propsAndState: PropsAndState) => propsAndState.canEditThreadColor,
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
        canEditThreadAvatar: boolean,
        canEditThreadName: boolean,
        canEditThreadDescription: boolean,
        canEditThreadColor: boolean,
      ) => {
        const canChangeAvatar = canEditThreadAvatar && canStartEditing;
        const canChangeName = canEditThreadName && canStartEditing;
        const canChangeDescription =
          canEditThreadDescription && canStartEditing;
        const canChangeColor = canEditThreadColor && canStartEditing;

        const listData: ChatSettingsItem[] = [];
        listData.push({
          itemType: 'header',
          key: 'avatarHeader',
          title: 'Channel Avatar',
          categoryType: 'unpadded',
        });
        listData.push({
          itemType: 'avatar',
          key: 'avatar',
          threadInfo,
          canChangeSettings: canChangeAvatar,
        });
        listData.push({
          itemType: 'footer',
          key: 'avatarFooter',
          categoryType: 'outline',
        });

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
          (descriptionEditValue !== null &&
            descriptionEditValue !== undefined) ||
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
            key: 'notificationsHeader',
            title: 'Notifications',
            categoryType: 'full',
          });
          listData.push({
            itemType: 'pushNotifs',
            key: 'pushNotifs',
            threadInfo,
            navigate,
          });
          listData.push({
            itemType: 'footer',
            key: 'notificationsFooter',
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

  subchannelsListDataSelector: PropsAndState => $ReadOnlyArray<ChatSettingsItem> =
    createSelector(
      (propsAndState: PropsAndState) => propsAndState.threadInfo,
      (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
      (propsAndState: PropsAndState) => propsAndState.childThreadInfos,
      (propsAndState: PropsAndState) => propsAndState.numSubchannelsShowing,
      (propsAndState: PropsAndState) => propsAndState.canCreateSubchannels,
      (
        threadInfo: ResolvedThreadInfo,
        navigate: ThreadSettingsNavigate,
        childThreads: ?$ReadOnlyArray<ResolvedThreadInfo>,
        numSubchannelsShowing: number,
        canCreateSubchannels: boolean,
      ) => {
        const listData: ChatSettingsItem[] = [];

        const subchannels = childThreads?.filter(threadIsChannel) ?? [];
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

  sidebarsListDataSelector: PropsAndState => $ReadOnlyArray<ChatSettingsItem> =
    createSelector(
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
          childThreads?.filter(childThreadInfo =>
            threadTypeIsSidebar(childThreadInfo.type),
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

  threadMembersListDataSelector: PropsAndState => $ReadOnlyArray<ChatSettingsItem> =
    createSelector(
      (propsAndState: PropsAndState) => propsAndState.threadInfo,
      (propsAndState: PropsAndState) => !propsAndState.somethingIsSaving,
      (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
      (propsAndState: PropsAndState) => propsAndState.route.key,
      (propsAndState: PropsAndState) => propsAndState.numMembersShowing,
      (propsAndState: PropsAndState) => propsAndState.verticalBounds,
      (propsAndState: PropsAndState) => propsAndState.canAddMembers,
      (
        threadInfo: ResolvedThreadInfo,
        canStartEditing: boolean,
        navigate: ThreadSettingsNavigate,
        routeKey: string,
        numMembersShowing: number,
        verticalBounds: ?VerticalBounds,
        canAddMembers: boolean,
      ) => {
        const listData: ChatSettingsItem[] = [];

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

  mediaGalleryListDataSelector: PropsAndState => $ReadOnlyArray<ChatSettingsItem> =
    createSelector(
      (propsAndState: PropsAndState) => propsAndState.threadInfo,
      (propsAndState: PropsAndState) => propsAndState.verticalBounds,
      (threadInfo: ThreadInfo, verticalBounds: ?VerticalBounds) => {
        const listData: ChatSettingsItem[] = [];
        const limit = 6;

        if (
          !threadSpecs[threadInfo.type].protocol().presentationDetails
            .supportsMediaGallery
        ) {
          return listData;
        }

        listData.push({
          itemType: 'mediaGallery',
          key: 'mediaGallery',
          threadInfo,
          limit,
          verticalBounds,
        });

        return listData;
      },
    );

  actionsListDataSelector: PropsAndState => $ReadOnlyArray<ChatSettingsItem> =
    createSelector(
      (propsAndState: PropsAndState) => propsAndState.threadInfo,
      (propsAndState: PropsAndState) => propsAndState.parentThreadInfo,
      (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
      (propsAndState: PropsAndState) => propsAndState.styles,
      (propsAndState: PropsAndState) => propsAndState.userInfos,
      (propsAndState: PropsAndState) => propsAndState.viewerID,
      (propsAndState: PropsAndState) => propsAndState.canLeaveThread,
      (propsAndState: PropsAndState) => propsAndState.canDeleteThread,
      (
        threadInfo: ResolvedThreadInfo,
        parentThreadInfo: ?ResolvedThreadInfo,
        navigate: ThreadSettingsNavigate,
        styles: $ReadOnly<typeof unboundStyles>,
        userInfos: UserInfos,
        viewerID: ?string,
        canLeaveThread: boolean,
        canDeleteThread: boolean,
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

        if (viewerIsMember(threadInfo) && canLeaveThread) {
          buttons.push({
            itemType: 'leaveThread',
            key: 'leaveThread',
            threadInfo,
            navigate,
          });
        }

        if (canDeleteThread) {
          buttons.push({
            itemType: 'deleteThread',
            key: 'deleteThread',
            threadInfo,
            navigate,
          });
        }

        if (threadInfo && threadTypeIsPersonal(threadInfo.type) && viewerID) {
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

  listDataSelector: PropsAndState => $ReadOnlyArray<ChatSettingsItem> =
    createSelector(
      this.threadBasicsListDataSelector,
      this.subchannelsListDataSelector,
      this.sidebarsListDataSelector,
      this.threadMembersListDataSelector,
      this.mediaGalleryListDataSelector,
      this.actionsListDataSelector,
      (
        threadBasicsListData: $ReadOnlyArray<ChatSettingsItem>,
        subchannelsListData: $ReadOnlyArray<ChatSettingsItem>,
        sidebarsListData: $ReadOnlyArray<ChatSettingsItem>,
        threadMembersListData: $ReadOnlyArray<ChatSettingsItem>,
        mediaGalleryListData: $ReadOnlyArray<ChatSettingsItem>,
        actionsListData: $ReadOnlyArray<ChatSettingsItem>,
      ) => [
        ...threadBasicsListData,
        ...subchannelsListData,
        ...sidebarsListData,
        ...threadMembersListData,
        ...mediaGalleryListData,
        ...actionsListData,
      ],
    );

  get listData(): $ReadOnlyArray<ChatSettingsItem> {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  render(): React.Node {
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

  // ESLint doesn't recognize that invariant always throws
  // eslint-disable-next-line consistent-return
  renderItem = (row: { +item: ChatSettingsItem, ... }): React.Node => {
    const item = row.item;
    if (item.itemType === 'header') {
      return (
        <ThreadSettingsCategoryHeader
          type={item.categoryType}
          title={item.title}
        />
      );
    } else if (item.itemType === 'actionHeader') {
      return (
        <ThreadSettingsCategoryActionHeader
          title={item.title}
          actionText={item.actionText}
          onPress={item.onPress}
        />
      );
    } else if (item.itemType === 'footer') {
      return <ThreadSettingsCategoryFooter type={item.categoryType} />;
    } else if (item.itemType === 'avatar') {
      return (
        <ThreadSettingsAvatar
          threadInfo={item.threadInfo}
          canChangeSettings={item.canChangeSettings}
        />
      );
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
      return (
        <ThreadSettingsPushNotifs
          threadInfo={item.threadInfo}
          navigate={item.navigate}
        />
      );
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
    } else if (item.itemType === 'mediaGallery') {
      return (
        <ThreadSettingsMediaGallery
          threadID={item.threadInfo.id}
          limit={item.limit}
          verticalBounds={item.verticalBounds}
          onPressSeeMore={this.onPressSeeMoreMediaGallery}
        />
      );
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
    if (this.props.inviteLinkExists) {
      this.props.navigation.navigate(InviteLinkNavigatorRouteName, {
        screen: ViewInviteLinksRouteName,
        params: {
          community: this.props.threadInfo,
        },
      });
    } else if (this.props.canManageInviteLinks) {
      this.props.navigation.navigate(InviteLinkNavigatorRouteName, {
        screen: ManagePublicLinkRouteName,
        params: {
          community: this.props.threadInfo,
        },
      });
    } else {
      this.props.navigation.navigate(AddUsersModalRouteName, {
        presentedFrom: this.props.route.key,
        threadInfo: this.props.threadInfo,
      });
    }
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

  onPressSeeMoreMediaGallery = () => {
    this.props.navigation.navigate(FullScreenThreadMediaGalleryRouteName, {
      threadInfo: this.props.threadInfo,
    });
  };
}

const threadMembersChangeIsSaving = (
  state: AppState,
  threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
) => {
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

    const isThreadInChatList = useIsThreadInChatList(threadInfo);
    React.useEffect(() => {
      if (isThreadInChatList) {
        return undefined;
      }
      threadWatcher.watchID(threadInfo.id);
      return () => {
        threadWatcher.removeID(threadInfo.id);
      };
    }, [isThreadInChatList, threadInfo.id]);

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

    const somethingIsSaving = useSelector(state => {
      const editNameLoadingStatus = createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:${threadID}:name`,
      )(state);

      const editColorLoadingStatus = createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:${threadID}:color`,
      )(state);

      const editDescriptionLoadingStatus = createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:${threadID}:description`,
      )(state);

      const leaveThreadLoadingStatus = createLoadingStatusSelector(
        leaveThreadActionTypes,
        `${leaveThreadActionTypes.started}:${threadID}`,
      )(state);

      const boundThreadMembersChangeIsSaving = threadMembersChangeIsSaving(
        state,
        threadMembers,
      );

      return (
        boundThreadMembersChangeIsSaving ||
        editNameLoadingStatus === 'loading' ||
        editColorLoadingStatus === 'loading' ||
        editDescriptionLoadingStatus === 'loading' ||
        leaveThreadLoadingStatus === 'loading'
      );
    });

    const { navigation } = props;
    React.useEffect(() => {
      const tabNavigation = navigation.getParent<
        ScreenParamList,
        'Chat',
        TabNavigationState,
        BottomTabOptions,
        BottomTabNavigationEventMap,
        TabNavigationProp<'Chat'>,
      >();
      invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');

      const onTabPress = () => {
        if (navigation.isFocused() && !somethingIsSaving) {
          navigation.popToTop();
        }
      };

      tabNavigation.addListener('tabPress', onTabPress);
      return () => tabNavigation.removeListener('tabPress', onTabPress);
    }, [navigation, somethingIsSaving]);

    const styles = useStyles(unboundStyles);
    const indicatorStyle = useIndicatorStyle();
    const overlayContext = React.useContext(OverlayContext);
    const keyboardState = React.useContext(KeyboardContext);
    const { canPromoteSidebar } = usePromoteSidebar(threadInfo);

    const canEditThreadAvatar = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD_AVATAR,
    );

    const canEditThreadName = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD_NAME,
    );

    const canEditThreadDescription = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD_DESCRIPTION,
    );

    const canEditThreadColor = useThreadHasPermission(
      threadInfo,
      threadPermissions.EDIT_THREAD_COLOR,
    );

    const canCreateSubchannels = useThreadHasPermission(
      threadInfo,
      threadPermissions.CREATE_SUBCHANNELS,
    );

    const canLeaveThread = useThreadHasPermission(
      threadInfo,
      threadPermissions.LEAVE_THREAD,
    );

    const canDeleteThread = useThreadHasPermission(
      threadInfo,
      threadPermissions.DELETE_THREAD,
    );

    const { inviteLink, canManageLinks, canAddMembers, isCommunityRoot } =
      useAddUsersPermissions(threadInfo);

    const callFetchPrimaryLinks = useFetchPrimaryInviteLinks();
    const dispatchActionPromise = useDispatchActionPromise();
    // Because we don't support updates and persistance for invite links,
    // we have to fetch them whenever we want to display them.
    // Here we need invite links for the "Add users" button in ThreadSettings
    React.useEffect(() => {
      if (!isCommunityRoot) {
        return;
      }
      void dispatchActionPromise(
        fetchPrimaryInviteLinkActionTypes,
        callFetchPrimaryLinks(),
      );
    }, [callFetchPrimaryLinks, dispatchActionPromise, isCommunityRoot]);

    return (
      <ThreadSettings
        {...props}
        userInfos={userInfos}
        viewerID={viewerID}
        threadInfo={resolvedThreadInfo}
        parentThreadInfo={resolvedParentThreadInfo}
        childThreadInfos={resolvedChildThreadInfos}
        somethingIsSaving={somethingIsSaving}
        styles={styles}
        indicatorStyle={indicatorStyle}
        overlayContext={overlayContext}
        keyboardState={keyboardState}
        canPromoteSidebar={canPromoteSidebar}
        canEditThreadAvatar={canEditThreadAvatar}
        canEditThreadName={canEditThreadName}
        canEditThreadDescription={canEditThreadDescription}
        canEditThreadColor={canEditThreadColor}
        canCreateSubchannels={canCreateSubchannels}
        canAddMembers={canAddMembers}
        canLeaveThread={canLeaveThread}
        canDeleteThread={canDeleteThread}
        canManageInviteLinks={canManageLinks}
        inviteLinkExists={!!inviteLink}
      />
    );
  });

export default ConnectedThreadSettings;
