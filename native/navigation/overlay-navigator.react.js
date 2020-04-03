// @flow

import type {
  NavigationStackProp,
  NavigationState,
  NavigationDescriptor,
  NavigationStackScreenOptions,
  NavigationRouteConfigMap,
  NavigationStackTransitionProps,
  NavigationStackScene,
  StackNavigatorConfig,
} from 'react-navigation-stack';

import * as React from 'react';
import {
  View,
  StyleSheet,
  Animated as BaseAnimated,
  Easing as BaseEasing,
} from 'react-native';
import { createNavigator, StackActions } from 'react-navigation';
import { Transitioner } from 'react-navigation-stack';
import Animated, { Easing } from 'react-native-reanimated';
import PropTypes from 'prop-types';

import OverlayRouter from './overlay-router';

const OverlayPositionContext: React.Context<Animated.Value> = React.createContext(
  null,
);

function createOverlayNavigator(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig: StackNavigatorConfig = {},
) {
  const {
    initialRouteName,
    initialRouteParams,
    paths,
    defaultNavigationOptions,
    initialRouteKey,
  } = stackConfig;
  const stackRouterConfig = {
    initialRouteName,
    initialRouteParams,
    paths,
    defaultNavigationOptions,
    initialRouteKey,
  };
  return createNavigator<
    NavigationStackScreenOptions,
    NavigationState,
    StackNavigatorConfig,
    NavigationStackProp<NavigationState>,
    OverlayNavigatorProps,
  >(
    OverlayNavigator,
    OverlayRouter(routeConfigMap, stackRouterConfig),
    stackConfig,
  );
}

type OverlayNavigatorProps = {
  navigation: NavigationStackProp<NavigationState>,
  descriptors: { [key: string]: NavigationDescriptor },
  navigationConfig: StackNavigatorConfig,
};
type Props = $ReadOnly<OverlayNavigatorProps>;
class OverlayNavigator extends React.PureComponent<Props> {
  static propTypes = {
    navigation: PropTypes.object.isRequired,
    descriptors: PropTypes.object.isRequired,
    navigationConfig: PropTypes.object.isRequired,
  };
  position: Animated.Value;

  constructor(props: Props) {
    super(props);
    this.position = new Animated.Value(props.navigation.state.index);
  }

  render() {
    return (
      <Transitioner
        render={this.renderScenes}
        configureTransition={this.configureTransition}
        navigation={this.props.navigation}
        descriptors={this.props.descriptors}
        onTransitionStart={this.onTransitionStart}
        onTransitionEnd={this.onTransitionEnd}
      />
    );
  }

  configureTransition = () => ({
    duration: 250,
    easing: BaseEasing.inOut(BaseEasing.ease),
    timing: BaseAnimated.timing,
    useNativeDriver: true,
  });

  onTransitionStart = (transitionProps: NavigationStackTransitionProps) => {
    const { index } = transitionProps.navigation.state;
    Animated.timing(this.position, {
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      toValue: index,
    }).start();
  };

  onTransitionEnd = (transitionProps: NavigationStackTransitionProps) => {
    if (!transitionProps.navigation.state.isTransitioning) {
      return;
    }
    const { navigation } = this.props;
    const transitionDestKey = transitionProps.scene.route.key;
    const isCurrentKey =
      navigation.state.routes[navigation.state.index].key === transitionDestKey;
    if (!isCurrentKey) {
      return;
    }
    navigation.dispatch(
      StackActions.completeTransition({ toChildKey: transitionDestKey }),
    );
  };

  renderScenes = (transitionProps: NavigationStackTransitionProps) => {
    const { scenes } = transitionProps;
    const renderScene = (scene: NavigationStackScene) =>
      this.renderScene(scene, transitionProps);
    return (
      <OverlayPositionContext.Provider value={this.position}>
        {scenes.map(renderScene)}
      </OverlayPositionContext.Provider>
    );
  };

  renderScene(
    scene: NavigationStackScene,
    transitionProps: NavigationStackTransitionProps,
  ) {
    if (!scene.descriptor) {
      return null;
    }
    const { navigation, getComponent } = scene.descriptor;
    const SceneComponent = getComponent();
    const pointerEvents = scene.isActive ? 'auto' : 'none';
    return (
      <View style={styles.scene} key={scene.key} pointerEvents={pointerEvents}>
        <SceneComponent
          navigation={navigation}
          scene={scene}
          transitionProps={transitionProps}
          position={this.position}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scene: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

function withOverlayPositionContext<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<
    React.ElementConfig<ComponentType>,
    { overlayPosition: ?Animated.Value },
  >,
> {
  class OverlayPositionHOC extends React.PureComponent<
    $Diff<
      React.ElementConfig<ComponentType>,
      { overlayPosition: ?Animated.Value },
    >,
  > {
    render() {
      return (
        <OverlayPositionContext.Consumer>
          {value => <Component {...this.props} overlayPosition={value} />}
        </OverlayPositionContext.Consumer>
      );
    }
  }
  return OverlayPositionHOC;
}

export { createOverlayNavigator, withOverlayPositionContext };
