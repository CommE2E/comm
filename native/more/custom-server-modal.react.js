// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';

import * as React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { setURLPrefix } from 'lib/utils/url-utils';

import Button from '../components/button.react';
import { createModal } from '../components/modal.react';
import { CustomServerModalRouteName } from '../navigation/route-names';
import { setCustomServer } from '../utils/url-utils';

const Modal = createModal(CustomServerModalRouteName);

type Props = {|
  navigation: NavigationScreenProp<NavigationLeafRoute>,
  // Redux state
  urlPrefix: string,
  customServer: ?string,
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
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    const { customServer } = props;
    this.state = {
      customServer: customServer ? customServer : "",
    };
  }

  render() {
    return (
      <Modal
        navigation={this.props.navigation}
        containerStyle={styles.container}
        modalStyle={styles.modal}
      >
        <TextInput
          style={styles.textInput}
          underlineColorAndroid="transparent"
          value={this.state.customServer}
          onChangeText={this.onChangeCustomServer}
          autoFocus={true}
        />
        <Button
          onPress={this.onPressGo}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Go</Text>
        </Button>
      </Modal>
    );
  }

  onChangeCustomServer = (newCustomServer: string) => {
    this.setState({ customServer: newCustomServer });
  }

  onPressGo = () => {
    const { customServer } = this.state;
    if (customServer !== this.props.urlPrefix) {
      this.props.dispatchActionPayload(setURLPrefix, customServer);
    }
    if (customServer && customServer !== this.props.customServer) {
      this.props.dispatchActionPayload(setCustomServer, customServer);
    }
    this.props.navigation.goBack();
  }

}

const styles = StyleSheet.create({
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
    color: '#333333',
    flex: 1,
  },
  button: {
    backgroundColor: "#88BB88",
    marginVertical: 2,
    marginHorizontal: 2,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 18,
    textAlign: 'center',
    color: "white",
  },
});

export default connect(
  (state: AppState) => ({
    urlPrefix: state.urlPrefix,
    customServer: state.customServer,
  }),
  null,
  true,
)(CustomServerModal);
