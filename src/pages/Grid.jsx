import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "./grid.scss";
const ResponsiveGridLayout = WidthProvider(Responsive);
export default function Grid() {
  const layout = [
    { i: "a", x: 0, y: 0, w: 1, h: 2, static: true },
    { i: "b", x: 1, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { i: "c", x: 4, y: 0, w: 1, h: 2 },
  ];

  const [gridSize, setGridSize] = useState(3);
  const [parentHeight] = useState(740);
  const [layouts, setLayouts] = useState({ lg: [], md: [], sm: [] });
  const [rowHeight, setRowHeight] = useState(0);
  const [cols, setCols] = useState({ lg: 9, md: 9, sm: 9 });

  useEffect(() => {
    console.log({ gridSize });
    // Set number of columns based on grid size
    const totalCols = gridSize * 3; // Each cell will be 3 units wide
    setCols({ lg: totalCols, md: totalCols, sm: totalCols });
    console.log({ totalCols });
    // Calculate row height
    const margin = 10;
    const totalMarginHeight = margin * (gridSize - 1);
    const availableHeight = parentHeight - totalMarginHeight;
    // Since each cell height is 3 units, divide by (gridSize * 3)
    const calculatedRowHeight = Math.floor(availableHeight / (gridSize * 3));

    setRowHeight(calculatedRowHeight - 7);
    generateLayout(gridSize);
  }, [gridSize, parentHeight]);

  const generateLayout = (size) => {
    const newLayouts = { lg: [], md: [], sm: [] };

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const itemId = row * size + col;

        const item = {
          i: `${itemId}`,
          x: col * 3, // Each cell starts 3 units after the previous
          y: row * 3, // Each cell starts 3 units below the previous
          w: 3, // Each cell is 3 units wide
          h: 3, // Each cell is 3 units tall
          static: true,
        };

        newLayouts.lg.push(item);
        newLayouts.md.push({ ...item });
        newLayouts.sm.push({ ...item });
      }
    }

    setLayouts(newLayouts);
    console.log(newLayouts);
  };

  const handleGridSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setGridSize(newSize);
  };

  return (
    <div className="grid-container">
      <div className="controls">
        <label htmlFor="grid-size">Grid Size: </label>
        <select id="grid-size" value={gridSize} onChange={handleGridSizeChange}>
          <option value="2">2x2</option>
          <option value="3">3x3</option>
          <option value="4">4x4</option>
          <option value="5">5x5</option>
          <option value="6">6x6</option>
        </select>
        <span className="info">
          Current row height: {Math.floor(rowHeight)}px
        </span>
        <span className="info">colums: {JSON.stringify(cols, 4, null)}</span>
      </div>
      <div style={{ height: `${parentHeight}px`, overflow: "hidden" }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={cols}
          rowHeight={rowHeight}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          isDraggable={false}
          isResizable={false}
        >
          {layouts.lg.map((item) => (
            <div key={item.i} className="grid-cell">
              Cell {parseInt(item.i) + 1}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
