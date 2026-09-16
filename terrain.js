// The map terrain the Build orders and Replays tabs draw under their placements: a map's raster
// (data/maps/<file>.json, mapinfo's `ras`: height + water / cliff flags, gzip in base64) and the
// image of it by theme, palette and tint. window.ZH_TERRAIN(Z) -> { raster, terrainImage, ... }.
// Moved out of buildorders.html on 2026-09-15 for the Replays tab.
window.ZH_TERRAIN = function (Z) {
  const RASTER = new Map();   // crc -> promise of the decoded terrain
  const DATA_DIR = window.ZH_DATA_BASE || 'data/';   // the terrain and raid files sit with the data (config.js)
  const RASTER_FILE = new Map();   // data/maps/<file>.json -> promise of its JSON: a map's own record, or a tail shard's {maps: {crc: record}}
  const MAP_BY_CRC = new Map(Z.MAPS.map(m => [m.crc, m]));
  const inflate = async b64 => {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  };
  // mapinfo's `ras` names the file under data/maps/ that holds the map's raster (the most played maps
  // have their own, the long tail shares shards of ~3 MB); no `ras`, no map file - the tile says so
  function raster(crc) {
    if (!RASTER.has(crc)) RASTER.set(crc, (async () => {
      const m = MAP_BY_CRC.get(crc), f = m && m.info.ras;
      if (!f) return null;
      if (!RASTER_FILE.has(f)) RASTER_FILE.set(f, fetch(DATA_DIR + 'maps/' + f + '.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));
      const file = await RASTER_FILE.get(f), j = file.maps ? file.maps[crc] : file;
      const [hgt, flg] = await Promise.all([inflate(j.hgt), inflate(j.flg)]);
      return { w: j.w, h: j.h, hr: j.hr, starts: j.starts || [], hgt, flg, img: null, theme: '' };
    })().catch(() => null));
    return RASTER.get(crc);
  }
  const isLight = () => document.documentElement.dataset.theme === 'light';
  // the terrain as an image the size of the grid, by the Terrain choice: relief = grey by height, water blue, cliffs a
  // step darker (light) or lighter (dark); flat = one ground tone, cliffs a clear step off it; bold = the ground
  // near the page's, the cliffs in ink and the water saturated. Row 0 = the top = y max
  const RAMP = {   // the tints' height ramps, low -> high, per theme
    light: { grey: [[150, 152, 148], [238, 238, 234]], desert: [[156, 124, 72], [238, 218, 168]], snow: [[132, 142, 158], [242, 246, 252]], jungle: [[62, 98, 54], [168, 202, 126]], ash: [[40, 34, 36], [124, 110, 106]] },
    dark: { grey: [[36, 38, 42], [146, 148, 146]], desert: [[96, 76, 42], [204, 180, 130]], snow: [[96, 104, 118], [214, 222, 234]], jungle: [[34, 60, 32], [136, 170, 100]], ash: [[14, 12, 14], [88, 76, 74]] } };
  const WATER = { light: [126, 166, 214], dark: [30, 62, 116] }, WATER_BOLD = { light: [56, 108, 190], dark: [44, 96, 176] }, INK = { light: [38, 38, 42], dark: [232, 232, 226] };
  const LAVA = { light: [214, 84, 22], dark: [178, 58, 14] }, LAVA_BOLD = { light: [236, 96, 20], dark: [222, 80, 16] };   // the ash tint's water
  const waterOf = (tint, theme, bold) => tint === 'ash' ? (bold ? LAVA_BOLD : LAVA)[theme] : (bold ? WATER_BOLD : WATER)[theme];
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function terrainLook(theme, pal, tint) {   // -> { lo, hi, water, cliff } (cliff null = the relief's grey stepped off)
    const [lo, hi] = RAMP[theme][tint], light = theme === 'light';
    if (pal === 'flat') { const g = lerp(lo, hi, .6); return { lo: g, hi: g, water: waterOf(tint, theme, false), cliff: light ? g.map(v => v * .6) : g.map(v => v * .55 + 64) }; }
    if (pal === 'bold') return light ? { lo: lerp(lerp(lo, hi, .7), [255, 255, 255], .5), hi: lerp(hi, [255, 255, 255], .6), water: waterOf(tint, 'light', true), cliff: INK.light }
      : { lo: lerp(lo, [0, 0, 0], .3), hi: lerp(lerp(lo, hi, .4), [0, 0, 0], .2), water: waterOf(tint, 'dark', true), cliff: INK.dark };
    return { lo, hi, water: waterOf(tint, theme, false), cliff: null };
  }
  function terrainImage(R, pal, tint) {
    const theme = isLight() ? 'light' : 'dark', look = theme + '|' + pal + '|' + tint;
    if (R.img && R.theme === look) return R.img;
    const { lo, hi, water, cliff } = terrainLook(theme, pal, tint);
    const cv = document.createElement('canvas'); cv.width = R.w; cv.height = R.h;
    const cx = cv.getContext('2d'), img = cx.createImageData(R.w, R.h), d = img.data, span = Math.max(1, R.hr[1] - R.hr[0]);
    for (let j = 0; j < R.h; j++) {
      const src = j * R.w, dst = (R.h - 1 - j) * R.w;
      for (let i = 0; i < R.w; i++) {
        const t = (R.hgt[src + i] - R.hr[0]) / span, f = R.flg[src + i];
        let r = lo[0] + (hi[0] - lo[0]) * t, g = lo[1] + (hi[1] - lo[1]) * t, b = lo[2] + (hi[2] - lo[2]) * t;
        if (f & 1) { r = water[0]; g = water[1]; b = water[2]; }
        if (f & 2) { if (cliff) { r = cliff[0]; g = cliff[1]; b = cliff[2]; } else if (theme === 'light') { r *= .7; g *= .71; b *= .74; } else { r = r * .55 + 58; g = g * .55 + 58; b = b * .55 + 64; } }   // a cliff: its own tone, or the relief's grey stepped off it - the heat keeps every hue
        const p = (dst + i) * 4; d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0); R.img = cv; R.theme = look;
    return cv;
  }
  return { RASTER, DATA_DIR, MAP_BY_CRC, inflate, raster, isLight, RAMP, WATER, INK, waterOf, lerp, terrainLook, terrainImage };
};
