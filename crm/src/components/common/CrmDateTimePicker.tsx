import React from 'react';
import { CrmDatePicker, CrmDatePickerProps } from './CrmDatePicker';

export type CrmDateTimePickerProps = Omit<CrmDatePickerProps, 'includeTime'>;

export function CrmDateTimePicker(props: CrmDateTimePickerProps) {
  return <CrmDatePicker {...props} includeTime={true} placeholder={props.placeholder || 'Select date & time...'} />;
}

export default CrmDateTimePicker;
