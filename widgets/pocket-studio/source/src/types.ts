export type TrackConfig = {
  trackKey: string;
  instId: string;
  volume?: number;
};

export type BarData = {
  steps: Record<string, boolean[]>;
  pitches?: Record<string, (number | null)[]>;
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
  | { action: "toggleStep"; barIndex: number; trackKey: string; stepIndex: number; pitch?: number }
  | { action: "setBpm"; bpm: number }
  | { action: "changeInstrument"; trackKey: string; instId: string }
  | { action: "addTrack"; instId: string }
  | { action: "removeTrack"; trackKey: string }
  | { action: "copyBar"; fromBar: number; toBar: number }
  | { action: "clearBar"; barIndex: number }
  | { action: "loadPreset"; presetName: "mario" | "donkeyKong" | "oriental" | "lofi" };
