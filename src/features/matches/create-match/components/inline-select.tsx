export {
  OptionSelectField,
  OptionSelectSheet,
  type OptionSelectFieldProps,
  type OptionSelectItem,
} from '@/components/option-select';

/** @deprecated Use OptionSelectItem from `@/components/option-select`. */
export type InlineSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

/** @deprecated Use OptionSelectField from `@/components/option-select`. */
export { OptionSelectField as InlineSelect } from '@/components/option-select';
