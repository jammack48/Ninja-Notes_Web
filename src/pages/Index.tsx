import React, { useMemo } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import '../Corkboard.css';

const ResponsiveGridLayout = WidthProvider(GridLayout);

const NOTE_WIDTH = 2;
const NOTE_HEIGHT = 2;
const COLS = 6;
const ROWS = 4;

const notesData = [
  { key: '1', text: 'Call Nigel', color: '#fff475' },
  { key: '2', text: 'Send invoice', color: '#ffd6a5' },
  { key: '3', text: 'Check job sheet', color: '#baffc9' },
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

const CorkboardNote = ({ text, color }: { text: string; color: string }) => (
  <div className="corkboard-note" style={{ background: color }}>
    <div className="corkboard-pin" />
    <div className="corkboard-note-text">{text}</div>
  </div>
);

const Index = () => {
  const positions = useMemo(() => getRandomNonOverlappingPositions(notesData.length, COLS, ROWS, NOTE_WIDTH, NOTE_HEIGHT), []);
  const notes = notesData.map((note, i) => ({ ...note, ...positions[i], w: NOTE_WIDTH, h: NOTE_HEIGHT }));

  return (
    <div className="corkboard-bg">
      <h1 className="corkboard-title">Ninja Notes Corkboard</h1>
      <ResponsiveGridLayout
        className="layout"
        cols={COLS}
        rowHeight={90}
        isResizable={false}
        margin={[24, 24]}
      >
        {notes.map(note => (
          <div key={note.key} data-grid={{ x: note.x, y: note.y, w: note.w, h: note.h }}>
            <CorkboardNote text={note.text} color={note.color} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default Index;
