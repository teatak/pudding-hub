import { type SongState } from "./types";

// 标准音高频率定义表 (Hz)
export const NOTES = {
  // 低音区
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Gs3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  // 中音区
  C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  // 高音区
  C5: 523.25, Cs5: 554.37, D5: 587.33, Ds5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Gs5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77
};

function emptySong(bpm: number, trackKeys: { trackKey: string; instId: string }[]): SongState {
  const bars = [0, 1, 2, 3].map(() => {
    const steps: Record<string, boolean[]> = {};
    const pitches: Record<string, (number | null)[]> = {};
    const durations: Record<string, (number | null)[]> = {};
    trackKeys.forEach((t) => {
      steps[t.trackKey] = new Array(16).fill(false);
      pitches[t.trackKey] = new Array(16).fill(null);
      durations[t.trackKey] = new Array(16).fill(null);
    });
    return { steps, pitches, durations };
  });

  return {
    bpm,
    tracks: trackKeys,
    bars
  };
}

// -------------------------------------------------------------
// 1. 超级马里奥 (Super Mario Bros) 经典主题曲 4 小节完整谱面
// -------------------------------------------------------------
export function createMarioSong(): SongState {
  const tracks = [
    { trackKey: "t_lead", instId: "marioLead" },
    { trackKey: "t_bass", instId: "marioBass" },
    { trackKey: "t_kick", instId: "kick" },
    { trackKey: "t_snare", instId: "snare" },
    { trackKey: "t_hat", instId: "hat" }
  ];

  const song = emptySong(128, tracks);
  const setNote = (bar: number, track: string, step: number, freq: number | null, duration = 1) => {
    song.bars[bar].steps[track][step] = true;
    if (song.bars[bar].pitches) {
      song.bars[bar].pitches![track][step] = freq;
    }
    if (song.bars[bar].durations) {
      song.bars[bar].durations![track][step] = duration;
    }
  };

  // 小节 1: 开头三连音前奏 (E5 E5 _ E5 _ C5 E5 _ G5 ___ G4 ___)
  setNote(0, "t_lead", 0, NOTES.E5, 1);
  setNote(0, "t_lead", 1, NOTES.E5, 1);
  setNote(0, "t_lead", 3, NOTES.E5, 1);
  setNote(0, "t_lead", 5, NOTES.C5, 1);
  setNote(0, "t_lead", 6, NOTES.E5, 1);
  setNote(0, "t_lead", 8, NOTES.G5, 3);
  setNote(0, "t_lead", 12, NOTES.G4, 4);

  setNote(0, "t_bass", 0, NOTES.D3, 1);
  setNote(0, "t_bass", 1, NOTES.D3, 1);
  setNote(0, "t_bass", 3, NOTES.D3, 1);
  setNote(0, "t_bass", 5, NOTES.D3, 1);
  setNote(0, "t_bass", 6, NOTES.D3, 1);
  setNote(0, "t_bass", 8, NOTES.G3, 3);
  setNote(0, "t_bass", 12, NOTES.G3, 4);

  setNote(0, "t_kick", 0, null);
  setNote(0, "t_kick", 8, null);
  setNote(0, "t_snare", 4, null);
  setNote(0, "t_snare", 12, null);

  // 小节 2: 主歌 A 段 (C5 __ G4 __ E4 __ A4 _ B4 _ Bb4 A4 _)
  setNote(1, "t_lead", 0, NOTES.C5);
  setNote(1, "t_lead", 3, NOTES.G4);
  setNote(1, "t_lead", 6, NOTES.E4);
  setNote(1, "t_lead", 9, NOTES.A4);
  setNote(1, "t_lead", 11, NOTES.B4);
  setNote(1, "t_lead", 13, NOTES.Bb4);
  setNote(1, "t_lead", 14, NOTES.A4);

  setNote(1, "t_bass", 0, NOTES.G3);
  setNote(1, "t_bass", 4, NOTES.E3);
  setNote(1, "t_bass", 8, NOTES.C3);
  setNote(1, "t_bass", 12, NOTES.F3);

  for (let i = 0; i < 16; i += 2) setNote(1, "t_hat", i, null);
  setNote(1, "t_kick", 0, null);
  setNote(1, "t_kick", 8, null);
  setNote(1, "t_snare", 4, null);
  setNote(1, "t_snare", 12, null);

  // 小节 3: 跃动 B 段 (G4 E5 G5 A5 _ F5 G5 _ E5 _ C5 D5 B4 __)
  setNote(2, "t_lead", 0, NOTES.G4);
  setNote(2, "t_lead", 2, NOTES.E5);
  setNote(2, "t_lead", 4, NOTES.G5);
  setNote(2, "t_lead", 6, NOTES.A5);
  setNote(2, "t_lead", 9, NOTES.F5);
  setNote(2, "t_lead", 11, NOTES.G5);
  setNote(2, "t_lead", 13, NOTES.E5);
  setNote(2, "t_lead", 15, NOTES.C5);

  setNote(2, "t_bass", 0, NOTES.C3);
  setNote(2, "t_bass", 4, NOTES.G3);
  setNote(2, "t_bass", 8, NOTES.C3);
  setNote(2, "t_bass", 12, NOTES.G3);

  for (let i = 0; i < 16; i += 2) setNote(2, "t_hat", i, null);
  setNote(2, "t_kick", 0, null);
  setNote(2, "t_kick", 6, null);
  setNote(2, "t_kick", 10, null);
  setNote(2, "t_snare", 4, null);
  setNote(2, "t_snare", 12, null);

  // 小节 4: 尾音过门 (_ D5 _ B4 ___ G4 _ G4 _ G4 _ G4 __)
  setNote(3, "t_lead", 1, NOTES.D5);
  setNote(3, "t_lead", 3, NOTES.B4);
  setNote(3, "t_lead", 6, NOTES.G4);
  setNote(3, "t_lead", 8, NOTES.G4);
  setNote(3, "t_lead", 10, NOTES.G4);
  setNote(3, "t_lead", 12, NOTES.G4);

  setNote(3, "t_bass", 0, NOTES.G3);
  setNote(3, "t_bass", 4, NOTES.G3);
  setNote(3, "t_bass", 8, NOTES.C3);
  setNote(3, "t_bass", 12, NOTES.C3);

  setNote(3, "t_kick", 0, null);
  setNote(3, "t_kick", 4, null);
  setNote(3, "t_kick", 8, null);
  setNote(3, "t_snare", 12, null);
  setNote(3, "t_snare", 13, null);
  setNote(3, "t_snare", 14, null);
  setNote(3, "t_snare", 15, null);

  return song;
}

// -------------------------------------------------------------
// 2. 大金刚 (Donkey Kong Arcade 1981) 经典钢架攀爬 4 小节完整谱面
// -------------------------------------------------------------
export function createDonkeyKongSong(): SongState {
  const tracks = [
    { trackKey: "t_kong", instId: "kongLead" },
    { trackKey: "t_bass", instId: "marioBass" },
    { trackKey: "t_kick", instId: "kick" },
    { trackKey: "t_snare", instId: "snare" },
    { trackKey: "t_hat", instId: "hat" }
  ];

  const song = emptySong(136, tracks);
  const setNote = (bar: number, track: string, step: number, freq: number | null) => {
    song.bars[bar].steps[track][step] = true;
    if (song.bars[bar].pitches) {
      song.bars[bar].pitches![track][step] = freq;
    }
  };

  // 小节 1: 经典沉重金刚踏步与攀爬 (F3 - G#3 - C4 - B3)
  setNote(0, "t_kong", 0, NOTES.F3);
  setNote(0, "t_kong", 3, NOTES.Gs3);
  setNote(0, "t_kong", 6, NOTES.C4);
  setNote(0, "t_kong", 9, NOTES.B3);
  setNote(0, "t_kong", 12, NOTES.F3);
  setNote(0, "t_kong", 14, NOTES.Gs3);

  setNote(0, "t_bass", 0, NOTES.F3);
  setNote(0, "t_bass", 6, NOTES.C3);
  setNote(0, "t_bass", 12, NOTES.F3);

  setNote(0, "t_kick", 0, null);
  setNote(0, "t_kick", 6, null);
  setNote(0, "t_kick", 12, null);
  setNote(0, "t_snare", 4, null);
  setNote(0, "t_snare", 10, null);

  // 小节 2: 滚桶下落的紧张律动 (F3 - G#3 - C4 - B3 伴随踩镲高频)
  setNote(1, "t_kong", 0, NOTES.F3);
  setNote(1, "t_kong", 3, NOTES.Gs3);
  setNote(1, "t_kong", 6, NOTES.C4);
  setNote(1, "t_kong", 9, NOTES.B3);
  setNote(1, "t_kong", 12, NOTES.C4);
  setNote(1, "t_kong", 14, NOTES.B3);

  setNote(1, "t_bass", 0, NOTES.F3);
  setNote(1, "t_bass", 4, NOTES.Gs3);
  setNote(1, "t_bass", 8, NOTES.C3);
  setNote(1, "t_bass", 12, NOTES.B3);

  for (let i = 0; i < 16; i += 2) setNote(1, "t_hat", i, null);
  setNote(1, "t_kick", 0, null);
  setNote(1, "t_kick", 8, null);
  setNote(1, "t_snare", 4, null);
  setNote(1, "t_snare", 12, null);

  // 小节 3: 升调攀爬 (G3 - Bb3 - D4 - C#4) 危险临近
  setNote(2, "t_kong", 0, NOTES.G3);
  setNote(2, "t_kong", 3, NOTES.Bb3);
  setNote(2, "t_kong", 6, NOTES.D4);
  setNote(2, "t_kong", 9, NOTES.Cs4);
  setNote(2, "t_kong", 12, NOTES.G3);
  setNote(2, "t_kong", 14, NOTES.Bb3);

  setNote(2, "t_bass", 0, NOTES.G3);
  setNote(2, "t_bass", 6, NOTES.D3);
  setNote(2, "t_bass", 12, NOTES.G3);

  for (let i = 0; i < 16; i += 2) setNote(2, "t_hat", i, null);
  setNote(2, "t_kick", 0, null);
  setNote(2, "t_kick", 6, null);
  setNote(2, "t_kick", 12, null);
  setNote(2, "t_snare", 4, null);
  setNote(2, "t_snare", 10, null);

  // 小节 4: 经典半音下行收尾过门 (C4 - B3 - Bb3 - A3 - G#3 - G3 - F#3 - F3)
  setNote(3, "t_kong", 0, NOTES.C4);
  setNote(3, "t_kong", 2, NOTES.B3);
  setNote(3, "t_kong", 4, NOTES.Bb3);
  setNote(3, "t_kong", 6, NOTES.A3);
  setNote(3, "t_kong", 8, NOTES.Gs3);
  setNote(3, "t_kong", 10, NOTES.G3);
  setNote(3, "t_kong", 12, NOTES.Fs3);
  setNote(3, "t_kong", 14, NOTES.F3);

  setNote(3, "t_bass", 0, NOTES.C3);
  setNote(3, "t_bass", 4, NOTES.A3);
  setNote(3, "t_bass", 8, NOTES.F3);
  setNote(3, "t_bass", 12, NOTES.F3);

  setNote(3, "t_kick", 0, null);
  setNote(3, "t_kick", 4, null);
  setNote(3, "t_kick", 8, null);
  setNote(3, "t_snare", 12, null);
  setNote(3, "t_snare", 13, null);
  setNote(3, "t_snare", 14, null);
  setNote(3, "t_snare", 15, null);

  return song;
}

// -------------------------------------------------------------
// 3. 国风五声音阶 (Oriental Pentatonic)
// -------------------------------------------------------------
export function createOrientalSong(): SongState {
  const tracks = [
    { trackKey: "t1", instId: "lead" },
    { trackKey: "t2", instId: "bass" },
    { trackKey: "t3", instId: "kick" },
    { trackKey: "t4", instId: "snare" },
    { trackKey: "t5", instId: "hat" }
  ];

  const song = emptySong(96, tracks);
  const setNote = (bar: number, track: string, step: number) => {
    song.bars[bar].steps[track][step] = true;
  };

  // Bar 0: 铺垫
  setNote(0, "t1", 0); setNote(0, "t1", 4); setNote(0, "t1", 8); setNote(0, "t1", 14);
  setNote(0, "t3", 0); setNote(0, "t3", 8);
  setNote(0, "t5", 2); setNote(0, "t5", 6); setNote(0, "t5", 10); setNote(0, "t5", 14);

  // Bar 1: 渐入
  setNote(1, "t1", 2); setNote(1, "t1", 6); setNote(1, "t1", 10);
  setNote(1, "t2", 0); setNote(1, "t2", 8);
  setNote(1, "t3", 0); setNote(1, "t3", 8);
  setNote(1, "t4", 4); setNote(1, "t4", 12);
  for (let i = 0; i < 16; i += 2) setNote(1, "t5", i);

  // Bar 2: 高潮
  setNote(2, "t1", 0); setNote(2, "t1", 3); setNote(2, "t1", 7); setNote(2, "t1", 10); setNote(2, "t1", 14);
  setNote(2, "t2", 0); setNote(2, "t2", 4); setNote(2, "t2", 8); setNote(2, "t2", 12);
  setNote(2, "t3", 0); setNote(2, "t3", 6); setNote(2, "t3", 8); setNote(2, "t3", 10);
  setNote(2, "t4", 4); setNote(2, "t4", 12);
  for (let i = 0; i < 16; i += 2) setNote(2, "t5", i);

  // Bar 3: 尾奏
  setNote(3, "t1", 4); setNote(3, "t1", 12);
  setNote(3, "t2", 0); setNote(3, "t2", 6);
  setNote(3, "t3", 0); setNote(3, "t3", 4); setNote(3, "t3", 8);
  setNote(3, "t4", 12); setNote(3, "t4", 14); setNote(3, "t4", 15);

  return song;
}

// -------------------------------------------------------------
// 4. Lo-Fi 慢摇 (Chill Lo-Fi)
// -------------------------------------------------------------
export function createLofiSong(): SongState {
  const tracks = [
    { trackKey: "t_epiano", instId: "epiano" },
    { trackKey: "t_bass", instId: "bass" },
    { trackKey: "t_kick", instId: "kick" },
    { trackKey: "t_snare", instId: "snare" },
    { trackKey: "t_hat", instId: "hat" }
  ];

  const song = emptySong(85, tracks);
  const setNote = (bar: number, track: string, step: number) => {
    song.bars[bar].steps[track][step] = true;
  };

  for (let b = 0; b < 4; b++) {
    setNote(b, "t_kick", 0);
    setNote(b, "t_kick", 6);
    setNote(b, "t_snare", 4);
    setNote(b, "t_snare", 12);
    setNote(b, "t_hat", 2);
    setNote(b, "t_hat", 6);
    setNote(b, "t_hat", 10);
    setNote(b, "t_hat", 14);
    setNote(b, "t_bass", 0);
    setNote(b, "t_bass", 8);
    setNote(b, "t_epiano", 0);
    setNote(b, "t_epiano", 6);
    setNote(b, "t_epiano", 10);
  }

  return song;
}
