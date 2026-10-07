import { createElement } from 'react';
import { getCategoryIcon } from './categoryIcons';

/** Renders the MUI icon for a category's `icon` text (e.g. "briefcase"). */
export default function CategoryIcon({ name, ...props }) {
  return createElement(getCategoryIcon(name), props);
}