// @flow

import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import XCircleIcon from 'react-feather/dist/icons/x-circle';

import css from './chat-message-list.css';

type Props = {|
  pendingUpload: PendingMultimediaUpload,
  remove: (pendingUpload: PendingMultimediaUpload) => void,
|};
class MultimediaPreview extends React.PureComponent<Props> {

  static propTypes = {
    pendingUpload: pendingMultimediaUploadPropType.isRequired,
    remove: PropTypes.func.isRequired,
  };

  render() {
    return (
      <span className={css.preview}>
        <img src={this.props.pendingUpload.uri} />
        <XCircleIcon onClick={this.remove} />
      </span>
    );
  }

  remove = () => {
    this.props.remove(this.props.pendingUpload);
  }

}

export default MultimediaPreview;
