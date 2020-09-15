// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  type RelativeMemberInfo,
  relativeMemberInfoPropType,
  threadPermissions,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux/redux-setup';
import type { CategoryType } from './thread-settings-category.react';
import type { VerticalBounds } from '../../types/layout-types';
import type { ChatNavigationProp } from '../chat.react';
import type { TabNavigationProp } from '../../navigation/app-navigator.react';
import type { NavigationRoute } from '../../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, FlatList } from 'react-native';
import invariant from 'invariant';
import { createSelector } from 'reselect';

import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';
import {
  threadInfoSelector,
  childThreadInfos,
} from 'lib/selectors/thread-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  changeThreadSettingsActionTypes,
  leaveThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions';
import {
  threadHasPermission,
  viewerIsMember,
  threadInChatList,
} from 'lib/shared/thread-utils';
import threadWatcher from 'lib/shared/thread-watcher';
import { connect } from 'lib/utils/redux-utils';

import {
  ThreadSettingsCategoryHeader,
  ThreadSettingsCategoryFooter,
} from './thread-settings-category.react';
import ThreadSettingsMember from './thread-settings-member.react';
import {
  ThreadSettingsSeeMore,
  ThreadSettingsAddMember,
  ThreadSettingsAddChildThread,
} from './thread-settings-list-action.react';
import ThreadSettingsChildThread from './thread-settings-child-thread.react';
import ThreadSettingsName from './thread-settings-name.react';
import ThreadSettingsColor from './thread-settings-color.react';
import ThreadSettingsDescription from './thread-settings-description.react';
import ThreadSettingsParent from './thread-settings-parent.react';
import ThreadSettingsVisibility from './thread-settings-visibility.react';
import ThreadSettingsPushNotifs from './thread-settings-push-notifs.react';
import ThreadSettingsHomeNotifs from './thread-settings-home-notifs.react';
import ThreadSettingsLeaveThread from './thread-settings-leave-thread.react';
import ThreadSettingsDeleteThread from './thread-settings-delete-thread.react';
import {
  AddUsersModalRouteName,
  ComposeSubthreadModalRouteName,
} from '../../navigation/route-names';
import {
  styleSelector,
  type IndicatorStyle,
  indicatorStylePropType,
  indicatorStyleSelector,
} from '../../themes/colors';
import {
  withOverlayContext,
  type OverlayContextType,
  overlayContextPropType,
} from '../../navigation/overlay-context';

const itemPageLength = 5;

export type ThreadSettingsParams = {|
  threadInfo: ThreadInfo,
|};

export type ThreadSettingsNavigate = $PropertyType<
  ChatNavigationProp<'ThreadSettings'>,
  'navigate',
>;

type ChatSettingsItem =
  | {|
      itemType: 'header',
      key: string,
      title: string,
      categoryType: CategoryType,
    |}
  | {|
      itemType: 'footer',
      key: string,
      categoryType: CategoryType,
    |}
  | {|
      itemType: 'name',
      key: string,
      threadInfo: ThreadInfo,
      nameEditValue: ?string,
      nameTextHeight: ?number,
      canChangeSettings: boolean,
    |}
  | {|
      itemType: 'color',
      key: string,
      threadInfo: ThreadInfo,
      colorEditValue: string,
      canChangeSettings: boolean,
      navigate: ThreadSettingsNavigate,
      threadSettingsRouteKey: string,
    |}
  | {|
      itemType: 'description',
      key: string,
      threadInfo: ThreadInfo,
      descriptionEditValue: ?string,
      descriptionTextHeight: ?number,
      canChangeSettings: boolean,
    |}
  | {|
      itemType: 'parent',
      key: string,
      threadInfo: ThreadInfo,
      navigate: ThreadSettingsNavigate,
    |}
  | {|
      itemType: 'visibility',
      key: string,
      threadInfo: ThreadInfo,
    |}
  | {|
      itemType: 'pushNotifs',
      key: string,
      threadInfo: ThreadInfo,
    |}
  | {|
      itemType: 'homeNotifs',
      key: string,
      threadInfo: ThreadInfo,
    |}
  | {|
      itemType: 'seeMore',
      key: string,
      onPress: () => void,
    |}
  | {|
      itemType: 'childThread',
      key: string,
      threadInfo: ThreadInfo,
      navigate: ThreadSettingsNavigate,
      lastListItem: boolean,
    |}
  | {|
      itemType: 'addChildThread',
      key: string,
    |}
  | {|
      itemType: 'member',
      key: string,
      memberInfo: RelativeMemberInfo,
      threadInfo: ThreadInfo,
      canEdit: boolean,
      navigate: ThreadSettingsNavigate,
      lastListItem: boolean,
      verticalBounds: ?VerticalBounds,
      threadSettingsRouteKey: string,
    |}
  | {|
      itemType: 'addMember',
      key: string,
    |}
  | {|
      itemType: 'leaveThread',
      key: string,
      threadInfo: ThreadInfo,
      canDeleteThread: boolean,
    |}
  | {|
      itemType: 'deleteThread',
      key: string,
      threadInfo: ThreadInfo,
      navigate: ThreadSettingsNavigate,
      canLeaveThread: boolean,
    |};

type Props = {|
  navigation: ChatNavigationProp<'ThreadSettings'>,
  route: NavigationRoute<'ThreadSettings'>,
  // Redux state
  threadInfo: ?ThreadInfo,
  threadMembers: RelativeMemberInfo[],
  childThreadInfos: ?(ThreadInfo[]),
  somethingIsSaving: boolean,
  styles: typeof styles,
  indicatorStyle: IndicatorStyle,
  // withOverlayContext
  overlayContext: ?OverlayContextType,
|};
type State = {|
  showMaxMembers: number,
  showMaxChildThreads: number,
  nameEditValue: ?string,
  descriptionEditValue: ?string,
  nameTextHeight: ?number,
  descriptionTextHeight: ?number,
  colorEditValue: string,
  verticalBounds: ?VerticalBounds,
|};
type PropsAndState = {| ...Props, ...State |};
class ThreadSettings extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
      setParams: PropTypes.func.isRequired,
      setOptions: PropTypes.func.isRequired,
      dangerouslyGetParent: PropTypes.func.isRequired,
      isFocused: PropTypes.func.isRequired,
      popToTop: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      key: PropTypes.string.isRequired,
      params: PropTypes.shape({
        threadInfo: threadInfoPropType.isRequired,
      }).isRequired,
    }).isRequired,
    threadInfo: threadInfoPropType,
    threadMembers: PropTypes.arrayOf(relativeMemberInfoPropType).isRequired,
    childThreadInfos: PropTypes.arrayOf(threadInfoPropType),
    somethingIsSaving: PropTypes.bool.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    indicatorStyle: indicatorStylePropType.isRequired,
    overlayContext: overlayContextPropType,
  };
  flatListContainer: ?React.ElementRef<typeof View>;

  constructor(props: Props) {
    super(props);
    const threadInfo = props.threadInfo;
    invariant(threadInfo, 'ThreadInfo should exist when ThreadSettings opened');
    this.state = {
      showMaxMembers: itemPageLength,
      showMaxChildThreads: itemPageLength,
      nameEditValue: null,
      descriptionEditValue: null,
      nameTextHeight: null,
      descriptionTextHeight: null,
      colorEditValue: threadInfo.color,
      verticalBounds: null,
    };
  }

  static getThreadInfo(props: {
    threadInfo: ?ThreadInfo,
    route: NavigationRoute<'ThreadSettings'>,
    ...
  }): ThreadInfo {
    const { threadInfo } = props;
    if (threadInfo) {
      return threadInfo;
    }
    return props.route.params.threadInfo;
  }

  static scrollDisabled(props: Props) {
    const { overlayContext } = props;
    invariant(overlayContext, 'ThreadSettings should have OverlayContext');
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  componentDidMount() {
    const threadInfo = ThreadSettings.getThreadInfo(this.props);
    if (!threadInChatList(threadInfo)) {
      threadWatcher.watchID(threadInfo.id);
    }
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.dangerouslyGetParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.addListener('tabPress', this.onTabPress);
  }

  componentWillUnmount() {
    const threadInfo = ThreadSettings.getThreadInfo(this.props);
    if (!threadInChatList(threadInfo)) {
      threadWatcher.removeID(threadInfo.id);
    }
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.dangerouslyGetParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.removeListener('tabPress', this.onTabPress);
  }

  onTabPress = () => {
    if (this.props.navigation.isFocused() && !this.props.somethingIsSaving) {
      this.props.navigation.popToTop();
    }
  };

  componentDidUpdate(prevProps: Props) {
    const oldReduxThreadInfo = prevProps.threadInfo;
    const newReduxThreadInfo = this.props.threadInfo;
    if (newReduxThreadInfo && newReduxThreadInfo !== oldReduxThreadInfo) {
      this.props.navigation.setParams({ threadInfo: newReduxThreadInfo });
    }

    const oldNavThreadInfo = ThreadSettings.getThreadInfo(prevProps);
    const newNavThreadInfo = ThreadSettings.getThreadInfo(this.props);
    if (oldNavThreadInfo.id !== newNavThreadInfo.id) {
      if (!threadInChatList(oldNavThreadInfo)) {
        threadWatcher.removeID(oldNavThreadInfo.id);
      }
      if (!threadInChatList(newNavThreadInfo)) {
        threadWatcher.watchID(newNavThreadInfo.id);
      }
    }
    if (
      newNavThreadInfo.color !== oldNavThreadInfo.color &&
      this.state.colorEditValue === oldNavThreadInfo.color
    ) {
      this.setState({ colorEditValue: newNavThreadInfo.color });
    }

    const scrollIsDisabled = ThreadSettings.scrollDisabled(this.props);
    const scrollWasDisabled = ThreadSettings.scrollDisabled(prevProps);
    if (!scrollWasDisabled && scrollIsDisabled) {
      this.props.navigation.setOptions({ gestureEnabled: false });
    } else if (scrollWasDisabled && !scrollIsDisabled) {
      this.props.navigation.setOptions({ gestureEnabled: true });
    }
  }

  listDataSelector = createSelector(
    (propsAndState: PropsAndState) =>
      ThreadSettings.getThreadInfo(propsAndState),
    (propsAndState: PropsAndState) => propsAndState.nameEditValue,
    (propsAndState: PropsAndState) => propsAndState.nameTextHeight,
    (propsAndState: PropsAndState) => propsAndState.colorEditValue,
    (propsAndState: PropsAndState) => propsAndState.descriptionEditValue,
    (propsAndState: PropsAndState) => propsAndState.descriptionTextHeight,
    (propsAndState: PropsAndState) => !propsAndState.somethingIsSaving,
    (propsAndState: PropsAndState) => propsAndState.navigation.navigate,
    (propsAndState: PropsAndState) => propsAndState.route.key,
    (propsAndState: PropsAndState) => propsAndState.childThreadInfos,
    (propsAndState: PropsAndState) => propsAndState.showMaxChildThreads,
    (propsAndState: PropsAndState) => propsAndState.threadMembers,
    (propsAndState: PropsAndState) => propsAndState.showMaxMembers,
    (propsAndState: PropsAndState) => propsAndState.verticalBounds,
    (
      threadInfo: ThreadInfo,
      nameEditValue: ?string,
      nameTextHeight: ?number,
      colorEditValue: string,
      descriptionEditValue: ?string,
      descriptionTextHeight: ?number,
      canStartEditing: boolean,
      navigate: ThreadSettingsNavigate,
      routeKey: string,
      childThreads: ?(ThreadInfo[]),
      showMaxChildThreads: number,
      threadMembers: RelativeMemberInfo[],
      showMaxMembers: number,
      verticalBounds: ?VerticalBounds,
    ) => {
      const canEditThread = threadHasPermission(
        threadInfo,
        threadPermissions.EDIT_THREAD,
      );
      const canChangeSettings = canEditThread && canStartEditing;

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
        nameTextHeight,
        canChangeSettings,
      });
      listData.push({
        itemType: 'color',
        key: 'color',
        threadInfo,
        colorEditValue,
        canChangeSettings,
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
        canEditThread
      ) {
        listData.push({
          itemType: 'description',
          key: 'description',
          threadInfo,
          descriptionEditValue,
          descriptionTextHeight,
          canChangeSettings,
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
        listData.push({
          itemType: 'homeNotifs',
          key: 'homeNotifs',
          threadInfo,
        });
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
        itemType: 'parent',
        key: 'parent',
        threadInfo,
        navigate,
      });
      listData.push({
        itemType: 'visibility',
        key: 'visibility',
        threadInfo,
      });
      listData.push({
        itemType: 'footer',
        key: 'privacyFooter',
        categoryType: 'full',
      });

      let childThreadItems = null;
      if (childThreads) {
        let childThreadInfosSlice;
        let seeMoreChildThreads = null;
        if (childThreads.length > showMaxChildThreads) {
          childThreadInfosSlice = childThreads.slice(0, showMaxChildThreads);
          seeMoreChildThreads = {
            itemType: 'seeMore',
            key: 'seeMoreChildThreads',
            onPress: this.onPressSeeMoreChildThreads,
          };
        } else {
          childThreadInfosSlice = childThreads;
        }
        const childThreadSlice = childThreadInfosSlice.map(childThreadInfo => ({
          itemType: 'childThread',
          key: `childThread${childThreadInfo.id}`,
          threadInfo: childThreadInfo,
          navigate,
          lastListItem: false,
        }));
        if (seeMoreChildThreads) {
          childThreadItems = [...childThreadSlice, seeMoreChildThreads];
        } else {
          childThreadSlice[childThreadSlice.length - 1].lastListItem = true;
          childThreadItems = childThreadSlice;
        }
      }

      let addChildThread = null;
      const canCreateSubthreads = threadHasPermission(
        threadInfo,
        threadPermissions.CREATE_SUBTHREADS,
      );
      if (canCreateSubthreads) {
        addChildThread = {
          itemType: 'addChildThread',
          key: 'addChildThread',
        };
      }

      if (addChildThread || childThreadItems) {
        listData.push({
          itemType: 'header',
          key: 'childThreadHeader',
          title: 'Child threads',
          categoryType: 'unpadded',
        });
      }
      if (addChildThread) {
        listData.push(addChildThread);
      }
      if (childThreadItems) {
        listData.push(...childThreadItems);
      }
      if (addChildThread || childThreadItems) {
        listData.push({
          itemType: 'footer',
          key: 'childThreadFooter',
          categoryType: 'unpadded',
        });
      }

      let threadMemberItems;
      let seeMoreMembers = null;
      if (threadMembers.length > showMaxMembers) {
        threadMemberItems = threadMembers.slice(0, showMaxMembers);
        seeMoreMembers = {
          itemType: 'seeMore',
          key: 'seeMoreMembers',
          onPress: this.onPressSeeMoreMembers,
        };
      } else {
        threadMemberItems = threadMembers;
      }
      const members = threadMemberItems.map(memberInfo => ({
        itemType: 'member',
        key: `member${memberInfo.id}`,
        memberInfo,
        threadInfo,
        canEdit: canStartEditing,
        navigate,
        lastListItem: false,
        verticalBounds,
        threadSettingsRouteKey: routeKey,
      }));

      let membershipItems;
      if (seeMoreMembers) {
        membershipItems = [...members, seeMoreMembers];
      } else if (members.length > 0) {
        members[members.length - 1].lastListItem = true;
        membershipItems = members;
      }

      let addMembers = null;
      const canAddMembers = threadHasPermission(
        threadInfo,
        threadPermissions.ADD_MEMBERS,
      );
      if (canAddMembers) {
        addMembers = {
          itemType: 'addMember',
          key: 'addMember',
        };
      }

      if (addMembers || membershipItems) {
        listData.push({
          itemType: 'header',
          key: 'memberHeader',
          title: 'Members',
          categoryType: 'unpadded',
        });
      }
      if (addMembers) {
        listData.push(addMembers);
      }
      if (membershipItems) {
        listData.push(...membershipItems);
      }
      if (addMembers || membershipItems) {
        listData.push({
          itemType: 'footer',
          key: 'memberFooter',
          categoryType: 'unpadded',
        });
      }

      const canDeleteThread = threadHasPermission(
        threadInfo,
        threadPermissions.DELETE_THREAD,
      );
      if (isMember || canDeleteThread) {
        listData.push({
          itemType: 'header',
          key: 'actionsHeader',
          title: 'Actions',
          categoryType: 'unpadded',
        });
      }
      if (isMember) {
        listData.push({
          itemType: 'leaveThread',
          key: 'leaveThread',
          threadInfo,
          canDeleteThread,
        });
      }
      if (canDeleteThread) {
        listData.push({
          itemType: 'deleteThread',
          key: 'deleteThread',
          threadInfo,
          navigate,
          canLeaveThread: isMember,
        });
      }
      if (isMember || canDeleteThread) {
        listData.push({
          itemType: 'footer',
          key: 'actionsFooter',
          categoryType: 'unpadded',
        });
      }

      return listData;
    },
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
        <FlatList
          data={this.listData}
          contentContainerStyle={this.props.styles.flatList}
          renderItem={this.renderItem}
          scrollEnabled={!ThreadSettings.scrollDisabled(this.props)}
          indicatorStyle={this.props.indicatorStyle}
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

  renderItem = (row: { item: ChatSettingsItem }) => {
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
          nameTextHeight={item.nameTextHeight}
          setNameTextHeight={this.setNameTextHeight}
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
          navigate={item.navigate}
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
          navigate={item.navigate}
          lastListItem={item.lastListItem}
        />
      );
    } else if (item.itemType === 'addChildThread') {
      return (
        <ThreadSettingsAddChildThread onPress={this.onPressComposeSubthread} />
      );
    } else if (item.itemType === 'member') {
      return (
        <ThreadSettingsMember
          memberInfo={item.memberInfo}
          threadInfo={item.threadInfo}
          canEdit={item.canEdit}
          navigate={item.navigate}
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
          canDeleteThread={item.canDeleteThread}
        />
      );
    } else if (item.itemType === 'deleteThread') {
      return (
        <ThreadSettingsDeleteThread
          threadInfo={item.threadInfo}
          canLeaveThread={item.canLeaveThread}
          navigate={item.navigate}
        />
      );
    } else {
      invariant(false, `unexpected ThreadSettings item type ${item.itemType}`);
    }
  };

  setNameEditValue = (value: ?string, callback?: () => void) => {
    this.setState({ nameEditValue: value }, callback);
  };

  setNameTextHeight = (height: number) => {
    this.setState({ nameTextHeight: height });
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

  onPressComposeSubthread = () => {
    const threadInfo = ThreadSettings.getThreadInfo(this.props);
    this.props.navigation.navigate(ComposeSubthreadModalRouteName, {
      presentedFrom: this.props.route.key,
      threadInfo,
    });
  };

  onPressAddMember = () => {
    const threadInfo = ThreadSettings.getThreadInfo(this.props);
    this.props.navigation.navigate(AddUsersModalRouteName, {
      presentedFrom: this.props.route.key,
      threadInfo,
    });
  };

  onPressSeeMoreMembers = () => {
    this.setState(prevState => ({
      showMaxMembers: prevState.showMaxMembers + itemPageLength,
    }));
  };

  onPressSeeMoreChildThreads = () => {
    this.setState(prevState => ({
      showMaxChildThreads: prevState.showMaxChildThreads + itemPageLength,
    }));
  };
}

const styles = {
  container: {
    backgroundColor: 'panelBackground',
    flex: 1,
  },
  flatList: {
    paddingVertical: 16,
  },
};
const stylesSelector = styleSelector(styles);

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
  threadMembers: RelativeMemberInfo[],
) => {
  if (
    editNameLoadingStatusSelector(state) === 'loading' ||
    editColorLoadingStatusSelector(state) === 'loading' ||
    editDescriptionLoadingStatusSelector(state) === 'loading' ||
    leaveThreadLoadingStatusSelector(state) === 'loading'
  ) {
    return true;
  }
  for (let threadMember of threadMembers) {
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

export default connect(
  (
    state: AppState,
    ownProps: {
      route: NavigationRoute<'ThreadSettings'>,
    },
  ) => {
    const threadID = ownProps.route.params.threadInfo.id;
    const threadMembers = relativeMemberInfoSelectorForMembersOfThread(
      threadID,
    )(state);
    return {
      threadInfo: threadInfoSelector(state)[threadID],
      threadMembers,
      childThreadInfos: childThreadInfos(state)[threadID],
      somethingIsSaving: somethingIsSaving(state, threadMembers),
      styles: stylesSelector(state),
      indicatorStyle: indicatorStyleSelector(state),
    };
  },
)(withOverlayContext(ThreadSettings));
