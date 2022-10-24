// @flow

import type { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useDispatch } from 'react-redux';

import {
  type ServerCallState,
  serverCallStateSelector,
} from 'lib/selectors/server-calls';
import type { Dispatch } from 'lib/types/redux-types';
import {
  createBoundServerCallsSelector,
  useDispatchActionPromise,
  type DispatchActionPromise,
  type ActionFunc,
  type BindServerCall,
  type DispatchFunctions,
} from 'lib/utils/action-utils';

import { ChatContext, type ChatContextType } from '../chat/chat-context';
import CommIcon from '../components/comm-icon.react';
import { SingleLine } from '../components/single-line.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import { type InputState, InputStateContext } from '../input/input-state';
import { type DimensionsInfo } from '../redux/dimensions-updater.react';
import { useSelector } from '../redux/redux-utils';
import {
  type VerticalBounds,
  type LayoutCoordinates,
} from '../types/layout-types';
import type { LayoutEvent } from '../types/react-native';
import { AnimatedView, type ViewStyle, type TextStyle } from '../types/styles';
import type { AppNavigationProp } from './app-navigator.react';
import { OverlayContext, type OverlayContextType } from './overlay-context';
import type { TooltipModalParamList } from './route-names';

/* eslint-disable import/no-named-as-default-member */
const { Value, Node, Extrapolate, add, multiply, interpolateNode } = Animated;
/* eslint-enable import/no-named-as-default-member */

export type TooltipEntry<RouteName: $Keys<TooltipModalParamList>> = {
  +id: string,
  +text: string,
  +onPress: (
    route: TooltipRoute<RouteName>,
    dispatchFunctions: DispatchFunctions,
    bindServerCall: BindServerCall,
    inputState: ?InputState,
    navigation: AppNavigationProp<RouteName>,
    viewerID: ?string,
    chatContext: ?ChatContextType,
  ) => mixed,
};
type TooltipItemProps<RouteName> = {
  +spec: TooltipEntry<RouteName>,
  +onPress: (entry: TooltipEntry<RouteName>) => void,
  +containerStyle?: ViewStyle,
  +labelStyle?: TextStyle,
};
type TooltipSpec<RouteName> = {
  +entries: $ReadOnlyArray<TooltipEntry<RouteName>>,
  +labelStyle?: ViewStyle,
};

export type TooltipParams<CustomProps> = {
  ...CustomProps,
  +presentedFrom: string,
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +location?: 'above' | 'below' | 'fixed',
  +margin?: number,
  +visibleEntryIDs?: $ReadOnlyArray<string>,
};
export type TooltipRoute<RouteName: $Keys<TooltipModalParamList>> = RouteProp<
  TooltipModalParamList,
  RouteName,
>;

export type BaseTooltipProps<RouteName> = {
  +navigation: AppNavigationProp<RouteName>,
  +route: TooltipRoute<RouteName>,
};
type ButtonProps<Base> = {
  ...Base,
  +progress: Node,
  +isOpeningSidebar: boolean,
};
type TooltipProps<Base> = {
  ...Base,
  // Redux state
  +dimensions: DimensionsInfo,
  +serverCallState: ServerCallState,
  +viewerID: ?string,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // withInputState
  +inputState: ?InputState,
  +chatContext: ?ChatContextType,
};
function createTooltip<
  RouteName: $Keys<TooltipModalParamList>,
  BaseTooltipPropsType: BaseTooltipProps<RouteName> = BaseTooltipProps<RouteName>,
>(
  ButtonComponent: React.ComponentType<ButtonProps<BaseTooltipPropsType>>,
  tooltipSpec: TooltipSpec<RouteName>,
): React.ComponentType<BaseTooltipPropsType> {
  class TooltipItem extends React.PureComponent<TooltipItemProps<RouteName>> {
    render() {
      let icon;
      if (this.props.spec.id === 'copy') {
        icon = <SWMansionIcon name="copy" style={styles.icon} size={16} />;
      } else if (this.props.spec.id === 'reply') {
        icon = <CommIcon name="reply" style={styles.icon} size={12} />;
      } else if (this.props.spec.id === 'report') {
        icon = (
          <SWMansionIcon name="warning-circle" style={styles.icon} size={16} />
        );
      } else if (
        this.props.spec.id === 'create_sidebar' ||
        this.props.spec.id === 'open_sidebar'
      ) {
        icon = (
          <SWMansionIcon
            name="message-circle-lines"
            style={styles.icon}
            size={16}
          />
        );
      }

      return (
        <TouchableOpacity
          onPress={this.onPress}
          style={[styles.itemContainer, this.props.containerStyle]}
        >
          {icon}
          <SingleLine style={[styles.label, this.props.labelStyle]}>
            {this.props.spec.text}
          </SingleLine>
        </TouchableOpacity>
      );
    }

    onPress = () => {
      this.props.onPress(this.props.spec);
    };
  }
  class Tooltip extends React.PureComponent<
    TooltipProps<BaseTooltipPropsType>,
  > {
    backdropOpacity: Node;
    tooltipContainerOpacity: Node;
    tooltipVerticalAbove: Node;
    tooltipVerticalBelow: Node;
    tooltipHorizontalOffset: Value = new Value(0);
    tooltipHorizontal: Node;
    tooltipScale: Node;

    constructor(props: TooltipProps<BaseTooltipPropsType>) {
      super(props);

      const { overlayContext } = props;
      invariant(overlayContext, 'Tooltip should have OverlayContext');
      const { position } = overlayContext;

      this.backdropOpacity = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [0, 0.7],
        extrapolate: Extrapolate.CLAMP,
      });
      this.tooltipContainerOpacity = interpolateNode(position, {
        inputRange: [0, 0.1],
        outputRange: [0, 1],
        extrapolate: Extrapolate.CLAMP,
      });

      const { margin } = this;
      this.tooltipVerticalAbove = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [margin + this.tooltipHeight / 2, 0],
        extrapolate: Extrapolate.CLAMP,
      });
      this.tooltipVerticalBelow = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [-margin - this.tooltipHeight / 2, 0],
        extrapolate: Extrapolate.CLAMP,
      });

      this.tooltipHorizontal = multiply(
        add(1, multiply(-1, position)),
        this.tooltipHorizontalOffset,
      );

      this.tooltipScale = interpolateNode(position, {
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 0, 1, 1],
        extrapolate: Extrapolate.CLAMP,
      });
    }

    componentDidMount() {
      Haptics.impactAsync();
    }

    get entries(): $ReadOnlyArray<TooltipEntry<RouteName>> {
      const { entries } = tooltipSpec;
      const { visibleEntryIDs } = this.props.route.params;
      if (!visibleEntryIDs) {
        return entries;
      }
      const visibleSet = new Set(visibleEntryIDs);
      return entries.filter(entry => visibleSet.has(entry.id));
    }

    get tooltipHeight(): number {
      return tooltipHeight(this.entries.length);
    }

    get location(): 'above' | 'below' | 'fixed' {
      const { params } = this.props.route;
      const { location } = params;
      if (location) {
        return location;
      }

      const { initialCoordinates, verticalBounds } = params;
      const { y, height } = initialCoordinates;
      const contentTop = y;
      const contentBottom = y + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const { margin, tooltipHeight: curTooltipHeight } = this;
      const fullHeight = curTooltipHeight + margin;
      if (
        contentBottom + fullHeight > boundsBottom &&
        contentTop - fullHeight > boundsTop
      ) {
        return 'above';
      }

      return 'below';
    }

    get opacityStyle() {
      return {
        ...styles.backdrop,
        opacity: this.backdropOpacity,
      };
    }

    get contentContainerStyle() {
      const { verticalBounds } = this.props.route.params;
      const fullScreenHeight = this.props.dimensions.height;
      const top = verticalBounds.y;
      const bottom =
        fullScreenHeight - verticalBounds.y - verticalBounds.height;
      return {
        ...styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }

    get buttonStyle() {
      const { params } = this.props.route;
      const { initialCoordinates, verticalBounds } = params;
      const { x, y, width, height } = initialCoordinates;
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
        marginTop: y - verticalBounds.y,
        marginLeft: x,
      };
    }

    get margin() {
      const customMargin = this.props.route.params.margin;
      return customMargin !== null && customMargin !== undefined
        ? customMargin
        : 20;
    }

    get tooltipContainerStyle() {
      const { dimensions, route } = this.props;
      const { initialCoordinates, verticalBounds } = route.params;
      const { x, y, width, height } = initialCoordinates;
      const { margin, location } = this;

      const style = {};
      style.position = 'absolute';
      (style.alignItems = 'center'),
        (style.opacity = this.tooltipContainerOpacity);
      style.transform = [{ translateX: this.tooltipHorizontal }];

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        style.left = 0;
        style.minWidth = width + 2 * extraLeftSpace;
      } else {
        style.right = 0;
        style.minWidth = width + 2 * extraRightSpace;
      }

      if (location === 'above') {
        const fullScreenHeight = dimensions.height;
        style.bottom =
          fullScreenHeight - Math.max(y, verticalBounds.y) + margin;
        style.transform.push({ translateY: this.tooltipVerticalAbove });
      } else {
        style.top =
          Math.min(y + height, verticalBounds.y + verticalBounds.height) +
          margin;
        style.transform.push({ translateY: this.tooltipVerticalBelow });
      }

      style.transform.push({ scale: this.tooltipScale });

      return style;
    }

    render() {
      const {
        dimensions,
        serverCallState,
        viewerID,
        dispatch,
        dispatchActionPromise,
        overlayContext,
        inputState,
        chatContext,
        ...navAndRouteForFlow
      } = this.props;

      const { entries } = this;
      const items = entries.map((entry, index) => {
        const style = index !== entries.length - 1 ? styles.itemMargin : null;
        return (
          <TooltipItem
            key={index}
            spec={entry}
            onPress={this.onPressEntry}
            containerStyle={style}
            labelStyle={tooltipSpec.labelStyle}
          />
        );
      });

      let triangleStyle;
      const { route } = this.props;
      const { initialCoordinates } = route.params;
      const { x, width } = initialCoordinates;
      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        triangleStyle = {
          alignSelf: 'flex-start',
          left: extraLeftSpace + (width - 20) / 2,
        };
      } else {
        triangleStyle = {
          alignSelf: 'flex-end',
          right: extraRightSpace + (width - 20) / 2,
        };
      }

      let triangleDown = null;
      let triangleUp = null;
      const { location } = this;
      if (location === 'above') {
        triangleDown = <View style={[styles.triangleDown, triangleStyle]} />;
      } else {
        triangleUp = <View style={[styles.triangleUp, triangleStyle]} />;
      }

      invariant(overlayContext, 'Tooltip should have OverlayContext');
      const { position } = overlayContext;
      const isOpeningSidebar = !!chatContext?.currentTransitionSidebarSourceID;

      const buttonProps: ButtonProps<BaseTooltipPropsType> = {
        ...navAndRouteForFlow,
        progress: position,
        isOpeningSidebar,
      };

      return (
        <TouchableWithoutFeedback onPress={this.onPressBackdrop}>
          <View style={styles.container}>
            <AnimatedView style={this.opacityStyle} />
            <View style={this.contentContainerStyle}>
              <View style={this.buttonStyle}>
                <ButtonComponent {...buttonProps} />
              </View>
            </View>
            <AnimatedView
              style={this.tooltipContainerStyle}
              onLayout={this.onTooltipContainerLayout}
            >
              {triangleUp}
              <View style={styles.items}>{items}</View>
              {triangleDown}
            </AnimatedView>
          </View>
        </TouchableWithoutFeedback>
      );
    }

    onPressBackdrop = () => {
      this.props.navigation.goBackOnce();
    };

    onPressEntry = (entry: TooltipEntry<RouteName>) => {
      this.props.navigation.goBackOnce();
      const dispatchFunctions = {
        dispatch: this.props.dispatch,
        dispatchActionPromise: this.props.dispatchActionPromise,
      };
      entry.onPress(
        this.props.route,
        dispatchFunctions,
        this.bindServerCall,
        this.props.inputState,
        this.props.navigation,
        this.props.viewerID,
        this.props.chatContext,
      );
    };

    bindServerCall = <F>(serverCall: ActionFunc<F>): F => {
      const {
        cookie,
        urlPrefix,
        sessionID,
        currentUserInfo,
        connectionStatus,
      } = this.props.serverCallState;
      return createBoundServerCallsSelector(serverCall)({
        dispatch: this.props.dispatch,
        cookie,
        urlPrefix,
        sessionID,
        currentUserInfo,
        connectionStatus,
      });
    };

    onTooltipContainerLayout = (event: LayoutEvent) => {
      const { route, dimensions } = this.props;
      const { x, width } = route.params.initialCoordinates;

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;

      const actualWidth = event.nativeEvent.layout.width;
      if (extraLeftSpace < extraRightSpace) {
        const minWidth = width + 2 * extraLeftSpace;
        this.tooltipHorizontalOffset.setValue((minWidth - actualWidth) / 2);
      } else {
        const minWidth = width + 2 * extraRightSpace;
        this.tooltipHorizontalOffset.setValue((actualWidth - minWidth) / 2);
      }
    };
  }
  return React.memo<BaseTooltipPropsType>(function ConnectedTooltip(
    props: BaseTooltipPropsType,
  ) {
    const dimensions = useSelector(state => state.dimensions);
    const serverCallState = useSelector(serverCallStateSelector);
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const overlayContext = React.useContext(OverlayContext);
    const inputState = React.useContext(InputStateContext);
    const chatContext = React.useContext(ChatContext);
    return (
      <Tooltip
        {...props}
        dimensions={dimensions}
        serverCallState={serverCallState}
        viewerID={viewerID}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        overlayContext={overlayContext}
        inputState={inputState}
        chatContext={chatContext}
      />
    );
  });
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'black',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  icon: {
    marginRight: 4,
  },
  itemContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  itemMargin: {
    borderBottomColor: '#E1E1E1',
    borderBottomWidth: 1,
  },
  items: {
    backgroundColor: 'white',
    borderRadius: 5,
    overflow: 'hidden',
  },
  label: {
    color: '#444',
    fontSize: 14,
    lineHeight: 17,
    textAlign: 'center',
  },
  triangleDown: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 0,
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderRightWidth: 10,
    borderStyle: 'solid',
    borderTopColor: 'white',
    borderTopWidth: 10,
    height: 10,
    top: Platform.OS === 'android' ? -1 : 0,
    width: 10,
  },
  triangleUp: {
    borderBottomColor: 'white',
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderRightWidth: 10,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    bottom: Platform.OS === 'android' ? -1 : 0,
    height: 10,
    width: 10,
  },
});

function tooltipHeight(numEntries: number): number {
  // 10 (triangle) + 37 * numEntries (entries) + numEntries - 1 (padding)
  return 9 + 38 * numEntries;
}

export { createTooltip, tooltipHeight };
