// @flow

import type { UserInfo } from 'lib/types/user-types';
import type { UserRelationships } from 'lib/types/relationship-types';
import type { VerticalBounds } from '../types/layout-types';
import type { NavigationRoute } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';
import type { MoreNavigationProp } from './more.react';

import * as React from 'react';
import { View, Text, FlatList } from 'react-native';
import invariant from 'invariant';
import { createSelector } from 'reselect';

import { connect } from 'lib/utils/redux-utils';
import { userRelationshipsSelector } from 'lib/selectors/relationship-selectors';

import {
  withOverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import {
  styleSelector,
  type IndicatorStyle,
  indicatorStyleSelector,
} from '../themes/colors';

import RelationshipListItem from './relationship-list-item.react';

export type RelationshipListNavigate = $PropertyType<
  MoreNavigationProp<'FriendList' | 'BlockList'>,
  'navigate',
>;

type ListItem =
  | {| type: 'empty' |}
  | {| type: 'header' |}
  | {| type: 'footer' |}
  | {|
      type: 'user',
      userInfo: UserInfo,
      lastListItem: boolean,
      verticalBounds: ?VerticalBounds,
    |};

type Props = {|
  navigation: MoreNavigationProp<>,
  route: NavigationRoute<'FriendList' | 'BlockList'>,
  verticalBounds: ?VerticalBounds,
  // Redux state
  relationships: UserRelationships,
  styles: typeof styles,
  indicatorStyle: IndicatorStyle,
  // withOverlayContext
  overlayContext: ?OverlayContextType,
|};
type State = {|
  verticalBounds: ?VerticalBounds,
|};
type PropsAndState = {| ...Props, ...State |};
class RelationshipList extends React.PureComponent<Props, State> {
  flatListContainerRef = React.createRef();

  state = {
    verticalBounds: null,
  };

  listDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.relationships,
    (propsAndState: PropsAndState) => propsAndState.route.name,
    (propsAndState: PropsAndState) => propsAndState.verticalBounds,
    (
      relationships: UserRelationships,
      routeName: $ElementType<
        NavigationRoute<'FriendList' | 'BlockList'>,
        'name',
      >,
      verticalBounds: ?VerticalBounds,
    ) => {
      const users = {
        FriendList: relationships.friends,
        BlockList: relationships.blocked,
      }[routeName];
      const isEmpty = !users.length;

      const mapUser = (userInfo, index) => ({
        type: 'user',
        userInfo,
        lastListItem: users.length - 1 === index,
        verticalBounds,
      });

      return []
        .concat(isEmpty ? { type: 'empty' } : [])
        .concat(isEmpty ? [] : { type: 'header' })
        .concat(users.map(mapUser))
        .concat(isEmpty ? [] : { type: 'footer' });
    },
  );

  static keyExtractor(item: ListItem) {
    if (item.userInfo) {
      return item.userInfo.id;
    } else if (item.type === 'empty') {
      return 'empty';
    } else if (item.type === 'header') {
      return 'header';
    } else {
      return 'search';
    }
  }

  get listData() {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  static getOverlayContext(props: Props) {
    const { overlayContext } = props;
    invariant(overlayContext, 'RelationshipList should have OverlayContext');
    return overlayContext;
  }

  static scrollDisabled(props: Props) {
    const overlayContext = RelationshipList.getOverlayContext(props);
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  render() {
    return (
      <View
        ref={this.flatListContainerRef}
        onLayout={this.onFlatListContainerLayout}
        style={this.props.styles.container}
      >
        <FlatList
          contentContainerStyle={this.props.styles.contentContainer}
          data={this.listData}
          renderItem={this.renderItem}
          keyExtractor={RelationshipList.keyExtractor}
          scrollEnabled={!RelationshipList.scrollDisabled(this.props)}
          indicatorStyle={this.props.indicatorStyle}
        />
      </View>
    );
  }

  onFlatListContainerLayout = () => {
    const { flatListContainerRef } = this;
    if (!flatListContainerRef.current) {
      return;
    }
    flatListContainerRef.current.measure(
      (x, y, width, height, pageX, pageY) => {
        if (
          height === null ||
          height === undefined ||
          pageY === null ||
          pageY === undefined
        ) {
          return;
        }
        this.setState({ verticalBounds: { height, y: pageY } });
      },
    );
  };

  renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'empty') {
      const action = {
        FriendList: 'added',
        BlockList: 'blocked',
      }[this.props.route.name];

      return (
        <Text
          style={this.props.styles.emptyText}
        >{`You haven't ${action} any users yet`}</Text>
      );
    } else if (item.type === 'header' || item.type === 'footer') {
      return <View style={this.props.styles.separator} />;
    } else if (item.type === 'user') {
      return (
        <RelationshipListItem
          userInfo={item.userInfo}
          lastListItem={item.lastListItem}
          verticalBounds={item.verticalBounds}
          navigate={this.props.navigation.navigate}
          relationshipListRouteKey={this.props.route.key}
          relationshipListRouteName={this.props.route.name}
        />
      );
    } else {
      invariant(false, `unexpected RelationshipList item type ${item.type}`);
    }
  };
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
  contentContainer: {
    marginTop: 24,
  },
  separator: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
  },
  emptyText: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
  },
};

const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  relationships: userRelationshipsSelector(state),
  styles: stylesSelector(state),
  indicatorStyle: indicatorStyleSelector(state),
}))(withOverlayContext(RelationshipList));
