// the described build of a seat - the Build orders tab's description (builders, supplies, gatherers, the
// opening group, the chain of later structures / expansions / plays, the army's mix) - shared with the Win rates
// tab's Win Rate by Build Order card (2026-09-16). The page passes its clocks and parts in; the items and the
// plays' naming come from plays.js (PL), so a Naming switch there renames the chips here too
window.ZH_BUILDS = function (Z, PL) {
  const { D } = Z;
  const { itemOfT, counted, plurals, rawName, movesOf, moveName, moveKey, moveHow } = PL;
  const KINDS = D.bo_kinds || [], K = Object.fromEntries(KINDS.map((k, i) => [k, i]));
  const GATHERER = { USA: ['chinook', 'chinooks'], China: ['truck', 'trucks'], GLA: ['worker', 'workers'] };
  const BUILDER = { USA: ['dozer', 'dozers'], China: ['dozer', 'dozers'], GLA: ['worker', 'workers'] };
  // the builders of the opening: the starting dozer / worker plus every one out of the Command Center before it was
  // sold - or, when it was kept, before BUILDER_CUT, the clock most sales are done by (95% of the library's sales by
  // 0:56, the median at 0:37). Not the card's clock: a 3-dozer build is one at 1:00 too (the user, 2026-09-15:
  // "2 dozer builds and 3 dozer builds are very different")
  const BUILDER_CUT = 60, BUILDER_MAX = 10;
  const PARTS = [['bld', 'Builders', '--p-bld'], ['sup', 'Supplies', '--p-sup'], ['gat', 'Gatherers', '--p-gat'], ['prod', 'Buildings', '--p-prod'], ['move', 'Plays', '--p-move'], ['units', 'Unit Mix', '--p-none']];   // Units = the state chip, the mix it had made (a part of its own - the user, 2026-09-14)
  const PART_NAME = Object.fromEntries(PARTS.map(([k, l]) => [k, l]));
  const HUMVEES = { key: 'humvees', n: 'Humvees' }, HUMVEES_MD = { key: 'humvees-md', n: 'Humvees (MDs)' };
  const INF_WEIGHT = .5;   // infantry counts at half its cost in the mix: it is always there in numbers (the user, 2026-09-14), so it takes twice the spend to be a main kind
  const SPAWNED = new Set(['Pilot', 'Spectre Gunship1']);   // out of a wreck or a power, not production: never a build
  const ARMY_CLS = new Set(['infantry', 'vehicle', 'aircraft']), MIX_SHARE = .75, MIX_MAX = 3;   // the Units chip: the kinds that make three quarters of the army's cost, up to three
  const TUNNEL = { key: 'tunnel', n: 'Tunnel', raw: 'GLATunnelNetwork', c: 'var(--p-prod)', kind: 'tunnel' };
  const fwdItem = it => { const key = 'f:' + it.key; let f = PL.ITEM.get(key); if (!f) { f = { ...it, key, n: 'Forward ' + it.n, fwd: true }; PL.ITEM.set(key, f); } return f; };
  // a seat: its described build (by the card's clocks), its structure sequence inside the window, the raw runs
  // an opening group's key -> its wording (a few hundred distinct over 74k seats) lives on the naming's cache (o.openN)
  function describe(p, g, o) {   // o: {by, fwd, openN}
    const pz = p.pz || [], by = o.by, fwdAt = o.fwd, cash = g && g.c != null ? g.c : 10000;
    let sup = 0, supAll = 0, tun = 0, second = null, prodT = null;
    const prod = new Map(), placed = [], supT = [];   // template key -> {it, n, t (first)}; every production placement; the supply clocks
    // the cash rule (the user, 2026-09-13): a structure is bought with the starting cash while the sticker prices
    // of everything placed so far, itself included, sum to no more than it (the CC and captures cost nothing; the
    // dataset has no money series, so dozers and gatherers bought are not counted - the sum understates spending)
    const idx = []; for (let j = 0; j < pz.length; j += 4) if (pz[j + 3] !== K.cc && pz[j + 3] !== K.captured) idx.push(j);
    idx.sort((a, b) => pz[a + 1] - pz[b + 1]);
    const startCash = new Set(); let spent = 0;
    for (const j of idx) { spent += D.templates[pz[j]].cost || 0; if (spent <= cash) startCash.add(j); }
    for (let j = 0; j < pz.length; j += 4) {
      const t = pz[j + 1], along = pz[j + 2], kind = pz[j + 3];
      if (t > by) continue;
      // a structure past the forward line is a step of its own kind, "Forward Barracks", in the sequence with
      // the rest (the user, 2026-09-14: not a part of its own); a forward tunnel too, apart from the tunnel count
      const forward = along >= fwdAt && (kind === K.production || kind === K.tunnel || kind === K.defense);
      if (kind === K.supply) { supAll++; supT.push([t, startCash.has(j)]); }
      else if (kind === K.production || kind === K.defense) {   // defences sit in the sequence with production (the user, 2026-09-14: a Fire Base or 2 EMPs early is the build)
        const it = itemOfT(pz[j]);
        if (kind === K.production) {
          let r = prod.get(it.key);
          if (!r) { r = { it, n: 0, t }; prod.set(it.key, r); }
          r.n++; if (t < r.t) r.t = t;
          if (prodT === null || t < prodT) prodT = t;
        }
        placed.push({ it: forward ? fwdItem(it) : it, t, def: kind === K.defense, open: !forward && kind === K.production && startCash.has(j) });   // a defence is never in the opening group: its own chip after it (the user, 2026-09-14); nor is a forward structure
      }
      else if (kind === K.tunnel) { if (forward) placed.push({ it: fwdItem(TUNNEL), t, def: false, open: false }); else tun++; }
    }
    // the supplies of the OPENING are the ones placed before any play left; a later one is an EXPANSION - its own
    // step in the chain, in time order with the later structures and the plays (the user, 2026-09-14: "3 supplies"
    // was also the player who did a normal two, harassed, and then expanded to a third - "that should be captured
    // later in the chain depending on its timing and how it compares to the raid"). Not the cash rule: a third
    // stash at 2:15 behind four tunnels is past the starting cash on paper and is still a 3-stash build. The first
    // play's clock is whatever the plays clock: the cut is the build's, not the card's
    supT.sort((a, b) => a[0] - b[0]);
    const mv0 = movesOf(p), raidT = mv0.length ? mv0[0].t : Infinity, exp = [];
    for (const [t] of supT) { if (t < raidT) { sup++; if (sup === 2) second = t; } else exp.push({ k: sup + exp.length + 1, t }); }
    const gt = p.gt, gi = Math.min(gt ? gt.length - 1 : 0, Math.max(0, Math.round(by / 30) - 1)), gat = gt ? gt[gi] : 0;
    // the builders (see BUILDER_CUT): the count, and the clocks of the ones out of the CC that count, in order
    let bld = null, bldT = null;
    if (p.bdt) { const cut = p.cs != null ? p.cs : BUILDER_CUT; bldT = p.bdt.filter(t => t <= cut).sort((a, b) => a - b); bld = (p.bd0 || 0) + bldT.length; }
    const byTime = [...prod.values()].sort((a, b) => a.t - b.t);
    // the description's stages (the user, 2026-09-13): the OPENING is every production building the starting
    // cash bought (the rule above) as an unordered group with counts ("Barracks + War Factory", "2 War Factory");
    // every later building is a step of its own, in placement order, among the expansions and the plays - see
    // walkChain(), which counts a run of the same one ("2 EMP Patriot")
    placed.sort((a, b) => a.t - b.t);
    let open = null; const opening = placed.filter(x => x.open);
    if (opening.length) {
      const c = new Map(); for (const x of opening) c.set(x.it, (c.get(x.it) || 0) + 1);
      const ents = [...c.entries()].sort((a, b) => a[0].n < b[0].n ? -1 : a[0].n > b[0].n ? 1 : 0);
      const key = 'o:' + ents.map(([it, n]) => n + 'x' + it.key).join('+');
      let n = o.openN.get(key); if (n === undefined) o.openN.set(key, n = ents.map(([it, c]) => counted(c, it)).join(' + '));
      open = { key, n, t: opening[opening.length - 1].t };
    }
    const steps = placed.filter(x => !x.open).map(x => ({ it: x.it, t: x.t }));
    const d = { sup, supAll, exp, tun, second, prod: byTime, open, opening, steps, prodT, gat, bld, bldT, move: null, moves: null, state: null };
    return d;
  }
  // the plays part alone (its clock changes without the rest): every play before the clock, in crossing order -
  // "2 supplies, 2 WFs, truck rush, then what?" (the user, 2026-09-13); no cap, the chips carry them
  function describeMoves(p, d, o) {   // o: {move}
    const moves = movesOf(p).filter(m => m.t <= o.move);
    d.moves = moves; d.move = moves[0] || null;
    // then the state - the army's mix by the clock, summarized (the user, 2026-09-14: "a more general summary of
    // the unit mix the player has been going for", where every kind it had made was one build per set): the
    // kinds that make up three quarters of what it spent on army units, largest share first - a fourth needed
    // reads "mixed". Gatherers, builders and the spawned ones (a pilot is not a build) are not army.
    d.state = null;
    if (p.ul) {
      const cost = new Map(), rawOf = new Map(); let total = 0;
      for (let j = 0; j < p.ul.length; j += 2) {
        if (p.ul[j + 1] > o.move) continue;
        const t = D.templates[p.ul[j]]; if (!ARMY_CLS.has(t.cls) || !t.cost) continue;
        const raw = rawName(p.ul[j]); if (SPAWNED.has(raw)) continue;
        const it = itemOfT(p.ul[j]), w = t.cls === 'infantry' ? t.cost * INF_WEIGHT : t.cost;
        cost.set(it, (cost.get(it) || 0) + w); total += w; rawOf.set(it, raw);
      }
      if (total) {
        const ents = [...cost.entries()].sort((a, b) => b[1] - a[1]); let top = [], acc = 0;
        for (const [it, c] of ents) { top.push(it); acc += c; if (acc >= total * MIX_SHARE) break; }
        // the vees: with the MDs among the main kinds they are the loaded ball, one kind
        const vi = top.findIndex(it => rawOf.get(it) === 'Humvee'), mi = top.findIndex(it => rawOf.get(it) === 'Missile Defender');
        if (vi >= 0) { top[vi] = mi >= 0 ? HUMVEES_MD : HUMVEES; if (mi >= 0) top = top.filter((_, i) => i !== mi); }
        d.state = top.length > MIX_MAX ? { key: 'u:mixed', n: 'mixed army' }
          : { key: 'u:' + top.map(it => it.key).join('+'), n: top.map(it => it === HUMVEES || it === HUMVEES_MD ? it.n : plurals(it.n)).join(' + ') };   // plural: a mix is many of each
      }
    }
  }
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  // the chain after the opening: every later structure, supply expansion and play in the order they came, a run
  // of the same one counted ("2 EMP Patriot", "3rd-4th supplies", "Terror Tech x2") - one chip per call of emit,
  // the parts switched off left out (the plays: no chip when nothing crossed - the build reads without it, 2026-09-13)
  const NTH = n => n >= 6 ? '6th+' : n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  function chainEach(d, on, fn) {   // fn('prod', {it, t}) | fn('sup', {k, t}) | fn('move', m) in time order; ties: structure, expansion, play
    const st = on('prod') ? d.steps : [], ex = on('sup') ? d.exp : [], mv = on('move') ? d.moves : [];
    let a = 0, b = 0, c = 0;
    while (a < st.length || b < ex.length || c < mv.length) {
      const ta = a < st.length ? st[a].t : Infinity, tb = b < ex.length ? ex[b].t : Infinity, tc = c < mv.length ? mv[c].t : Infinity;
      if (ta <= tb && ta <= tc) fn('prod', st[a++]); else if (tb <= tc) fn('sup', ex[b++]); else fn('move', mv[c++]);
    }
  }
  function walkChain(d, on, named, emit) {
    let run = null;
    const flush = () => { if (run) emit(run); run = null; };
    chainEach(d, on, (part, x) => {
      if (part === 'prod') {
        if (run && run.it === x.it) { run.k++; run.key = `p:${x.it.key}x${run.k}`; run.n = named ? counted(run.k, x.it) : ''; run.t = x.t; }
        else { flush(); run = { part: 'prod', key: 'p:' + x.it.key, n: named ? x.it.n : '', c: 'var(--p-prod)', t: x.t, it: x.it, k: 1 }; }
      } else if (part === 'sup') {
        const k = Math.min(x.k, 6);
        if (run && run.k0) { run.key = `x${run.k0}-${k}`; run.n = named ? `${NTH(run.k0)}\u2013${NTH(k)} supplies` : ''; run.t = x.t; }
        else { flush(); run = { part: 'sup', key: 'x' + k, n: named ? NTH(k) + ' supply' : '', c: 'var(--p-sup)', t: x.t, k0: k }; }
      } else {
        const name = moveName(x);
        if (run && run.mv && run.n0 === name) { run.k++; run.n = named ? `${name} x${run.k}` : ''; run.key = 'm:' + name + 'x' + run.k; run.t = x.t; }
        else { flush(); run = { part: 'move', key: 'm:' + moveKey(x), n: named ? name : '', n0: name, k: 1, mv: true, c: moveHow(x) === 'play' ? 'var(--p-fwd)' : 'var(--p-move)', t: x.t }; }
      }
    });
    flush();
  }
  // the chips of one seat's description: [{key, n, c, t}] (t = a clock worth a median under the chip); the
  // wording (n) only when `named` - every seat is keyed, only the rows shown are worded
  function chipsOf(d, side, on, named) {
    const out = [];
    if (on('bld') && d.bld != null) { const b = BUILDER[side] || ['builder', 'builders']; out.push({ part: 'bld', key: 'b' + Math.min(d.bld, BUILDER_MAX), n: named ? d.bld >= BUILDER_MAX ? `${BUILDER_MAX}+ ${b[1]}` : plural(d.bld, b[0], b[1]) : '', c: 'var(--p-bld)', t: d.bldT.length ? d.bldT[d.bldT.length - 1] : null }); }
    if (on('sup')) out.push({ part: 'sup', key: 's' + Math.min(d.sup, 4), n: named ? d.sup >= 4 ? '4+ supplies' : plural(d.sup, 'supply', 'supplies') : '', c: 'var(--p-sup)', t: d.second });
    if (on('gat')) { const g = GATHERER[side] || ['gatherer', 'gatherers']; out.push({ part: 'gat', key: 'g' + Math.min(d.gat, 6), n: named ? d.gat >= 6 ? `6+ ${g[1]}` : plural(d.gat, g[0], g[1]) : '', c: 'var(--p-gat)' }); }
    if (on('prod')) {
      if (!d.open && !d.steps.length && !d.tun) out.push({ part: 'prod', key: 'p0', n: 'no production', c: 'var(--p-none)', none: true });
      if (d.open) out.push({ part: 'prod', key: d.open.key, n: named ? d.open.n : '', c: 'var(--p-prod)', t: d.open.t });
    }
    walkChain(d, on, named, r => out.push(r));
    if (on('prod') && d.tun) out.push({ part: 'prod', key: 't' + Math.min(d.tun, 5), n: named ? d.tun >= 5 ? '5+ tunnels' : plural(d.tun, 'tunnel', 'tunnels') : '', c: 'var(--p-prod)' });
    if (on('units') && d.state) out.push({ part: 'units', key: d.state.key, n: named ? d.state.n : '', c: 'var(--p-none)' });   // the army's mix, set apart on the right
    return out;
  }
  // the key of one seat's description alone - the same key chipsOf() would give, without the wording; a render
  // keys every seat (100k, cached on the seat by stamp) and words only the rows it shows, so the two must agree chip by chip
  // ... and the clocks under the chips, one entry per chip (null where the chip has none), returned beside the key (the page keeps them on the seat as s.ckt)
  function chipKey(d, side, on) {   // -> {key, t}
    const t = []; let key = '';
    if (on('bld') && d.bld != null) { key += 'b' + Math.min(d.bld, BUILDER_MAX); t.push(d.bldT.length ? d.bldT[d.bldT.length - 1] : null); }
    if (on('sup')) { key += '|s' + Math.min(d.sup, 4); t.push(d.second); }
    if (on('gat')) { key += '|g' + Math.min(d.gat, 6); t.push(null); }
    if (on('prod')) {
      if (!d.open && !d.steps.length && !d.tun) { key += '|p0'; t.push(null); }
      if (d.open) { key += '|' + d.open.key; t.push(d.open.t); }
    }
    walkChain(d, on, false, r => { key += '|' + r.key; t.push(r.t); });
    if (on('prod') && d.tun) { key += '|t' + Math.min(d.tun, 5); t.push(null); }
    if (on('units') && d.state) { key += '|' + d.state.key; t.push(null); }
    return { key: key.charAt(0) === '|' ? key.slice(1) : key, t };
  }
  // a description packed to what chipKey() reads of it, as a few ints: the fixed chips' values (a key interned to an
  // id) and the chain with every part on, an item as (part, a, b). A page that keys many seats under changing parts
  // keeps the pack on the seat (100 bytes, not the description) and re-keys from it: packKey(pack, on) is the key
  // chipKey(d, side, on) would give, chip by chip, at a fraction of describing the seat again
  const KID = new Map(), KSTR = [], kid = s => { let i = KID.get(s); if (i === undefined) { i = KSTR.length; KID.set(s, i); KSTR.push(s); } return i; };
  const P_PROD = 0, P_SUP = 1, P_MOVE = 2, P_FIX = 7;   // the fixed slots: bld, sup, gat, open, tun, units, no-production
  function pack(d) {
    const items = [];
    chainEach(d, () => true, (part, x) => {
      if (part === 'prod') items.push(P_PROD, kid(x.it.key), 0);
      else if (part === 'sup') items.push(P_SUP, Math.min(x.k, 6), 0);
      else items.push(P_MOVE, kid(moveKey(x)), kid(moveName(x)));
    });
    const a = new Int32Array(P_FIX + items.length);
    a[0] = d.bld == null ? -1 : Math.min(d.bld, BUILDER_MAX); a[1] = Math.min(d.sup, 4); a[2] = Math.min(d.gat, 6);
    a[3] = d.open ? kid(d.open.key) : -1; a[4] = Math.min(d.tun, 5); a[5] = d.state ? kid(d.state.key) : -1;
    a[6] = !d.open && !d.steps.length && !d.tun ? 1 : 0;
    a.set(items, P_FIX);
    return a;
  }
  function packKey(a, on) {
    let key = '';
    if (on('bld') && a[0] >= 0) key += 'b' + a[0];
    if (on('sup')) key += '|s' + a[1];
    if (on('gat')) key += '|g' + a[2];
    if (on('prod')) { if (a[6]) key += '|p0'; if (a[3] >= 0) key += '|' + KSTR[a[3]]; }
    // the chain, a run of the same one counted as walkChain() counts it
    const pr = on('prod'), su = on('sup'), mv = on('move');
    let part = -1, x = 0, y = 0, k = 0, k0 = 0;
    const flush = () => {
      if (part === P_PROD) key += '|p:' + KSTR[x] + (k > 1 ? 'x' + k : '');
      else if (part === P_SUP) key += '|x' + k0 + (k !== k0 ? '-' + k : '');
      else if (part === P_MOVE) key += k > 1 ? '|m:' + KSTR[y] + 'x' + k : '|m:' + KSTR[x];
      part = -1;
    };
    for (let i = P_FIX; i < a.length; i += 3) {
      const q = a[i];
      if (q === P_PROD ? !pr : q === P_SUP ? !su : !mv) continue;
      if (q === P_PROD) { if (part === q && x === a[i + 1]) k++; else { flush(); part = q; x = a[i + 1]; k = 1; } }
      else if (q === P_SUP) { if (part === q) k = a[i + 1]; else { flush(); part = q; k0 = k = a[i + 1]; } }
      else { if (part === q && y === a[i + 2]) k++; else { flush(); part = q; x = a[i + 1]; y = a[i + 2]; k = 1; } }
    }
    flush();
    if (on('prod') && a[4]) key += '|t' + a[4];
    if (on('units') && a[5] >= 0) key += '|' + KSTR[a[5]];
    return key.charAt(0) === '|' ? key.slice(1) : key;
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);   // a chip starts with a capital, whatever it names (the user, 2026-09-14)
  return { GATHERER, BUILDER, BUILDER_CUT, BUILDER_MAX, PARTS, PART_NAME, HUMVEES, HUMVEES_MD, INF_WEIGHT, SPAWNED, ARMY_CLS, MIX_SHARE, MIX_MAX,
    TUNNEL, fwdItem, plural, NTH, cap, describe, describeMoves, chainEach, walkChain, chipsOf, chipKey, pack, packKey };
};
