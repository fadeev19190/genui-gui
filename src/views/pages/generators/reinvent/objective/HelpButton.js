import React from 'react';
import { PopoverBody, PopoverHeader, UncontrolledPopover } from 'reactstrap';

let _counter = 0;

export default function HelpButton({ title, children, placement = "right" }) {
  const [id] = React.useState(() => `obj-help-${++_counter}`);
  return (
    <>
      <button
        id={id}
        type="button"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "16px", height: "16px", borderRadius: "50%",
          border: "1px solid #6c757d", background: "transparent",
          color: "#6c757d", fontSize: "10px", fontWeight: "bold",
          cursor: "pointer", lineHeight: 1, padding: 0,
          marginLeft: "6px", verticalAlign: "middle", flexShrink: 0,
        }}
      >?</button>
      <UncontrolledPopover trigger="legacy" placement={placement} target={id}>
        {title && <PopoverHeader>{title}</PopoverHeader>}
        <PopoverBody style={{ fontSize: "0.85rem", maxWidth: "300px" }}>{children}</PopoverBody>
      </UncontrolledPopover>
    </>
  );
}
