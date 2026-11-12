import React from 'react';
import {TextInput} from 'react-native';

import {formatINRInput, parseINRDigits} from '../utils/money';

// 9 rupee digits in Indian grouping: 99,99,99,999 (12 chars) + optional ₹.
const FORMATTED_MAX_LENGTH = 13;

export default function MoneyInput({
  value,
  onChangeDigits,
  style,
  placeholder = '0',
  placeholderTextColor = '#D1D5DB',
  editable = true,
  showRupee = false,
  ...rest
}) {
  const formatted = formatINRInput(value);
  const display = formatted ? (showRupee ? `₹${formatted}` : formatted) : '';

  return (
    <TextInput
      value={display}
      onChangeText={text => onChangeDigits(parseINRDigits(text))}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      keyboardType="number-pad"
      maxLength={FORMATTED_MAX_LENGTH}
      style={style}
      editable={editable}
      {...rest}
    />
  );
}
