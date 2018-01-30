// @flow

import type { HeaderProps, NavigationScene } from 'react-navigation';

import React from 'react';
import { Header } from 'react-navigation';

// The whole reason for overriding header is because when we override
// headerTitle, we end up having to implement headerTruncatedBackTitle ourselves
type Props = HeaderProps & { routeKey: string };
type State = { titleWidths: {[key: string]: number} };
class MessageListHeader extends React.PureComponent<Props, State> {

  state = {
    titleWidths: {},
  };

  setTitleWidth(routeKey: string, width: number) {
    this.setState({
      titleWidths: {...this.state.titleWidths, [routeKey]: width },
    });
  }

  getScreenDetails = (scene: NavigationScene) => {
    const actualResponse = this.props.getScreenDetails(scene);
    const width = this.state.titleWidths[this.props.routeKey];
    if (
      scene.key === this.props.scene.key ||
      width === undefined || width === null
    ) {
      return actualResponse;
    }
    const spaceLeft = (this.props.layout.initWidth - width) / 2;
    if (spaceLeft > 100) {
      return actualResponse;
    }
    return {
      ...actualResponse,
      options: {
        ...actualResponse.options,
        headerBackTitle: "Back",
      },
    };
  }

  render() {
    const { getScreenDetails, ...passProps } = this.props;
    return (
      <Header
        getScreenDetails={this.getScreenDetails}
        {...passProps}
      />
    );
  }

}

export default MessageListHeader;
