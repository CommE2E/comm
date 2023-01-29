// @flow

import {
  useActionSheet,
  type ShowActionSheetWithOptions,
} from '@expo/react-native-action-sheet';
import type { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  TouchableWithoutFeedback,
  Platform,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import Animated, {
  SlideInDown,
  SlideOutDown,
  runOnJS,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useDispatch } from 'react-redux';

import {
  type ServerCallState,
  serverCallStateSelector,
} from 'lib/selectors/server-calls';
import type { SetState } from 'lib/types/hook-types';
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
import { useStyles } from '../themes/colors';
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
  +styles: typeof unboundStyles,
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
  +tooltipLocation?: 'above' | 'below' | 'fixed',
  +margin?: number,
  +visibleEntryIDs?: $ReadOnlyArray<string>,
  +chatInputBarHeight?: number,
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
  +setHideTooltip: SetState<boolean>,
  +showEmojiKeyboard: SharedValue<boolean>,
};
type TooltipProps<Base> = {
  ...Base,
  // Redux state
  +dimensions: DimensionsInfo,
  +serverCallState: ServerCallState,
  +viewerID: ?string,
  +nextReactionMessageLocalID: number,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // withInputState
  +inputState: ?InputState,
  +chatContext: ?ChatContextType,
  +showActionSheetWithOptions: ShowActionSheetWithOptions,
  +actionSheetShown: SharedValue<boolean>,
  +hideTooltip: boolean,
  +setHideTooltip: SetState<boolean>,
  +showEmojiKeyboard: SharedValue<boolean>,
  +exitAnimationWorklet: (finished: boolean) => void,
  +styles: typeof unboundStyles,
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
      const { styles } = this.props;
      if (this.props.spec.id === 'copy') {
        icon = <SWMansionIcon name="copy" style={styles.icon} size={16} />;
      } else if (this.props.spec.id === 'reply') {
        icon = <CommIcon name="reply" style={styles.icon} size={12} />;
      } else if (this.props.spec.id === 'report') {
        icon = (
          <SWMansionIcon name="warning-circle" style={styles.icon} size={16} />
        );
      } else if (this.props.spec.id === 'sidebar') {
        icon = (
          <SWMansionIcon
            name="message-circle-lines"
            style={styles.icon}
            size={16}
          />
        );
      } else if (this.props.spec.id === 'more') {
        icon = (
          <SWMansionIcon name="menu-vertical" style={styles.icon} size={16} />
        );
      }

      return (
        <TouchableOpacity
          onPress={this.onPress}
          style={this.props.containerStyle}
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
      if (this.props.route.params.tooltipLocation === 'fixed') {
        return fixedTooltipHeight;
      } else {
        return tooltipHeight(this.entries.length);
      }
    }

    get tooltipLocation(): 'above' | 'below' | 'fixed' {
      const { params } = this.props.route;
      const { tooltipLocation } = params;
      if (tooltipLocation) {
        return tooltipLocation;
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
        ...this.props.styles.backdrop,
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
        ...this.props.styles.contentContainer,
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
      const {
        initialCoordinates,
        verticalBounds,
        chatInputBarHeight,
      } = route.params;
      const { x, y, width, height } = initialCoordinates;
      const { margin, tooltipLocation } = this;

      const style = {};
      style.position = 'absolute';
      (style.alignItems = 'center'),
        (style.opacity = this.tooltipContainerOpacity);

      if (tooltipLocation !== 'fixed') {
        style.transform = [{ translateX: this.tooltipHorizontal }];
      }

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        style.left = 0;
        style.minWidth = width + 2 * extraLeftSpace;
      } else {
        style.right = 0;
        style.minWidth = width + 2 * extraRightSpace;
      }

      const inputBarHeight = chatInputBarHeight ?? 0;

      if (tooltipLocation === 'fixed') {
        const padding = 8;

        style.minWidth = dimensions.width - 16;
        style.left = 8;
        style.right = 8;
        style.bottom =
          dimensions.height -
          verticalBounds.height -
          verticalBounds.y -
          inputBarHeight +
          padding;
      } else if (tooltipLocation === 'above') {
        style.bottom =
          dimensions.height - Math.max(y, verticalBounds.y) + margin;
        style.transform.push({ translateY: this.tooltipVerticalAbove });
      } else {
        style.top =
          Math.min(y + height, verticalBounds.y + verticalBounds.height) +
          margin;
        style.transform.push({ translateY: this.tooltipVerticalBelow });
      }

      if (tooltipLocation !== 'fixed') {
        style.transform.push({ scale: this.tooltipScale });
      }

      return style;
    }

    render() {
      const {
        dimensions,
        serverCallState,
        viewerID,
        nextReactionMessageLocalID,
        dispatch,
        dispatchActionPromise,
        overlayContext,
        inputState,
        chatContext,
        showActionSheetWithOptions,
        actionSheetShown,
        hideTooltip,
        setHideTooltip,
        showEmojiKeyboard,
        exitAnimationWorklet,
        styles,
        ...navAndRouteForFlow
      } = this.props;

      const tooltipContainerStyle = [styles.itemContainer];

      if (this.tooltipLocation === 'fixed') {
        tooltipContainerStyle.push(styles.itemContainerFixed);
      }

      const { entries } = this;
      const items = entries.map((entry, index) => {
        let style;
        if (this.tooltipLocation === 'fixed') {
          style = index !== entries.length - 1 ? styles.itemMarginFixed : null;
        } else {
          style = index !== entries.length - 1 ? styles.itemMargin : null;
        }
        return (
          <TooltipItem
            key={index}
            spec={entry}
            onPress={this.onPressEntry}
            containerStyle={[...tooltipContainerStyle, style]}
            labelStyle={tooltipSpec.labelStyle}
            styles={styles}
          />
        );
      });

      if (this.tooltipLocation === 'fixed' && entries.length > 3) {
        items.splice(3);

        const moreSpec = {
          id: 'more',
          text: 'More',
          onPress: this.onPressMore,
        };

        const moreTooltipItem = (
          <TooltipItem
            key={entries.length}
            spec={moreSpec}
            onPress={moreSpec.onPress}
            containerStyle={tooltipContainerStyle}
            styles={styles}
          />
        );

        items.push(moreTooltipItem);
      }

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
      const { tooltipLocation } = this;
      if (tooltipLocation === 'above') {
        triangleDown = <View style={[styles.triangleDown, triangleStyle]} />;
      } else if (tooltipLocation === 'below') {
        triangleUp = <View style={[styles.triangleUp, triangleStyle]} />;
      }

      invariant(overlayContext, 'Tooltip should have OverlayContext');
      const { position } = overlayContext;
      const isOpeningSidebar = !!chatContext?.currentTransitionSidebarSourceID;

      const buttonProps: ButtonProps<BaseTooltipPropsType> = {
        ...navAndRouteForFlow,
        progress: position,
        isOpeningSidebar,
        setHideTooltip,
        showEmojiKeyboard,
      };

      const itemsStyles = [styles.items, styles.itemsFixed];

      const animationDelay = Platform.OS === 'ios' ? 200 : 500;
      const enterAnimation = SlideInDown.delay(animationDelay);

      const exitAnimation = SlideOutDown.withCallback(exitAnimationWorklet);

      let tooltip = null;

      if (this.tooltipLocation !== 'fixed') {
        tooltip = (
          <AnimatedView
            style={this.tooltipContainerStyle}
            onLayout={this.onTooltipContainerLayout}
          >
            {triangleUp}
            <View style={styles.items}>{items}</View>
            {triangleDown}
          </AnimatedView>
        );
      } else if (
        this.tooltipLocation === 'fixed' &&
        !hideTooltip &&
        !showEmojiKeyboard.value
      ) {
        tooltip = (
          <AnimatedView
            style={this.tooltipContainerStyle}
            entering={enterAnimation}
            exiting={exitAnimation}
          >
            <View style={itemsStyles}>{items}</View>
          </AnimatedView>
        );
      }

      return (
        <TouchableWithoutFeedback onPress={this.onPressBackdrop}>
          <View style={styles.container}>
            <AnimatedView style={this.opacityStyle} />
            <View style={this.contentContainerStyle}>
              <View style={this.buttonStyle}>
                <ButtonComponent {...buttonProps} />
              </View>
            </View>
            {tooltip}
          </View>
        </TouchableWithoutFeedback>
      );
    }

    onPressBackdrop = () => {
      if (this.tooltipLocation !== 'fixed') {
        this.props.navigation.goBackOnce();
      } else {
        this.props.setHideTooltip(true);
      }
      this.props.showEmojiKeyboard.value = false;
    };

    onPressEntry = (entry: TooltipEntry<RouteName>) => {
      if (
        this.tooltipLocation !== 'fixed' ||
        this.props.actionSheetShown.value
      ) {
        this.props.navigation.goBackOnce();
      } else {
        this.props.setHideTooltip(true);
      }

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

    onPressMore = () => {
      Keyboard.dismiss();
      this.props.actionSheetShown.value = true;
      this.props.setHideTooltip(true);

      const { entries } = this;
      const options = entries.map(entry => entry.text);

      const {
        destructiveButtonIndex,
        cancelButtonIndex,
      } = this.getPlatformSpecificButtonIndices(options);

      // We're reversing options to populate the action sheet from bottom to
      // top instead of the default (top to bottom) ordering.
      options.reverse();

      const containerStyle = {
        paddingBottom: 24,
      };

      const { styles } = this.props;
      const icons = [
        <SWMansionIcon
          key="report"
          name="warning-circle"
          style={styles.bottomSheetIcon}
          size={16}
        />,
        <SWMansionIcon
          key="copy"
          name="copy"
          style={styles.bottomSheetIcon}
          size={16}
        />,
        <SWMansionIcon
          key="thread"
          name="message-circle-lines"
          style={styles.bottomSheetIcon}
          size={16}
        />,
        <CommIcon
          key="reply"
          name="reply"
          style={styles.bottomSheetIcon}
          size={12}
        />,
      ];

      const onPressAction = (selectedIndex?: number) => {
        if (selectedIndex === cancelButtonIndex) {
          this.props.navigation.goBackOnce();
          return;
        }
        const index = entries.length - (selectedIndex ?? 0);
        const entry = entries[Platform.OS === 'ios' ? index : index - 1];
        this.onPressEntry(entry);
      };

      this.props.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          containerStyle,
          icons,
        },
        onPressAction,
      );
    };

    getPlatformSpecificButtonIndices = (options: Array<string>) => {
      let destructiveButtonIndex;
      if (Platform.OS === 'ios') {
        const reportIndex = options.findIndex(option => option === 'Report');
        destructiveButtonIndex =
          reportIndex !== -1 ? options.length - reportIndex : undefined;
      }

      const cancelButtonIndex = Platform.OS === 'ios' ? 0 : -1;

      // The "Cancel" action is iOS-specific
      if (Platform.OS === 'ios') {
        options.push('Cancel');
      }

      return { destructiveButtonIndex, cancelButtonIndex };
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
    const { showActionSheetWithOptions } = useActionSheet();

    const dimensions = useSelector(state => state.dimensions);
    const serverCallState = useSelector(serverCallStateSelector);
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const nextReactionMessageLocalID = useSelector(state => state.nextLocalID);
    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const overlayContext = React.useContext(OverlayContext);
    const inputState = React.useContext(InputStateContext);
    const chatContext = React.useContext(ChatContext);

    const actionSheetShown = useSharedValue(false);
    const [hideTooltip, setHideTooltip] = React.useState<boolean>(false);

    const showEmojiKeyboard = useSharedValue(false);

    const goBackCallback = React.useCallback(() => {
      if (!actionSheetShown.value && !showEmojiKeyboard.value) {
        props.navigation.goBackOnce();
      }
    }, [actionSheetShown.value, props.navigation, showEmojiKeyboard.value]);

    const exitAnimationWorklet = React.useCallback(
      finished => {
        'worklet';
        if (finished) {
          runOnJS(goBackCallback)();
        }
      },
      [goBackCallback],
    );

    const styles = useStyles(unboundStyles);

    return (
      <Tooltip
        {...props}
        dimensions={dimensions}
        serverCallState={serverCallState}
        viewerID={viewerID}
        nextReactionMessageLocalID={nextReactionMessageLocalID}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        overlayContext={overlayContext}
        inputState={inputState}
        chatContext={chatContext}
        showActionSheetWithOptions={showActionSheetWithOptions}
        actionSheetShown={actionSheetShown}
        hideTooltip={hideTooltip}
        setHideTooltip={setHideTooltip}
        showEmojiKeyboard={showEmojiKeyboard}
        exitAnimationWorklet={exitAnimationWorklet}
        styles={styles}
      />
    );
  });
}

const unboundStyles = {
  backdrop: {
    backgroundColor: 'black',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bottomSheetIcon: {
    color: '#000000',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  icon: {
    color: 'modalForegroundLabel',
  },
  itemContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  itemContainerFixed: {
    flexDirection: 'column',
  },
  itemMargin: {
    borderBottomColor: '#404040',
    borderBottomWidth: 1,
  },
  itemMarginFixed: {
    borderRightColor: 'panelForegroundBorder',
    borderRightWidth: 1,
  },
  items: {
    backgroundColor: 'tooltipBackground',
    borderRadius: 5,
    overflow: 'hidden',
  },
  itemsFixed: {
    flex: 1,
    flexDirection: 'row',
  },
  label: {
    color: 'modalForegroundLabel',
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
    borderTopColor: 'tooltipBackground',
    borderTopWidth: 10,
    height: 10,
    top: Platform.OS === 'android' ? -1 : 0,
    width: 10,
  },
  triangleUp: {
    borderBottomColor: 'tooltipBackground',
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
};

function tooltipHeight(numEntries: number): number {
  // 10 (triangle) + 37 * numEntries (entries) + numEntries - 1 (padding)
  return 9 + 38 * numEntries;
}

const fixedTooltipHeight: number = 53;

export { createTooltip, fixedTooltipHeight };
