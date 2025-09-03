import React, { useState, useRef, useEffect, useCallback } from "react";

const ResizablePanel = ({
  children,
  initialWidth = 350,
  minWidth = 250,
  maxWidth = 600,
  className = "",
  style = {},
  ...props
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent) => {
        if (!isResizing && moveEvent.type !== "mousemove") return;

        const deltaX = startX - moveEvent.clientX;
        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth, startWidth + deltaX)
        );
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      // Prevent text selection during resize
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [width, minWidth, maxWidth, isResizing]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  const mergedStyle = {
    ...style,
    width: `${width}px`,
  };

  return (
    <div
      ref={panelRef}
      className={`resizable-panel ${className}`}
      style={mergedStyle}
      {...props}
    >
      {/* Resize handle */}
      <div
        className={`resize-handle ${isResizing ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
      />

      {/* Panel content */}
      {children}
    </div>
  );
};

export default ResizablePanel;
