export type TrackConfig = {
  trackKey: string;
  instId: string;
  volume?: number;
};

export type BarData = {
  steps: Record<string, boolean[]>;
  pitches?: Record<string, (number | null)[]>;
  durations?: Record<string, (number | null)[]>; // 音符持续步数 (默认 1，可放长为 2, 3, 4...)
};

export type SongState = {
  bpm: number;
  tracks: TrackConfig[];
  bars: BarData[];
};

export type Instrument = {
  id: string;
  name: string;
  category: "Drums" | "Bass" | "Melodic";
  colorClass: string;
  desc: string;
  iconType: "kick" | "snare" | "hat" | "bass" | "lead" | "mario" | "kong" | "synth";
};

export type EditAction =
  | { action: "toggleStep"; barIndex: number; trackKey: string; stepIndex: number; pitch?: number; duration?: number }
  | { action: "setNotePitch"; barIndex: number; trackKey: string; stepIndex: number; pitch: number }
  | { action: "setNoteDuration"; barIndex: number; trackKey: string; stepIndex: number; duration: number }
  | { action: "setTrackPattern"; barIndex: number; trackKey: string; steps: boolean[]; pitches?: (number | null)[]; durations?: (number | null)[] }
  | { action: "setBpm"; bpm: number }
  | { action: "changeInstrument"; trackKey: string; instId: string }
  | { action: "addTrack"; instId: string }
  | { action: "removeTrack"; trackKey: string }
  | { action: "addBar"; copyFrom?: number }
  | { action: "removeBar"; barIndex?: number }
  | { action: "copyBar"; fromBar: number; toBar: number }
  | { action: "clearBar"; barIndex: number }
  | { action: "clearSong"; barsCount?: number }
  | { action: "loadPreset"; presetName: "mario" | "donkeyKong" | "oriental" | "lofi" };
