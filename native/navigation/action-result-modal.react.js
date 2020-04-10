// @flow

import type {
  NavigationStackProp,
  NavigationLeafRoute,
  NavigationStackScene,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';

import { connect } from 'lib/utils/redux-utils';

import { contentBottomOffset } from '../selectors/dimension-selectors';
import { overlayStyleSelector, type StyleSheetOf } from '../themes/colors';
import { connectNav, type NavContextType } from './navigation-context';

const { Value, Extrapolate, interpolate } = Animated;

type NavProp = NavigationStackProp<{|
  ...NavigationLeafRoute,
  params: {|
    message: string,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  scene: NavigationStackScene,
  position: Value,
  // Redux state
  styles: StyleSheetOf<typeof styles>,
|};
class ActionResultModal extends React.PureComponent<Props> {
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          message: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    scene: PropTypes.object.isRequired,
    position: PropTypes.instanceOf(Value).isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };
  progress: Value;

  constructor(props: Props) {
    super(props);

    const { position } = props;
    const { index } = props.scene;
    this.progress = interpolate(position, {
      inputRange: [index - 1, index],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
  }

  componentDidMount() {
    setTimeout(this.goBack, 2000);
  }

  goBack = () => {
    this.props.navigation.goBack();
  };

  get containerStyle() {
    return {
      ...this.props.styles.container,
      opacity: this.progress,
    };
  }

  render() {
    const { message } = this.props.navigation.state.params;
    return (
      <Animated.View style={this.containerStyle}>
        <View style={this.props.styles.message}>
          <View style={this.props.styles.backdrop} />
          <Text style={this.props.styles.text}>{message}</Text>
        </View>
      </Animated.View>
    );
  }
}

const styles = {
  backdrop: {
    backgroundColor: 'modalContrastBackground',
    bottom: 0,
    left: 0,
    opacity: 'modalContrastOpacity',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: contentBottomOffset + 100,
  },
  message: {
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
  },
  text: {
    color: 'modalContrastForegroundLabel',
    fontSize: 20,
  },
};
const stylesSelector = overlayStyleSelector(styles);

export default connectNav((context: ?NavContextType) => ({
  navContext: context,
}))(
  connect((state: AppState, ownProps: { navContext: ?NavContextType }) => ({
    styles: stylesSelector({
      redux: state,
      navContext: ownProps.navContext,
    }),
  }))(ActionResultModal),
);
