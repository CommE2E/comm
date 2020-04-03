// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { Styles } from '../types/styles';

import * as React from 'react';
import { Text, TextInput } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { setURLPrefix } from 'lib/utils/url-utils';

import Button from '../components/button.react';
import { createModal } from '../components/modal.react';
import { CustomServerModalRouteName } from '../navigation/route-names';
import { setCustomServer } from '../utils/url-utils';
import { styleSelector } from '../themes/colors';

const Modal = createModal(CustomServerModalRouteName);
type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    presentedFrom: string,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  // Redux state
  urlPrefix: string,
  customServer: ?string,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
type State = {|
  customServer: string,
|};
class CustomServerModal extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    urlPrefix: PropTypes.string.isRequired,
    customServer: PropTypes.string,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    const { customServer } = props;
    this.state = {
      customServer: customServer ? customServer : '',
    };
  }

  render() {
    return (
      <Modal
        navigation={this.props.navigation}
        containerStyle={this.props.styles.container}
        modalStyle={this.props.styles.modal}
      >
        <TextInput
          style={this.props.styles.textInput}
          underlineColorAndroid="transparent"
          value={this.state.customServer}
          onChangeText={this.onChangeCustomServer}
          autoFocus={true}
        />
        <Button onPress={this.onPressGo} style={this.props.styles.button}>
          <Text style={this.props.styles.buttonText}>Go</Text>
        </Button>
      </Modal>
    );
  }

  onChangeCustomServer = (newCustomServer: string) => {
    this.setState({ customServer: newCustomServer });
  };

  onPressGo = () => {
    const { customServer } = this.state;
    if (customServer !== this.props.urlPrefix) {
      this.props.dispatchActionPayload(setURLPrefix, customServer);
    }
    if (customServer && customServer !== this.props.customServer) {
      this.props.dispatchActionPayload(setCustomServer, customServer);
    }
    this.props.navigation.goBack();
  };
}

const styles = {
  container: {
    justifyContent: 'flex-end',
  },
  modal: {
    flex: 0,
    flexDirection: 'row',
  },
  textInput: {
    padding: 0,
    margin: 0,
    fontSize: 16,
    color: 'modalBackgroundLabel',
    flex: 1,
  },
  button: {
    backgroundColor: 'greenButton',
    marginVertical: 2,
    marginHorizontal: 2,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 18,
    textAlign: 'center',
    color: 'white',
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    urlPrefix: state.urlPrefix,
    customServer: state.customServer,
    styles: stylesSelector(state),
  }),
  null,
  true,
)(CustomServerModal);
