import { useEffect, useMemo, useRef, useState } from 'react';
import { pudding, useStorage, useWidgetLocale, useWidgetState, type InteractionContext } from '@pudding/widget';
import { ArrowRight, Check, ChevronRight, Eraser, LoaderCircle, Pencil, Plus, RotateCcw, Save, Trash2, Undo2, Volume2, VolumeX } from 'lucide-react';
import { analyze, cells, directions, levels, trace, xy, type Brush, type Direction, type Level } from './rules';
import { cancelEditor, current, deleteLevel, changeGame, rotateMirror, undoMove, launchDraft, loadLevel, paintCell, registerInterfaces, reset, saveLevel, startEditor } from './game';
import { errorText, setLocale, t, type MessageKey } from './text';
import { cue, disposeAudio, silence, unlockAudio } from './audio';
import './style.css';

const levelName = (level: Level) => level.title || (levels.some(l => l.id === level.id) ? t(level.id as MessageKey) : t('untitled'));
const svgPoint = ({x,y}: {x:number;y:number}) => (60 + x * 60) + ',' + (60 + y * 60);

export default function App() {
  useWidgetState();
  const locale = useWidgetLocale(); setLocale(locale);
  const stored = useStorage();
  const game = current(), editing = game.mode === 'edit';
  const board = editing ? game.draft! : {...game.level,mirrors:game.mirrors};
  const light = useMemo(() => trace(board), [board.source.cell,board.source.direction,board.target,JSON.stringify(board.mirrors),JSON.stringify(board.walls)]);
  const won = !editing && light.outcome === 'solved';
  const initialCheck = useMemo(() => analyze(game.level), [game.level]);
  const library = (stored.data?.data.levels as unknown as Level[]) || [];
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [brush,setBrush] = useState<Brush>('mirror'), [direction,setDirection] = useState<Direction>('right');
  const [draftTitle,setDraftTitle] = useState(game.draft?.title || '');
  const [tab,setTab] = useState<'lessons'|'saved'>('lessons');
  const previous = useRef({id:game.level.id,mirrors:JSON.stringify(game.mirrors)});
  const localIndex = levels.findIndex(l => l.id === game.level.id);
  useEffect(() => { setDraftTitle(game.draft?.title || ''); }, [game.draft?.id]);

  async function perform(fn: (context:InteractionContext) => Promise<unknown>) {
    setBusy(true); setError(''); setNotice('');
    try { await pudding.interaction.handle(fn); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    pudding.setInstructions(t('instructions'));
    const off = registerInterfaces();
    return () => { off.forEach(fn => fn()); pudding.setInstructions(''); };
  }, [locale]);
  useEffect(() => {
    const mirrors = JSON.stringify(game.mirrors);
    if (game.sound && previous.current.id === game.level.id && previous.current.mirrors !== mirrors && !editing) cue(won ? 'solved' : light.outcome === 'wall' || light.outcome === 'source' ? 'blocked' : 'rotate');
    previous.current = {id:game.level.id,mirrors};
  }, [game.level.id,game.mirrors,game.sound,editing,won,light.outcome]);
  useEffect(() => () => { void disposeAudio(); }, []);
  function activateSound() { if (game.sound) void unlockAudio().then(ok => { if (!ok) setNotice(t('audioUnavailable')); }); }
  const status = editing ? t('checkPending') : won ? t('solved') : t(light.outcome === 'wall' ? 'wallHit' : light.outcome === 'source' ? 'sourceHit' : light.outcome === 'loop' ? 'loop' : 'edge');

  return <main className="lw-app" onPointerDown={activateSound} onKeyDown={activateSound}>
    <header className="lw-header">
      <div className="lw-brand"><span className="lw-emblem"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 29h15V12h13"/><path className="lw-emblem-mirror" d="m15 35 12-12M15 18 27 6"/><circle cx="34" cy="12" r="3"/></svg></span><div><h1>{t('title')}</h1><p>{t('subtitle')}</p></div></div>
      <button className="lw-icon-button" aria-label={t(game.sound?'soundOn':'soundOff')} aria-pressed={game.sound} disabled={busy} onClick={() => { if (game.sound) silence(); else void unlockAudio(); void perform(c => changeGame(g => ({...g,sound:!g.sound}),c)); }}>{game.sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
    </header>
    {(error||notice)&&<div className={'lw-feedback'+(error?' is-error':'')} role={error?'alert':'status'}>{error||notice}</div>}
    <div className={'lw-layout'+(editing?' is-editing':'')}>
      <section className="lw-main">
        <nav className="lw-tabs" aria-label={t('lessons')}>
          <div className="lw-segment"><button aria-pressed={tab==='lessons'} onClick={()=>setTab('lessons')}>{t('lessons')}</button><button aria-pressed={tab==='saved'} onClick={()=>setTab('saved')}>{t('saved')}</button></div>
          <button className="lw-text-button" disabled={busy} onClick={()=>void perform(c=>startEditor(true,c))}><Plus size={16}/>{t('create')}</button>
        </nav>
        {tab==='lessons'?<div className="lw-levels">{levels.map((l,i)=><button key={l.id} disabled={busy} className={!editing&&game.level.id===l.id?'is-selected':''} aria-pressed={!editing&&game.level.id===l.id} onClick={()=>void perform(c=>loadLevel(l,c))}><span>{String(i+1).padStart(2,'0')}</span><strong>{levelName(l)}</strong></button>)}</div>:
          <div className="lw-library">{stored.isLoading?<LoaderCircle className="lw-spinner" size={18}/>:stored.error?<p role="alert">{errorText(stored.error)}</p>:!library.length?<p>{t('emptySaved')}</p>:library.map(l=><div key={l.id}><button className="lw-text-button" disabled={busy} onClick={()=>void perform(c=>loadLevel(l,c))}>{levelName(l)}<ChevronRight size={14}/></button><button className="lw-icon-button" disabled={busy} aria-label={t('delete',{name:levelName(l)})} onClick={()=>void perform(c=>deleteLevel(l.id,c))}><Trash2 size={14}/></button></div>)}</div>}
        <section className={'lw-board-card'+(won?' is-solved':'')}>
          <div className="lw-board-heading"><div><span className="lw-eyebrow">{editing?t('edit'):(localIndex>=0?String(localIndex+1).padStart(2,'0')+' / 06':t('saved'))}</span><h2>{editing?t('edit'):levelName(game.level)}</h2></div><span className="lw-counter">{editing?t('mirrorsCount',{count:board.mirrors.length}):t('moves',{count:game.history.length})}</span></div>
          <div className="lw-board" aria-label={t('boardLabel')}>
            <svg viewBox="0 0 420 420" aria-hidden="true">
              <defs><pattern id="lw-wall" width="8" height="8" patternUnits="userSpaceOnUse"><path d="m-2 2 4-4m-2 10 8-8m-2 10 4-4" stroke="currentColor" strokeWidth="1.5"/></pattern><filter id="lw-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter><linearGradient id="lw-mirror" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e1f8ff"/><stop offset=".5" stopColor="#5aafbf"/><stop offset="1" stopColor="#c0e1e7"/></linearGradient></defs>
              <rect className="lw-board-surface" x="30" y="30" width="360" height="360" rx="14"/>
              {Array.from({length:6},(_,i)=><g key={i}><text className="lw-axis" x={60+i*60} y="18">{String.fromCharCode(65+i)}</text><text className="lw-axis" x="15" y={64+i*60}>{i+1}</text></g>)}
              {Array.from({length:5},(_,i)=><g className="lw-grid" key={i}><path d={'M'+(90+i*60)+' 30V390'}/><path d={'M30 '+(90+i*60)+'H390'}/></g>)}
              <polyline className="lw-ray-glow" points={light.path.map(svgPoint).join(' ')} filter="url(#lw-glow)"/>
              <polyline className="lw-ray" points={light.path.map(svgPoint).join(' ')}/>
              {board.walls.map(cell=>{const {x,y}=xy(cell);return <g key={cell} transform={'translate('+(60+x*60)+','+(60+y*60)+')'} className="lw-wall"><rect x="-21" y="-21" width="42" height="42" rx="7"/><rect x="-15" y="-15" width="30" height="30" rx="3" fill="url(#lw-wall)"/></g>;})}
              {board.mirrors.map(m=>{const {x,y}=xy(m.cell);return <g key={m.cell} transform={'translate('+(60+x*60)+','+(60+y*60)+')'}><circle className="lw-mirror-base" r="22"/>{game.highlight===m.cell&&<circle className="lw-hint-ring" r="26"/>}<g className="lw-mirror" style={{transform:'rotate('+(m.tilt==='/'?0:90)+'deg)'}}><path className="lw-mirror-shadow" d="m-15 15 30-30"/><path d="m-15 15 30-30" stroke="url(#lw-mirror)" strokeWidth="6" strokeLinecap="round"/><path d="m-15 13 28-28" stroke="#effcff" strokeWidth="1.5" strokeLinecap="round"/></g></g>;})}
              <g transform={'translate('+svgPoint(xy(board.source.cell))+')'} className="lw-source"><circle r="19"/><g transform={'rotate('+(directions.indexOf(board.source.direction)*90)+')'}><path d="M-9 0H8m-5-5 5 5-5 5"/></g></g>
              <g transform={'translate('+svgPoint(xy(board.target))+')'} className={'lw-target'+(light.outcome==='solved'?' is-lit':'')}><circle className="lw-target-halo" r="25"/><circle r="17"/><circle className="lw-target-core" r="7"/>{won&&<path d="m-6 0 4 4 8-9"/>}</g>
            </svg>
            <div className="lw-hit-grid">{cells.map(cell=>{
              const mirror=board.mirrors.find(m=>m.cell===cell);
              const piece=mirror?t('mirror')+' '+mirror.tilt:board.walls.includes(cell)?t('wall'):cell===board.source.cell?t('source'):cell===board.target?t('target'):t('empty');
              return <button key={cell} data-cell={cell} className={mirror?'has-mirror':''} aria-label={t('cellLabel',{cell,piece})} disabled={busy||(!editing&&(!mirror||won))} onClick={()=>void perform(c=>editing?paintCell(cell,brush,direction,c):rotateMirror(cell,c))}/>;
            })}</div>
          </div>
          <div className={'lw-status'+(won?' is-won':'')} role="status">{won?<Check size={18}/>:<span className="lw-status-dot"/>}<span>{status}</span>{won&&localIndex>=0&&localIndex<5&&<button onClick={()=>void perform(c=>loadLevel(levels[localIndex+1],c))} disabled={busy}>{t('next')}<ArrowRight size={16}/></button>}</div>
          <div className="lw-board-footer"><p>{t(editing?'editHelp':'playHelp')}</p>{!editing&&<div><button className="lw-icon-button" disabled={busy||!game.history.length} aria-label={t('undo')} title={t('undo')} onClick={()=>void perform(undoMove)}><Undo2 size={18}/></button><button className="lw-icon-button" disabled={busy} aria-label={t('reset')} title={t('reset')} onClick={()=>void perform(reset)}><RotateCcw size={18}/></button></div>}</div>
        </section>
        {!editing&&<div className="lw-underboard"><span>{t('optimal',{count:initialCheck.minimumMoves || 0})}</span><button className="lw-text-button" disabled={busy} onClick={()=>void perform(c=>startEditor(false,c))}><Pencil size={14}/>{t('editCurrent')}</button><button className="lw-text-button" disabled={busy||stored.isLoading||!!stored.error} onClick={()=>void perform(async c=>{await saveLevel(c);setNotice(t('savedNotice'));})}><Save size={14}/>{t('save')}</button></div>}
        <div className="lw-legend"><span><i className="source"/>{t('source')}</span><span><i className="mirror"/>{t('mirror')}</span><span><i className="target"/>{t('target')}</span></div>
      </section>
      {editing&&<aside className="lw-sidebar">
        <section className="lw-panel lw-editor"><div className="lw-panel-heading"><Pencil size={18}/><h2>{t('edit')}</h2></div>
          <input className="lw-input" maxLength={60} value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} aria-label={t('levelTitle')} placeholder={t('levelTitle')}/>
          <div className="lw-brushes">{(['mirror','wall','source','target','erase'] as Brush[]).map(b=><button key={b} aria-pressed={brush===b} onClick={()=>setBrush(b)}><span>{b==='mirror'?'╱':b==='wall'?'▧':b==='source'?'➜':b==='target'?'◎':<Eraser size={18}/>}</span>{t(b)}</button>)}</div>
          {brush==='source'&&<div className="lw-directions">{directions.map(d=><button key={d} aria-pressed={direction===d} aria-label={t(d)} onClick={()=>setDirection(d)}><ArrowRight size={17} style={{transform:'rotate('+(directions.indexOf(d)*90)+'deg)'}}/></button>)}</div>}
          <button className="lw-primary" disabled={busy} onClick={()=>void perform(c=>launchDraft(c,draftTitle))}><Check size={16}/>{t('launch')}</button>
          <button className="lw-secondary" disabled={busy||stored.isLoading||!!stored.error} onClick={()=>void perform(async c=>{await saveLevel(c,draftTitle);setNotice(t('savedNotice'));})}><Save size={16}/>{t('save')}</button>
          <button className="lw-text-button lw-centered" disabled={busy} onClick={()=>void perform(cancelEditor)}>{t('cancel')}</button>
        </section>
      </aside>}
    </div>
  </main>;
}
