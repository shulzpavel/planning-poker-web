import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { TextField } from "../../../design-system";
import { DropdownField } from "../../../design-system/DropdownField";
import { filterFieldProps } from "./cmsFilterLayout";

type CompactFieldProps = {
  reserveMessageSpace?: boolean;
};

function flattenChildren(children: ReactNode): ReactNode[] {
  const nodes: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      if (child != null && child !== false) nodes.push(child);
      return;
    }
    if (child.type === Fragment) {
      nodes.push(...flattenChildren((child.props as { children?: ReactNode }).children));
      return;
    }
    nodes.push(child);
  });
  return nodes;
}

/** Inject compact field props into TextField / DropdownField (incl. fragment groups). */
export function compactFilterFields(children: ReactNode): ReactNode {
  return flattenChildren(children).map((child, index) => {
    const key = isValidElement(child) && child.key != null ? child.key : `filter-field-${index}`;
    const node =
      isValidElement(child) && (child.type === TextField || child.type === DropdownField)
        ? cloneElement(child as ReactElement<CompactFieldProps>, filterFieldProps)
        : child;
    return <Fragment key={key}>{node}</Fragment>;
  });
}
