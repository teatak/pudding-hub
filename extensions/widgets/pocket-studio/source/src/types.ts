export type TrackConfig = {
  trackKey: string;
  instId: string;
  volume?: number;
  muted?: boolean;
  reverb?: number; // 混响发送量 (0 ~ 1)
};

export type ExtraNote = {
  step: number;     // 步进索引 (0 ~ 15)
  pitch: number;    // 音高频率 Hz (20 ~ 10000)
  duration: number; // 持续步数 (1 ~ 32)
};

export type BarData = {
  steps: Record<string, boolean[]>;
  pitches?: Record<string, (number | null)[]>;
  durations?: Record<string, (number | null)[]>; // 音符持续步数 (默认 1，可放长为 2, 3, 4...)
  extraNotes?: Record<string, ExtraNote[]>;      // 同一步进叠加的多音高音块 (和弦/同位置多音块)
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

export type EditOptions = { dryRun?: boolean; expectedStorageVersion?: number };

export type ReadOptions = { includePatterns?: boolean; barIndices?: number[]; trackKeys?: string[] };

export type EditAction =
  | { action: "setStep"; barIndex: number; trackKey: string; stepIndex: number; enabled: boolean; pitch?: number; duration?: number }
  | { action: "toggleStep"; barIndex: number; trackKey: string; stepIndex: number; pitch?: number; duration?: number }
  | { action: "togglePitchStep"; barIndex: number; trackKey: string; stepIndex: number; pitch: number; duration?: number }
  | { action: "setPitchNoteDuration"; barIndex: number; trackKey: string; stepIndex: number; pitch: number; duration: number }
  | { action: "changePitchNote"; barIndex: number; trackKey: string; stepIndex: number; fromPitch: number; toPitch: number }
  | { action: "setNotePitch"; barIndex: number; trackKey: string; stepIndex: number; pitch: number }
  | { action: "setNoteDuration"; barIndex: number; trackKey: string; stepIndex: number; duration: number }
  | { action: "setTrackPattern"; barIndex: number; trackKey: string; steps: boolean[]; pitches?: (number | null)[]; durations?: (number | null)[] }
  | { action: "setBpm"; bpm: number }
  | { action: "changeInstrument"; trackKey: string; instId: string }
  | { action: "addTrack"; instId: string }
  | { action: "removeTrack"; trackKey: string }
  | { action: "clearTrack"; trackKey: string }
  | { action: "toggleMuteTrack"; trackKey: string }
  | { action: "setTrackMute"; trackKey: string; muted: boolean }
  | { action: "setTrackReverb"; trackKey: string; reverb: number }
  | { action: "addBar"; copyFrom?: number }
  | { action: "removeBar"; barIndex?: number }
  | { action: "copyBar"; fromBar: number; toBar: number }
  | { action: "clearBar"; barIndex: number }
  | { action: "clearSong"; barsCount?: number }
  | { action: "loadPreset"; presetName: "mario" | "donkeyKong" | "oriental" | "lofi" };
