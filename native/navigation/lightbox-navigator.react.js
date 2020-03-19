// @flow

import type {
  NavigationStackProp,
  NavigationState,
  NavigationDescriptor,
  NavigationStackScreenOptions,
  NavigationRouteConfigMap,
  NavigationStackTransitionProps,
  NavigationStackScene,
} from 'react-navigation-stack';
import type { StackNavigatorConfig } from 'react-navigation-stack';

import * as React from 'react';
import {
  View,
  StyleSheet,
  Animated as BaseAnimated,
  Easing as BaseEasing,
} from 'react-native';
import { StackRouter, createNavigator, StackActions } from 'react-navigation';
import { Transitioner } from 'react-navigation-stack';
import Animated, { Easing } from 'react-native-reanimated';

const LightboxPositionContext: React.Context<Animated.Value> = React.createContext(
  null,
);

function createLightboxNavigator(
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
  >(Lightbox, StackRouter(routeConfigMap, stackRouterConfig), stackConfig);
}

type Props = $ReadOnly<{
  navigation: NavigationStackProp<NavigationState>,
  descriptors: { [key: string]: NavigationDescriptor },
  navigationConfig: StackNavigatorConfig,
}>;
class Lightbox extends React.PureComponent<Props> {
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
      <LightboxPositionContext.Provider value={this.position}>
        {scenes.map(renderScene)}
      </LightboxPositionContext.Provider>
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

function withLightboxPositionContext<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<
    React.ElementConfig<ComponentType>,
    { lightboxPosition: ?Animated.Value },
  >,
> {
  class LightboxPositionHOC extends React.PureComponent<
    $Diff<
      React.ElementConfig<ComponentType>,
      { lightboxPosition: ?Animated.Value },
    >,
  > {
    render() {
      return (
        <LightboxPositionContext.Consumer>
          {value => <Component {...this.props} lightboxPosition={value} />}
        </LightboxPositionContext.Consumer>
      );
    }
  }
  return LightboxPositionHOC;
}

export { createLightboxNavigator, withLightboxPositionContext };
