import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Home, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cloneBlocks, getMovementRange, isSolved, moveBlock } from './slideEscapeEngine';
import { SLIDE_ESCAPE_LEVELS } from './slideEscapeLevels';
import type { SlideBlock } from './slideEscapeTypes';

interface SlideEscapeGameProps { mode: string }
interface DragState { id: string; startPointer: number; startPosition: number; startBlocks: SlideBlock[] }

const PROGRESS_KEY = 'nessygames_slide_escape_progress';

export const SlideEscapeGame: React.FC<SlideEscapeGameProps> = () => {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const blocksRef = useRef<SlideBlock[]>([]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [blocks, setBlocks] = useState<SlideBlock[]>(() => cloneBlocks(SLIDE_ESCAPE_LEVELS[0].blocks));
  const [history, setHistory] = useState<SlideBlock[][]>([]);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
  });

  const level = SLIDE_ESCAPE_LEVELS[levelIndex];

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  const loadLevel = (index: number) => {
    const safeIndex = (index + SLIDE_ESCAPE_LEVELS.length) % SLIDE_ESCAPE_LEVELS.length;
    const next = cloneBlocks(SLIDE_ESCAPE_LEVELS[safeIndex].blocks);
    blocksRef.current = next;
    setLevelIndex(safeIndex);
    setBlocks(next);
    setHistory([]);
    setMoves(0);
    setCompleted(false);
  };

  const finishLevel = (moveCount: number) => {
    setCompleted(true);
    setBestMoves((current) => {
      const previous = current[level.id];
      const next = { ...current, [level.id]: previous ? Math.min(previous, moveCount) : moveCount };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const beginDrag = (event: React.PointerEvent, block: SlideBlock) => {
    if (completed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointer = block.axis === 'horizontal' ? event.clientX : event.clientY;
    dragRef.current = {
      id: block.id,
      startPointer: pointer,
      startPosition: block.axis === 'horizontal' ? block.x : block.y,
      startBlocks: cloneBlocks(blocksRef.current)
    };
  };

  const continueDrag = (event: React.PointerEvent, block: SlideBlock) => {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || drag.id !== block.id || !board) return;
    const pointer = block.axis === 'horizontal' ? event.clientX : event.clientY;
    const cellSize = board.getBoundingClientRect().width / 6;
    const delta = Math.round((pointer - drag.startPointer) / cellSize);
    const range = getMovementRange(drag.startBlocks, block.id);
    const desired = Math.max(range.min, Math.min(range.max, drag.startPosition + delta));
    const next = moveBlock(drag.startBlocks, block.id, desired);
    blocksRef.current = next;
    setBlocks(next);
  };

  const endDrag = (event: React.PointerEvent, block: SlideBlock) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== block.id) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    const current = blocksRef.current.find((item) => item.id === block.id);
    const finalPosition = current ? (current.axis === 'horizontal' ? current.x : current.y) : drag.startPosition;
    if (finalPosition === drag.startPosition) return;
    const nextMoves = moves + 1;
    setHistory((items) => [...items, drag.startBlocks]);
    setMoves(nextMoves);
    if (isSolved(blocksRef.current)) finishLevel(nextMoves);
  };

  const undo = () => {
    if (!history.length || completed) return;
    const previous = history[history.length - 1];
    blocksRef.current = cloneBlocks(previous);
    setBlocks(cloneBlocks(previous));
    setHistory((items) => items.slice(0, -1));
    setMoves((count) => Math.max(0, count - 1));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-400">Slide Escape</span>
          <h1 className="text-xl font-extrabold text-white">Seviye {level.id} · {level.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Hamle</span>
            <strong className="font-mono text-lg text-white">{moves}</strong>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">En iyi</span>
            <strong className="font-mono text-lg text-amber-400">{bestMoves[level.id] || '—'}</strong>
          </div>
        </div>
      </header>

      <main className="grid lg:grid-cols-[1fr_260px] gap-6 items-center">
        <div className="relative flex justify-center py-4">
          <div className="relative w-[min(78vw,540px)]">
            <div className="absolute top-[33.333%] -right-11 w-14 h-[16.667%] rounded-r-2xl border-y border-r border-cyan-400/30 bg-cyan-500/10 flex items-center justify-end pr-2">
              <ArrowRight className="text-cyan-300 h-5 w-5 animate-pulse" />
            </div>
            <div
              ref={boardRef}
              className="relative aspect-square rounded-[28px] overflow-visible border-[6px] border-slate-700 bg-slate-950 shadow-2xl shadow-cyan-950/30 touch-none"
              style={{ backgroundImage: 'linear-gradient(rgba(51,65,85,.34) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,.34) 1px, transparent 1px)', backgroundSize: '16.6667% 16.6667%' }}
            >
              {blocks.map((block) => {
                const horizontal = block.axis === 'horizontal';
                return (
                  <button
                    key={block.id}
                    aria-label={block.target ? 'Hedef blok' : `${horizontal ? 'Yatay' : 'Dikey'} blok`}
                    onPointerDown={(event) => beginDrag(event, block)}
                    onPointerMove={(event) => continueDrag(event, block)}
                    onPointerUp={(event) => endDrag(event, block)}
                    onPointerCancel={(event) => endDrag(event, block)}
                    className={`absolute rounded-xl border transition-[left,top] duration-75 select-none cursor-grab active:cursor-grabbing active:scale-[1.02] ${block.target
                      ? 'bg-gradient-to-br from-fuchsia-500 to-rose-500 border-rose-300 shadow-lg shadow-rose-500/30'
                      : 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-300/70 shadow-lg shadow-cyan-900/30'}`}
                    style={{
                      left: `calc(${block.x * 16.6667}% + 4px)`,
                      top: `calc(${block.y * 16.6667}% + 4px)`,
                      width: `calc(${(horizontal ? block.length : 1) * 16.6667}% - 8px)`,
                      height: `calc(${(horizontal ? 1 : block.length) * 16.6667}% - 8px)`
                    }}
                  >
                    <span className="absolute inset-1 rounded-lg border border-white/15" />
                    <span className={`absolute rounded-full bg-white/35 ${horizontal ? 'w-8 h-1 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'h-8 w-1 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}`} />
                  </button>
                );
              })}

              {completed && (
                <div className="absolute inset-0 z-20 rounded-[22px] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                  <div className="space-y-4">
                    <Trophy className="h-14 w-14 text-amber-400 mx-auto" />
                    <div><h2 className="text-2xl font-black text-white">Çıkış Açıldı!</h2><p className="text-sm text-slate-400">{moves} hamlede tamamladın · Par {level.par}</p></div>
                    <button onClick={() => loadLevel(levelIndex + 1)} className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black inline-flex items-center gap-2">Sonraki Seviye <ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-5">
          <div><h2 className="font-bold text-white">Nasıl oynanır?</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Blokları kendi yönlerinde sürükle. Pembe hedef bloğun sağdaki neon çıkışa ulaşması için yolu temizle.</p></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={undo} disabled={!history.length || completed} className="px-3 py-3 rounded-xl bg-slate-800 disabled:opacity-35 hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-2"><Undo2 className="h-4 w-4" /> Geri Al</button>
            <button onClick={() => loadLevel(levelIndex)} className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-2"><RotateCcw className="h-4 w-4" /> Yenile</button>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3"><button onClick={() => loadLevel(levelIndex - 1)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs font-bold text-slate-400">{levelIndex + 1} / {SLIDE_ESCAPE_LEVELS.length}</span><button onClick={() => loadLevel(levelIndex + 1)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-5 gap-1.5">{SLIDE_ESCAPE_LEVELS.map((item, index) => <button key={item.id} onClick={() => loadLevel(index)} className={`aspect-square rounded-lg text-xs font-black ${index === levelIndex ? 'bg-cyan-500 text-slate-950' : bestMoves[item.id] ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-slate-800 text-slate-500'}`}>{item.id}</button>)}</div>
          </div>
          <Link to="/games/slide-escape" className="w-full px-3 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-sm font-bold flex items-center justify-center gap-2"><Home className="h-4 w-4" /> Oyun Detayı</Link>
        </aside>
      </main>
    </div>
  );
};
