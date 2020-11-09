// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import {
  type RelationshipRequest,
  userRelationshipStatus,
  relationshipActions,
} from 'lib/types/relationship-types';
import type { NavigationRoute } from '../navigation/route-names';
import type { VerticalBounds } from '../types/layout-types';
import type { RelationshipListNavigate } from './relationship-list.react';

import * as React from 'react';
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';

import { type UserInfo } from 'lib/types/user-types';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  updateRelationshipsActionTypes,
  updateRelationships,
} from 'lib/actions/relationship-actions';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import PencilIcon from '../components/pencil-icon.react';
import { SingleLine } from '../components/single-line.react';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import { RelationshipListItemTooltipModalRouteName } from '../navigation/route-names';
import { type Colors, useColors, useStyles } from '../themes/colors';
import { useSelector } from '../redux/redux-utils';

type BaseProps = {|
  +userInfo: UserInfo,
  +lastListItem: boolean,
  +verticalBounds: ?VerticalBounds,
  +relationshipListRouteKey: string,
  +relationshipListRouteName: $PropertyType<
    NavigationRoute<'FriendList' | 'BlockList'>,
    'name',
  >,
  +navigate: RelationshipListNavigate,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +removeUserLoadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +updateRelationships: (request: RelationshipRequest) => Promise<void>,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
|};
class RelationshipListItem extends React.PureComponent<Props> {
  editButton = React.createRef<React.ElementRef<typeof View>>();

  render() {
    const { lastListItem, removeUserLoadingStatus, userInfo } = this.props;
    const borderBottom = lastListItem ? null : this.props.styles.borderBottom;

    let editButton = null;
    if (removeUserLoadingStatus === 'loading') {
      editButton = (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    } else if (
      userInfo.relationshipStatus === userRelationshipStatus.FRIEND ||
      userInfo.relationshipStatus === userRelationshipStatus.BOTH_BLOCKED ||
      userInfo.relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER
    ) {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressEdit}
          style={this.props.styles.editButton}
        >
          <View onLayout={this.onLayout} ref={this.editButton}>
            <PencilIcon />
          </View>
        </TouchableOpacity>
      );
    } else if (
      userInfo.relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED
    ) {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressUpdateFriendship}
          style={this.props.styles.editButton}
        >
          <Text style={this.props.styles.accept}>Accept</Text>
        </TouchableOpacity>
      );
    } else if (
      userInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
    ) {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressUpdateFriendship}
          style={this.props.styles.editButton}
        >
          <Text style={this.props.styles.cancel}>Cancel request</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={this.props.styles.container}>
        <View style={[this.props.styles.innerContainer, borderBottom]}>
          <SingleLine style={this.props.styles.username}>
            {this.props.userInfo.username}
          </SingleLine>
          {editButton}
        </View>
      </View>
    );
  }

  visibleEntryIDs() {
    const { relationshipListRouteName } = this.props;
    const id = {
      FriendList: 'unfriend',
      BlockList: 'unblock',
    }[relationshipListRouteName];
    return [id];
  }

  onPressEdit = () => {
    const {
      editButton,
      props: { verticalBounds },
    } = this;
    const { overlayContext, userInfo } = this.props;
    invariant(
      overlayContext,
      'RelationshipListItem should have OverlayContext',
    );
    overlayContext.setScrollBlockingModalStatus('open');

    if (!editButton.current || !verticalBounds) {
      return;
    }
    const { relationshipStatus, ...restUserInfo } = userInfo;
    const relativeUserInfo = {
      ...restUserInfo,
      isViewer: false,
    };
    editButton.current.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };
      this.props.navigate({
        name: RelationshipListItemTooltipModalRouteName,
        params: {
          presentedFrom: this.props.relationshipListRouteKey,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs: this.visibleEntryIDs(),
          relativeUserInfo,
        },
      });
    });
  };

  // We need to set onLayout in order to allow .measure() to be on the ref
  onLayout = () => {};

  onPressUpdateFriendship = () => {
    const { id } = this.props.userInfo;
    const customKeyName = `${updateRelationshipsActionTypes.started}:${id}`;
    this.props.dispatchActionPromise(
      updateRelationshipsActionTypes,
      this.updateFriendship(),
      { customKeyName },
    );
  };

  get updateFriendshipAction() {
    const { userInfo } = this.props;
    if (
      userInfo.relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return relationshipActions.FRIEND;
    } else if (
      userInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
    ) {
      return relationshipActions.UNFRIEND;
    } else {
      return undefined;
    }
  }

  async updateFriendship() {
    try {
      const action = this.updateFriendshipAction;
      invariant(action, 'invalid relationshipAction');
      return await this.props.updateRelationships({
        action,
        userIDs: [this.props.userInfo.id],
      });
    } catch (e) {
      Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
        cancelable: true,
      });
      throw e;
    }
  }
}

const unboundStyles = {
  editButton: {
    paddingLeft: 10,
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'panelForeground',
  },
  innerContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderColor: 'panelForegroundBorder',
    flexDirection: 'row',
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  username: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  accept: {
    color: 'link',
    fontSize: 16,
    paddingLeft: 6,
  },
  cancel: {
    color: 'redText',
    fontSize: 16,
    paddingLeft: 6,
  },
};

export default React.memo<BaseProps>(function ConnectedRelationshipListItem(
  props: BaseProps,
) {
  const removeUserLoadingStatus = useSelector((state) =>
    createLoadingStatusSelector(
      updateRelationshipsActionTypes,
      `${updateRelationshipsActionTypes.started}:${props.userInfo.id}`,
    )(state),
  );
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const dispatchActionPromise = useDispatchActionPromise();
  const boundUpdateRelationships = useServerCall(updateRelationships);
  const overlayContext = React.useContext(OverlayContext);
  return (
    <RelationshipListItem
      {...props}
      removeUserLoadingStatus={removeUserLoadingStatus}
      colors={colors}
      styles={styles}
      dispatchActionPromise={dispatchActionPromise}
      updateRelationships={boundUpdateRelationships}
      overlayContext={overlayContext}
    />
  );
});
