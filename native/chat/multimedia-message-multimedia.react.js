// @flow

import { type Media, mediaPropType } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import type { Navigate } from '../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import { TouchableWithoutFeedback } from 'react-native';

import Multimedia from './multimedia.react';

type Props = {|
  media: Media,
  navigate: Navigate,
  style?: ImageStyle,
|};
class MultimediaMessageMultimedia extends React.PureComponent<Props> {

  static propTypes = {
    media: mediaPropType.isRequired,
    navigate: PropTypes.func.isRequired,
  };

  render() {
    const { media, style } = this.props;
    return (
      <TouchableWithoutFeedback>
        <Multimedia media={media} style={style} />
      </TouchableWithoutFeedback>
    );
  }

}

export default MultimediaMessageMultimedia;
