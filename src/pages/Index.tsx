import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Draggable from 'react-draggable';
import '../Corkboard.css';
import { supabase } from '@/integrations/supabase/client';

const NOTE_COLOR = '#fff475';
const NOTE_WIDTH = 180;

const CorkboardNote = ({ text, is_reminder, remind_at, zIndex }) => (
  <div
    className="corkboard-note"
    style={{ background: NOTE_COLOR, width: NOTE_WIDTH, zIndex }}
  >
    <div className="corkboard-pin" />
    <div className="corkboard-note-text">
      {text}
      {is_reminder && remind_at && (
        <div style={{ fontSize: '0.85em', color: '#b71c1c', marginTop: 8 }}>
          ⏰ Remind at: {remind_at}
        </div>
      )}
    </div>
  </div>
);

const Index = () => {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ text: '', is_reminder: false, remind_at: '' });
  const [draggedKey, setDraggedKey] = useState(null);
  const [originalPositions, setOriginalPositions] = useState({});
  const zCounter = useRef(10);
  const boardRef = useRef(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Helper to check overlap
  const isOverlapping = (a, b) => {
    const ax1 = a.x, ay1 = a.y, ax2 = a.x + NOTE_WIDTH, ay2 = a.y + getNoteHeight(a.text);
    const bx1 = b.x, by1 = b.y, bx2 = b.x + NOTE_WIDTH, by2 = b.y + getNoteHeight(b.text);
    return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2);
  };

  // Estimate note height based on text length (for overlap check)
  function getNoteHeight(text) {
    const lines = text.split('\n').length;
    return 60 + lines * 18;
  }

  // Helper to find a random non-overlapping position within the corkboard bounds
  function getRandomNonOverlappingPosition(existingNotes, text) {
    const board = boardRef.current;
    const boardWidth = board ? board.offsetWidth : 1000;
    const boardHeight = board ? board.offsetHeight : 600;
    const noteHeight = getNoteHeight(text);
    let tries = 0;
    while (tries < 100) {
      const x = Math.round(Math.random() * (boardWidth - NOTE_WIDTH));
      const y = Math.round(Math.random() * (boardHeight - noteHeight));
      const newNote = { x, y, text };
      if (!existingNotes.some(n => isOverlapping(newNote, n))) {
        return { x, y };
      }
      tries++;
    }
    // fallback
    return { x: 0, y: 0 };
  }

  // Helper to check if a note is in bounds
  function isInBounds(x, y, text) {
    const board = boardRef.current;
    const boardWidth = board ? board.offsetWidth : 1000;
    const boardHeight = board ? board.offsetHeight : 600;
    const noteHeight = getNoteHeight(text);
    return (
      x >= 0 &&
      x <= boardWidth - NOTE_WIDTH &&
      y >= 0 &&
      y <= boardHeight - noteHeight
    );
  }

  // Fetch notes from Supabase on mount and after add
  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }
    let notesArr = [];
    for (let idx = 0; idx < (data || []).length; idx++) {
      const row = data[idx];
      let x = row.x;
      let y = row.y;
      const text = row.title + (row.description ? '\n' + row.description : '');
      // If x or y is missing or out of bounds, assign a random non-overlapping in-bounds position and update Supabase
      if (x == null || y == null || !isInBounds(x, y, text)) {
        const pos = getRandomNonOverlappingPosition(notesArr, text);
        x = pos.x;
        y = pos.y;
        await supabase.from('tasks').update({ x, y }).eq('id', row.id);
      }
      notesArr.push({
        key: row.id,
        text,
        x,
        y,
        is_reminder: !!row.due_date,
        remind_at: row.due_date || '',
        z: idx + 1,
        supabase_id: row.id,
      });
    }
    setNotes(notesArr);
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line
  }, []);

  // Handle drag start: bring note to top, store original position
  const handleStart = (e, data, key) => {
    setDraggedKey(key);
    setOriginalPositions(prev => ({ ...prev, [key]: { x: data.x, y: data.y } }));
    zCounter.current += 1;
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.key === key ? { ...note, z: zCounter.current } : note
      )
    );
  };

  // Handle drag: update position
  const handleDrag = (e, data, key) => {
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.key === key ? { ...note, x: data.x, y: data.y } : note
      )
    );
    // Check if over trash
    setIsOverTrash(isOverTrashBasket(data.x, data.y));
  };

  // Handle drag stop: check for overlap, revert if needed, update Supabase
  const handleStop = (e, data, key) => {
    setDraggedKey(null);
    if (isOverTrashBasket(data.x, data.y)) {
      // Delete from Supabase and remove from UI asynchronously
      (async () => {
        await supabase.from('tasks').delete().eq('id', key);
        setNotes(prevNotes => prevNotes.filter(note => note.key !== key));
        setIsOverTrash(false);
      })();
      return;
    }
    const thisNote = notes.find(n => n.key === key);
    const movedNote = { ...thisNote, x: data.x, y: data.y };
    const overlap = notes.some(n => n.key !== key && isOverlapping(movedNote, n));
    if (overlap && originalPositions[key]) {
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.key === key ? { ...note, x: originalPositions[key].x, y: originalPositions[key].y } : note
        )
      );
    } else {
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.key === key ? { ...note, x: data.x, y: data.y } : note
        )
      );
      // Update position in Supabase asynchronously
      if (thisNote && thisNote.supabase_id) {
        updateNotePositionInSupabase(thisNote.supabase_id, data.x, data.y);
      }
    }
    setOriginalPositions(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setIsOverTrash(false);
  };

  // Async function to update note position in Supabase
  const updateNotePositionInSupabase = async (id, x, y) => {
    await supabase.from('tasks').update({ x, y }).eq('id', id);
  };

  // Handle form input
  const handleInput = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  // Handle form submit: add note to Supabase and local state
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.text.trim()) return;
    const [title, ...descArr] = form.text.split('\n');
    const description = descArr.join('\n');
    const board = boardRef.current;
    const boardWidth = board ? board.offsetWidth : 1000;
    const boardHeight = board ? board.offsetHeight : 600;
    const noteHeight = getNoteHeight(form.text);
    const x = Math.round(Math.random() * (boardWidth - NOTE_WIDTH));
    const y = Math.round(Math.random() * (boardHeight - noteHeight));
    const { data, error } = await supabase.from('tasks').insert([
      {
        title,
        description,
        x,
        y,
        due_date: form.is_reminder ? form.remind_at : null,
        completed: false,
        priority: form.is_reminder ? 'high' : null,
      },
    ]).select();
    if (error) {
      alert('Error saving note: ' + error.message);
      return;
    }
    setForm({ text: '', is_reminder: false, remind_at: '' });
    zCounter.current += 1;
    // Re-fetch notes from Supabase to show the new note
    fetchNotes();
  };

  // Helper to move all notes in bounds after corkboard is rendered or window is resized
  function moveNotesInBounds(notesArr) {
    const board = boardRef.current;
    if (!board) return notesArr;
    const boardWidth = board.offsetWidth;
    const boardHeight = board.offsetHeight;
    return notesArr.map(note => {
      let x = note.x;
      let y = note.y;
      const noteHeight = getNoteHeight(note.text);
      let changed = false;
      if (x < 0) { x = 0; changed = true; }
      if (x > boardWidth - NOTE_WIDTH) { x = boardWidth - NOTE_WIDTH; changed = true; }
      if (y < 0) { y = 0; changed = true; }
      if (y > boardHeight - noteHeight) { y = boardHeight - noteHeight; changed = true; }
      if (changed) {
        // Update Supabase if position changed
        if (note.supabase_id) {
          supabase.from('tasks').update({ x, y }).eq('id', note.supabase_id);
        }
        return { ...note, x, y };
      }
      return note;
    });
  }

  // After corkboard is rendered, ensure all notes are in bounds
  useLayoutEffect(() => {
    setNotes(prevNotes => moveNotesInBounds(prevNotes));
    // eslint-disable-next-line
  }, [notes.length]);

  // On window resize, re-check all notes
  useEffect(() => {
    const handleResize = () => {
      setNotes(prevNotes => moveNotesInBounds(prevNotes));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper: check if note is over trash basket
  function isOverTrashBasket(x, y) {
    const trash = document.getElementById('trash-basket');
    if (!trash) return false;
    const rect = trash.getBoundingClientRect();
    // Adjust for board offset
    const board = boardRef.current;
    if (!board) return false;
    const boardRect = board.getBoundingClientRect();
    const absX = x + boardRect.left;
    const absY = y + boardRect.top + 40; // 40: pin offset
    return (
      absX + NOTE_WIDTH / 2 > rect.left &&
      absX + NOTE_WIDTH / 2 < rect.right &&
      absY > rect.top &&
      absY < rect.bottom
    );
  }

  return (
    <div ref={boardRef} className="corkboard-bg" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <h1 className="corkboard-title">Ninja Notes Corkboard</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', background: '#fffbe6', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
        <textarea
          name="text"
          value={form.text}
          onChange={handleInput}
          placeholder="Enter note text..."
          rows={2}
          style={{ width: 220, resize: 'vertical', fontSize: 16, borderRadius: 4, border: '1px solid #e6d97a', padding: 6 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            name="is_reminder"
            checked={form.is_reminder}
            onChange={handleInput}
          />
          Reminder
        </label>
        {form.is_reminder && (
          <input
            type="datetime-local"
            name="remind_at"
            value={form.remind_at}
            onChange={handleInput}
            style={{ fontSize: 15, borderRadius: 4, border: '1px solid #e6d97a', padding: 4 }}
          />
        )}
        <button type="submit" style={{ background: '#fff475', border: '1.5px solid #e6d97a', borderRadius: 4, padding: '8px 16px', fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 1px 4px #0001' }}>
          Add Note
        </button>
      </form>
      {notes.map(note => (
        <Draggable
          key={note.key}
          position={{ x: note.x, y: note.y }}
          onStart={(e, data) => handleStart(e, data, note.key)}
          onDrag={(e, data) => handleDrag(e, data, note.key)}
          onStop={(e, data) => handleStop(e, data, note.key)}
          bounds="parent"
        >
          <div style={{ position: 'absolute', zIndex: note.z || 1, width: NOTE_WIDTH }}>
            <CorkboardNote text={note.text} is_reminder={note.is_reminder} remind_at={note.remind_at} zIndex={note.z || 1} />
          </div>
        </Draggable>
      ))}
      {/* Trash basket drop target */}
      <div
        id="trash-basket"
        className={`trash-basket${isOverTrash ? ' trash-hover' : ''}`}
        style={{
          position: 'absolute',
          right: 40,
          bottom: 40,
          width: 80,
          height: 80,
          background: isOverTrash ? '#e74c3c' : '#bfa76a',
          borderRadius: 16,
          boxShadow: '0 4px 16px #0003',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          fontSize: 36,
          color: '#fff',
          transition: 'background 0.2s',
          opacity: 0.85,
        }}
      >
        🗑️
      </div>
    </div>
  );
};

export default Index;