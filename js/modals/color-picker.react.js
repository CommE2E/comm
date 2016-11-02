// @flow

import React from 'react';

import $ from 'jquery';
import 'spectrum-colorpicker'; // side effect: $.spectrum

type Props = {
  id: string,
  value: string,
  disabled: bool,
  onChange: (hex: string) => void,
};

class ColorPicker extends React.Component {

  props: Props;

  componentDidMount() {
    $('input#' + this.props.id).spectrum({
      cancelText: "Cancel",
      chooseText: "Choose",
      preferredFormat: "hex",
      color: this.props.value,
      change: this.onChangeColor.bind(this),
    });
    $('div.sp-replacer').attr('tabindex', 0);
  }

  render() {
    return (
      <input
        type="text"
        id={this.props.id}
        disabled={this.props.disabled}
        onChange={this.onChangeColor.bind(this)}
      />
    );
  }

  onChangeColor(tinycolor: any) {
    const color = tinycolor.toHexString().substring(1, 7);
    this.props.onChange(color);
  }

}

ColorPicker.propTypes = {
  id: React.PropTypes.string.isRequired,
  value: React.PropTypes.string.isRequired,
  disabled: React.PropTypes.bool.isRequired,
  onChange: React.PropTypes.func.isRequired,
}

export default ColorPicker;
