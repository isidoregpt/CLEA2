// src/components/KonvaComponents.js
import React, { useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line } from 'react-konva';

/**
 * KonvaComponents
 *
 * Fixes over original:
 *  - Real drag-to-draw rectangle selection (mouse down → drag → up)
 *  - Point selection mode still works on click
 *  - Selection emits the full {x, y, width, height} rect to parent
 */
const KonvaComponents = ({
  image,
  width,
  height,
  showSunBoundary,
  sunParams,
  currentSelection,
  selectionMode,
  onSelectionMade,
}) => {
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [liveRect, setLiveRect] = useState(null);
  const stageRef = useRef(null);

  const getPos = (e) => {
    const stage = e.target.getStage();
    return stage.getPointerPosition();
  };

  const handleMouseDown = (e) => {
    if (selectionMode === 'point') return; // handled by onClick
    const pos = getPos(e);
    setStartPos(pos);
    setLiveRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    setDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!drawing || !startPos) return;
    const pos = getPos(e);
    setLiveRect({
      x: Math.min(pos.x, startPos.x),
      y: Math.min(pos.y, startPos.y),
      width:  Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = (e) => {
    if (!drawing || !startPos) return;
    setDrawing(false);
    const pos = getPos(e);
    const rect = {
      x: Math.min(pos.x, startPos.x),
      y: Math.min(pos.y, startPos.y),
      width:  Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    };
    setLiveRect(null);
    setStartPos(null);
    // Treat very small drags as point clicks
    if (rect.width < 5 && rect.height < 5) {
      onSelectionMade({ x: pos.x, y: pos.y, width: 1, height: 1 });
    } else {
      onSelectionMade(rect);
    }
  };

  const handleClick = (e) => {
    if (selectionMode !== 'point') return;
    const pos = getPos(e);
    onSelectionMade({ x: pos.x, y: pos.y, width: 1, height: 1 });
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      style={{ cursor: selectionMode === 'point' ? 'crosshair' : 'crosshair' }}
    >
      <Layer>
        {/* Solar image */}
        <KonvaImage image={image} width={width} height={height} />

        {/* Sun boundary circle */}
        {showSunBoundary && sunParams && sunParams.radius > 0 && (
          <Circle
            x={sunParams.cx}
            y={sunParams.cy}
            radius={sunParams.radius}
            stroke="#ef4444"
            strokeWidth={1.5}
            dash={[6, 4]}
            listening={false}
          />
        )}

        {/* Committed selection */}
        {currentSelection && (
          selectionMode === 'rect' ? (
            <Rect
              x={currentSelection.x}
              y={currentSelection.y}
              width={currentSelection.width}
              height={currentSelection.height}
              stroke="#e879f9"
              strokeWidth={2}
              fill="rgba(232,121,249,0.15)"
              listening={false}
            />
          ) : (
            <>
              <Circle
                x={currentSelection.x}
                y={currentSelection.y}
                radius={6}
                fill="#e879f9"
                listening={false}
              />
              {/* Cross-hair lines */}
              <Line points={[currentSelection.x - 10, currentSelection.y, currentSelection.x + 10, currentSelection.y]} stroke="#e879f9" strokeWidth={1.5} listening={false} />
              <Line points={[currentSelection.x, currentSelection.y - 10, currentSelection.x, currentSelection.y + 10]} stroke="#e879f9" strokeWidth={1.5} listening={false} />
            </>
          )
        )}

        {/* Live drag rectangle */}
        {drawing && liveRect && (
          <Rect
            x={liveRect.x}
            y={liveRect.y}
            width={liveRect.width}
            height={liveRect.height}
            stroke="#fbbf24"
            strokeWidth={1.5}
            dash={[4, 3]}
            fill="rgba(251,191,36,0.08)"
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
};

export default KonvaComponents;
