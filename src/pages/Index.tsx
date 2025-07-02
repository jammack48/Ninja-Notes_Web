import React, { useMemo, useState, useCallback } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import '../Corkboard.css';

const ResponsiveGridLayout = WidthProvider(GridLayout);

const NOTE_WIDTH = 2;
const NOTE_HEIGHT = 2;
const COLS = 6;
const ROWS = 4;

const notesData = [
  { key: '1', text: 'Call Nigel about the project update', color: '#fff475' },
  { key: '2', text: 'Send invoice to client\nDue: Friday', color: '#ffd6a5' },
  { key: '3', text: 'Check job sheet\nReview requirements', color: '#baffc9' },
  { key: '4', text: 'Team meeting\n2:00 PM today', color: '#ffb3ba' },
  { key: '5', text: 'Buy groceries\n- Milk\n- Bread\n- Eggs', color: '#bae1ff' },
];

function getRandomNonOverlappingPositions(count, cols, rows, w, h) {
  const positions = [];
  const taken = new Set();
  let attempts = 0;
  
  while (positions.length < count && attempts < 100) {
    const x = Math.floor(Math.random() * (cols - w + 1));
    const y = Math.floor(Math.random() * (rows - h + 1));
    const key = `${x},${y}`;
    
    if (!taken.has(key)) {
      taken.add(key);
      positions.push({ x, y });
    }
    attempts++;
  }
  
  return positions;
}

const CorkboardNote = ({ text, color, isDragging }) => (
  <div 
    className={`corkboard-note ${isDragging ? 'dragging' : ''}`} 
    style={{ background: color }}
  >
    <div className="corkboard-pin" />
    <div className="corkboard-note-text">{text}</div>
  </div>
);

const Index = () => {
  const [layout, setLayout] = useState(() => {
    const positions = getRandomNonOverlappingPositions(notesData.length, COLS, ROWS, NOTE_WIDTH, NOTE_HEIGHT);
    return notesData.map((note, i) => ({
      i: note.key,
      x: positions[i]?.x || 0,
      y: positions[i]?.y || 0,
      w: NOTE_WIDTH,
      h: NOTE_HEIGHT,
      static: false
    }));
  });

  const [draggedItem, setDraggedItem] = useState(null);
  const [originalPositions, setOriginalPositions] = useState({});

  const onDragStart = useCallback((layout, oldItem, newItem, placeholder, e, element) => {
    console.log('Drag start:', newItem.i);
    setDraggedItem(newItem.i);
    
    // Store original position
    setOriginalPositions(prev => ({
      ...prev,
      [newItem.i]: { x: oldItem.x, y: oldItem.y }
    }));
  }, []);

  const onDrag = useCallback((layout, oldItem, newItem, placeholder, e, element) => {
    // Prevent other items from moving during drag
    const updatedLayout = layout.map(item => {
      if (item.i === newItem.i) {
        return newItem;
      }
      // Keep other items in their original positions
      return originalPositions[item.i] ? 
        { ...item, x: originalPositions[item.i].x, y: originalPositions[item.i].y } : 
        item;
    });
    
    setLayout(updatedLayout);
  }, [originalPositions]);

  const onDragStop = useCallback((layout, oldItem, newItem, placeholder, e, element) => {
    console.log('Drag stop:', newItem.i);
    setDraggedItem(null);
    
    // Check if the new position overlaps with any existing note
    const hasCollision = layout.some(item => 
      item.i !== newItem.i && 
      item.x < newItem.x + newItem.w &&
      item.x + item.w > newItem.x &&
      item.y < newItem.y + newItem.h &&
      item.y + item.h > newItem.y
    );

    if (hasCollision) {
      // Revert to original position if there's a collision
      const revertedLayout = layout.map(item => {
        if (item.i === newItem.i && originalPositions[item.i]) {
          return { 
            ...item, 
            x: originalPositions[item.i].x, 
            y: originalPositions[item.i].y 
          };
        }
        return item;
      });
      setLayout(revertedLayout);
    } else {
      // Accept the new position
      setLayout(layout);
    }
    
    // Clear original positions
    setOriginalPositions({});
  }, [originalPositions]);

  const onLayoutChange = useCallback((newLayout) => {
    // Only update layout if we're not currently dragging
    if (!draggedItem) {
      setLayout(newLayout);
    }
  }, [draggedItem]);

  return (
    <div className="corkboard-bg">
      <h1 className="corkboard-title">Ninja Notes Corkboard</h1>
      <ResponsiveGridLayout
        className="layout"
        layout={layout}
        cols={COLS}
        rowHeight={90}
        isResizable={false}
        margin={[24, 24]}
        compactType={null}
        preventCollision={true}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragStop={onDragStop}
        onLayoutChange={onLayoutChange}
        useCSSTransforms={true}
        transformScale={1}
      >
        {notesData.map(note => (
          <div key={note.key}>
            <CorkboardNote 
              text={note.text} 
              color={note.color}
              isDragging={draggedItem === note.key}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default Index;