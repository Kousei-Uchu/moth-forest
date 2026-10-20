/* moth_ecology.js
   Reads a moth's parameter JSON (the builder's export) and writes, in full sentences, the conditions that moth
   would plausibly live in. Deterministic: the same JSON always gives the same text, different moths give
   differently worded text. Everything is inference from shape and colour, so the writing says where it is guessing.

   Browser:  MothEcology.describe(jsonOrObject) -> { headline, sections:[{id,title,text}], facts }
             MothEcology.toText(result)         -> plain-text version
   Rules follow the moth-species-designer references (strategies, baseline, factor-effects). */
(function (root) {
  'use strict';

  /* ---------------- small utilities ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nrm = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const an = s => (/^[aeiou]/i.test(s) ? 'An ' : 'A ') + s;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const pct = v => Math.round(v * 100) + '%';
  const r1 = v => (+v).toFixed(1).replace(/\.0$/, '');            // never print raw floats
  const r0 = v => String(Math.round(+v));
  /* the same coat vocabulary is used by every section so they never contradict each other */
  const coatWord = f => f < .35 ? 'almost bare' : f < .8 ? 'sleek' : f < 1.25 ? 'moderate' : f < 1.65 ? 'thick' : 'woolly';
  function h32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(a) { return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  function stable(o) { return Array.isArray(o) ? '[' + o.map(stable).join(',') + ']' : o && typeof o === 'object' ? '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}' : JSON.stringify(o); }
  /* weighted clause list: keep the strongest few, drop the weak ones */
  const top = (C, n, min) => C.filter(c => c.w >= (min == null ? .25 : min)).sort((a, b) => b.w - a.w).slice(0, n).map(c => c.t);

  /* ---------------- colour naming (hex -> a specific, human description) ---------------- */
  function parseHex(h) { h = String(h || '#888888').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hsl(hex) {
    const [r, g, b] = parseHex(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
    return { h, s, l };
  }
  const HUES = [[12, 'red'], [28, 'vermilion'], [42, 'orange'], [52, 'amber'], [68, 'yellow'], [90, 'lime green'], [150, 'green'], [175, 'teal'], [200, 'cyan'], [245, 'blue'], [275, 'violet'], [300, 'purple'], [330, 'magenta'], [346, 'rose'], [361, 'red']];
  function cname(hex) {
    const { h, s, l } = hsl(hex);
    if (l < .09) return 'near-black';
    if (l > .94 && s < .3) return 'white';
    if (s < .12) return l < .28 ? 'charcoal' : l < .5 ? 'slate grey' : l < .75 ? 'ash grey' : 'pale grey';
    if (h >= 15 && h <= 50 && s < .62 && l < .62) return l < .2 ? 'dark umber' : l < .32 ? 'dark brown' : l < .45 ? (s < .35 ? 'drab brown' : 'chestnut brown') : 'tan';
    if (h >= 30 && h <= 65 && s < .55 && l >= .62) return l > .85 ? 'cream' : l > .75 ? 'buff' : 'sand';
    if (h >= 55 && h <= 95 && l < .55 && s < .5 || h >= 55 && h <= 95 && l < .45) return s < .4 ? 'drab olive' : 'olive green';
    if (h > 95 && h <= 150 && l < .35) return 'moss green';
    let name = HUES.find(x => h < x[0])[1];
    if ((name === 'red' || name === 'rose' || name === 'magenta') && l > .7) return 'pink';
    return (l > .82 ? 'pale ' : l > .68 ? 'soft ' : l < .26 ? 'deep ' : s < .3 ? 'dusty ' : '') + name;
  }
  const isWarm = c => c.s > .6 && (c.h < 52 || c.h > 340) && c.l > .33 && c.l < .85;

  /* ---------------- normalise input ---------------- */
  function normalise(raw) {
    let p = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw));
    if (root.MothLib) { try { p = root.MothLib.constrain(root.MothLib.full(p)); } catch (e) { } }
    return p;
  }

  /* ---------------- trait measurement: numbers the writing is built from ---------------- */
  function measure(p) {
    const F = p.fore, Hd = p.hind, B = p.body, A = p.antenna, m = { p };
    m.cf = hsl(F.base); m.ch = hsl(Hd.base);
    m.foreName = cname(F.base); m.hindName = cname(Hd.base); m.bodyName = cname(B.color || F.base);
    m.aspect = F.len / F.chord;                                  // forewing length / width
    m.narrow = nrm(m.aspect, 2.0, 3.2); m.broad = 1 - nrm(m.aspect, 1.7, 2.5);
    m.mass = (B.tw * B.abdW * B.abdLen) / (F.len * F.chord);     // body bulk relative to wing area
    m.heavy = nrm(m.mass, 2.3, 5); m.slight = 1 - nrm(m.mass, 1.6, 3);
    m.fuzz = nrm(B.fuzz, .7, 2.0); m.fuzzRaw = B.fuzz;
    m.hindRatio = Hd.len / F.len;
    m.tailLen = Hd.tail || 0; m.tail = nrm(m.tailLen, 10, 80);
    m.hook = F.hook || 0;
    m.eyes = (F.eyes || []).length + (Hd.eyes || []).length;
    m.foreEyes = (F.eyes || []).length; m.hindEyes = (Hd.eyes || []).length;
    m.bands = (F.bands || []).length + (Hd.bands || []).length;
    m.spots = (F.spots || []).length + (Hd.spots || []).length;
    m.feather = A.type === 'feather'; m.serrate = A.type === 'serrate'; m.thread = A.type === 'thread'; m.club = A.type === 'club';
    m.coat = coatWord(B.fuzz);
    m.antLen = A.len; m.antBarb = A.barb;
    m.eyeBig = nrm(B.eyeSize || .15, .12, .26);
    m.veins = !!(F.veins && F.veins.on); m.speck = !!(F.speck && F.speck.on);
    m.fringe = !!(F.fringe && F.fringe.on);
    m.abdBands = !!(B.stripe && B.stripe.on);

    /* upper-surface palette */
    const up = [F.base]; (F.bands || []).forEach(b => up.push(b.c)); (F.spots || []).forEach(s => up.push(s.c));
    if (F.margin && F.margin.on) up.push(F.margin.c); if (F.grad && F.grad.on) up.push(F.grad.c);
    m.upper = up.map(hsl);
    m.sat = m.upper.reduce((a, c) => a + c.s, 0) / m.upper.length;
    m.warmUp = m.upper.some(isWarm);
    m.warmFore = isWarm(m.cf);
    const ls = m.upper.map(c => c.l).concat([m.ch.l]);
    m.contrast = Math.max(...ls) - Math.min(...ls);
    m.hindWarm = isWarm(m.ch);
    m.dull = m.cf.s < .45;                                      // fore reads as cryptic
    m.flash = (m.hindWarm || m.ch.s > m.cf.s + .3) && (m.dull || (m.cf.s < .6 && !isWarm(m.cf))) && m.cf.l > .3 && m.ch.l > .3;
    m.dark = m.cf.l < .28; m.pale = m.cf.l > .72 && m.cf.s < .4; m.white = m.cf.l > .88;
    m.green = m.cf.h >= 70 && m.cf.h <= 170 && m.cf.s > .18 && m.cf.l > .3;
    m.earthy = m.cf.h >= 15 && m.cf.h <= 60 && m.cf.s < .7;
    m.warn = (m.hindWarm || m.warmUp) && (m.cf.l < .3 || (m.contrast > .6 && !m.earthy)) && !m.flash;
    m.leaf = (m.hook > .15 ? .5 : 0) + (m.veins ? .4 : 0) + ((F.apex || 0) > .3 ? .15 : 0);
    m.barky = m.cf.s < .4 && (m.speck || (F.bands || []).length >= 2) && m.cf.l > .3 && m.cf.l < .92;
    /* body-plan flags used by lineage, activity and habitat */
    m.hawk = m.heavy > .45 && m.narrow > .5 && m.hindRatio < .66;
    m.silk = m.feather && !m.hawk && (m.broad > .4 || m.tail > .3 || m.hindEyes > 0) && (m.heavy > .1 || m.hindEyes > 0 || m.broad > .6);
    m.uran = m.tail > .3 && !m.feather && m.dark && m.contrast > .6;      // dark, tailed, high-contrast: sunset-moth type day-flier
    m.startle = m.hindEyes > 0 && m.foreEyes === 0 && !m.green;
    m.act = activity(m);
    return m;
  }

  /* ---------------- where it lives: habitat scoring with reasons drawn from this moth's own traits ---------------- */
  const BIOMES = {
    arid: { n: 'hot, dry scrub or desert margins', r: m => [
      [m.pale || m.cf.l > .6 ? 1 : 0, `a ground colour as light as ${m.foreName}, which reflects heat`],
      [1 - m.fuzz, `a coat of fuzz at only ${m.p.body.fuzz.toFixed(1)} on a scale that tops out near 2.2`],
      [1 - nrm(m.sat, .1, .5), 'subdued colours with little saturation'],
      [m.slight, 'a light, sleek body'] ] },
    tropical: { n: 'warm, humid broadleaf forest', r: m => [
      [m.green ? 1 : 0, `${m.foreName} wings, a colour that only makes sense against living leaves`],
      [m.tail, `hindwing tails ${Math.round(m.tailLen)} units long, a luxury of places with heavy bat pressure and plenty of food`],
      [nrm(m.sat, .3, .7), 'rich, saturated colours'],
      [m.eyes ? .8 : 0, `${m.eyes} eyespot${m.eyes > 1 ? 's' : ''}, common in big forest moths`],
      [(1 - m.fuzz) * m.broad, 'broad wings on a body with a thin coat'],
      [m.heavy * m.broad * (m.feather ? 1 : .4), 'the heavy body and broad wings of the big silk moths, which favour warm, food-rich forest'] ] },
    temperate: { n: 'temperate deciduous woodland', r: m => [
      [m.barky ? 1 : 0, `${m.foreName} forewings with fine pattern that suits bark`],
      [m.earthy && !m.pale ? .7 : 0, `an earthy ${m.foreName} that blends into leaf litter and trunks`],
      [1 - Math.abs(m.fuzz - .45) * 2, 'a moderate coat, neither woolly nor bare'],
      [m.speck ? .7 : 0, 'speckling like lichen on a trunk'],
      [m.heavy * m.broad * (m.feather ? .8 : .3), 'a heavy body and broad wings, the look of big woodland silk moths'],
      [m.pale && (m.speck || m.bands >= 2) ? 1 : 0, `${m.foreName} wings with fine dark marking, the look of birch bark and lichen`] ] },
    boreal: { n: 'cool conifer forest', r: m => [
      [nrm(m.fuzzRaw, 1.1, 2.0), `a ${m.coat} coat (${m.p.body.fuzz.toFixed(1)} on the fuzz scale) for cold nights`],
      [m.dark || m.cf.l < .45 ? .8 : 0, `${m.foreName} wings, dark enough to soak up weak sun`],
      [m.cf.s < .35 ? .6 : 0, 'smoky, low-saturation colouring'],
      [(1 - m.narrow) * .5, 'wings that are broad rather than long'] ] },
    alpine: { n: 'high, cold upland slopes', r: m => [
      [nrm(m.fuzzRaw, 1.4, 2.0), `fuzz at ${m.p.body.fuzz.toFixed(1)}, close to the top of the range`],
      [m.dark ? 1 : 0, `${m.foreName} wings, which warm quickly in thin air`],
      [m.broad, 'short, broad wings that suit slow, low flight'],
      [1 - m.sat, 'plain colours with no showy pattern'] ] },
    grass: { n: 'sunny grassland and meadow', r: m => [
      [m.narrow, `long, narrow forewings (length ${m.aspect.toFixed(1)} times width)`],
      [(m.cf.h > 35 && m.cf.h < 70 && m.cf.l > .55 ? 1 : 0) * (.3 + .7 * m.narrow), `a straw ${m.foreName} that vanishes into dry stems`],
      [m.warn && m.act.mode === 'day' ? 1 : 0, 'bold warning colours, the kind advertised in open sunlight over flowers'] ] },
    wetland: { n: 'damp reedbeds and river margins', r: m => [
      [m.pale ? 1 : 0, `${m.foreName} wings, pale like reed heads and pale stems`],
      [m.broad * (1 - m.sat), 'broad, plain wings'],
      [m.white ? .6 : 0, 'a near-white sheen, typical of moths of open wet ground'] ] },
    urban: { n: 'gardens, farmland and town edges', r: m => [
      [m.cf.l > .5 && m.cf.l < .82 && m.cf.s < .3 ? 1 : 0, `a plain ${m.foreName} that suits walls and fence posts`],
      [1 - m.sat, 'colours with no strong pattern, a generalist look'],
      [m.slight * .5, 'a build that does not ask much of its habitat'],
      [m.narrow * m.heavy, 'a narrow-winged, heavy-bodied build made for hovering at flowers, typical of garden and woodland-edge hawkmoths'] ] },
  };
  function habitat(m) {
    const res = Object.keys(BIOMES).map(k => {
      const rs = BIOMES[k].r(m); let score = .6 * Math.max(...rs.map(x => x[0])) + .4 * rs.reduce((a, x) => a + x[0], 0) / rs.length;
      const pat = m.bands + m.spots + (m.speck ? 2 : 0);
      if ((k === 'arid' || k === 'wetland') && (pat > 1 || m.warn)) score *= .55;
      if (k === 'temperate' && m.pale && pat > 1) score += .25;
      const silk = m.silk, hawk = m.hawk;
      if (k === 'boreal') score *= 1 - .75 * nrm(m.sat, .4, .75);          // saturated colour is a poor fit for cool conifer forest
      if (silk && (k === 'boreal' || k === 'alpine')) score *= .5;
      if (silk && (k === 'temperate' || k === 'tropical')) score += .15;
      if (silk && k === 'temperate' && m.fuzzRaw > 1.2 && m.heavy < .65 && m.tail < .3) score += .3;   // woolly mid-sized silk moths are the temperate ones
      if (hawk && k === 'grass') score *= .6;
      if (hawk && k === 'urban') score += .3;
      if (k === 'alpine' && m.cf.l > .55 && !m.pale) score *= .5;
      if (k === 'alpine' && m.fuzz < .35) score *= .4;
      if (k === 'alpine' && !(m.dark || m.fuzzRaw >= 1.7)) score *= .45;
      if (k === 'arid') score *= 1 - .8 * nrm(m.sat, .35, .7);
      if (k === 'tropical' && m.tail > .5) score += .3;
      if (k === 'grass' && m.warn && m.act.mode === 'day') score += .25;
      return { k, n: BIOMES[k].n, score, why: rs.filter(x => x[0] > .45).sort((a, b) => b[0] - a[0]).map(x => x[1]) };
    }).sort((a, b) => b.score - a.score);
    return res;
  }

  /* ---------------- activity pattern ---------------- */
  function activity(m) {
    let day = m.sat * .5 + m.contrast * .25 + (m.warmUp ? .2 : 0) + m.narrow * .15 + (m.warn ? .35 : 0) - (m.feather ? .15 : 0) - (m.flash ? .3 : 0) - (m.eyes ? .1 : 0) - m.fuzz * .1 - m.heavy * .25;
    if (m.sat > .7 && m.contrast > .5) day += .1;
    if (m.hawk) day -= .3;            // heavy, narrow-winged hawkmoths are overwhelmingly dusk and night fliers
    if (m.uran) day += .45;           // dark, tailed, shimmering moths are the day-flying uraniid type
    day = clamp(day, 0, 1);
    return { day, mode: day > .55 ? 'day' : day > .38 ? 'dusk' : 'night' };
  }

  /* ---------------- section registry: each section turns measurements into sentences ---------------- */
  const SECTIONS = [];
  const S = (id, title, build) => SECTIONS.push({ id, title, build });

  S('home', 'Where it probably lives', (m, p, R) => {
    const hab = habitat(m), a = hab[0], b = hab[1], F = p.fore;
    const out = [];
    const why = a.why.slice(0, 3);
    out.push(pick(R, [
      `Taken together, this build reads like a moth of ${a.n}.`,
      `The traits line up most naturally with ${a.n}.`,
      `If I had to place it on a map, it would be somewhere in ${a.n}.`]) +
      (why.length ? ` The evidence is ${list(why)}.` : ''));
    if (b && b.score > a.score * .8 && b.why.length) out.push(`${cap(b.n)} would be a close second, since it also has ${b.why[0]}.`);
    /* temperature from insulation */
    const f = p.body.fuzz;
    out.push(f > 1.5
      ? `A coat that thick works as a heater, so it probably flies on cool nights, perhaps down toward single-digit temperatures, and needs to shiver its flight muscles warm before takeoff.`
      : f < .9
        ? `With so little insulation it likely needs warm air, with nights that stay comfortably above about 15 degrees Celsius, or flies in daylight when it can warm itself in the sun.`
        : `Its coat is moderate (${f.toFixed(1)} on a scale that runs to 2.2), which suits mild nights and neither frost nor desert heat.`);
    /* moisture */
    if (m.green || m.sat > .6) out.push(`Colour this vivid fades fast in dry sun and hard weather, so it implies shade and humidity rather than open ground.`);
    else if (a.k === 'arid' && m.pale && m.fuzz < .5) out.push(`A pale, sleek moth sheds heat well, which points to dry air and strong light.`);
    return out.join(' ');
  });

  S('rhythm', 'When it is active', (m, p, R) => {
    const ac = activity(m), out = [], eye = p.body.eyeSize || .15;
    if (ac.mode === 'day') out.push(m.warn ? `It almost certainly flies by day. Bold ${m.warmUp ? 'warm' : 'contrasting'} colour on a ${m.foreName} ground is a warning, and warnings only work on predators that can see them in daylight.` : `It most likely flies by day. Its ${m.foreName} and ${m.hindName} colouring is far too conspicuous for a night moth that rests in view, and bold upper surfaces nearly always go with daylight flight or a defence worth advertising.`);
    else if (ac.mode === 'dusk') out.push(`It probably flies around dusk and dawn. The colouring is moderately striking, which is a workable compromise: enough contrast to find mates in low light, not so much that birds spot it at rest.`);
    else out.push(`It is almost certainly a night flier. ${cap(m.foreName)} ${m.contrast < .4 ? 'with so little contrast' : 'broken up by darker marks'} is a cryptic palette, built for a daytime rest rather than for being seen.`);
    if (m.feather) out.push(`The feathery antennae (${p.antenna.len} units, ${p.antenna.barb} units of barb) say the same thing from a different angle: they are for tracking scent in the dark, not for looking at anything.`);
    out.push(eye > .2 ? `Large eyes (${(eye * 100).toFixed(0)}% of its head size scale) would gather a great deal of light, another sign of low-light flight.` : `Eyes of modest size (${(eye * 100).toFixed(0)}% on the head-size scale) leave it relying on smell and touch more than sight.`);
    return out.join(' ');
  });

  /* ---- strategy: which defensive recipe this moth's traits fit (skill: strategies.md) ---- */
  function strategy(m) {
    let main = 'plain';
    if (m.warn) main = 'warn';
    else if (m.flash) main = 'flash';
    else if (m.startle) main = 'startle';
    else if (m.green && (m.leaf > .2 || m.tail > .3 || m.veins)) main = 'livingLeaf';
    else if (m.leaf > .4 && m.earthy) main = 'deadLeaf';
    else if (m.barky) main = 'bark';
    else if (m.cf.l > .5 && m.cf.s < .4 && m.contrast < .45) main = 'ground';
    const big = Math.max(0, ...[].concat(m.p.fore.eyes || [], m.p.hind.eyes || []).map(e => e.r || 0));
    return { main, eyes: m.eyes > 0, bigEyes: big > .14, tails: m.tailLen > 12, giant: m.silk && m.heavy > .1 };
  }
  function substrate(m) {
    if (m.green) return 'living leaves in the shade';
    if (m.dark) return 'dark bark or shaded rock';
    if (m.barky && m.pale) return 'pale, lichen-crusted bark such as birch or old fence timber';
    if (m.barky && m.cf.s < .2) return 'lichen-crusted bark';
    if (m.pale) return 'pale bark, limestone or weathered fence timber';
    if (m.earthy) return 'leaf litter and fallen twigs';
    return 'bark and fallen leaves';
  }

  S('defence', 'How it hides or defends itself', (m, p, R) => {
    const st = strategy(m), F = p.fore, nb = (F.bands || []).length, out = [], sub = substrate(m);
    const E = [].concat(F.eyes || [], p.hind.eyes || []);
    if (st.main === 'warn') {
      out.push(`This is a moth that advertises instead of hiding. ${cap(m.foreName)} set against ${m.hindWarm ? m.hindName : 'its bright markings'} is the kind of loud, simple contrast predators learn to leave alone.`);
      out.push(`Warning colour only pays if there is something behind it, so it very likely carries a bitter chemical defence, plausibly stored from toxic plants its caterpillar ate (ragwort-type alkaloids or milkweed-type heart poisons are the usual candidates, though nothing in the parameters can say which).`);
    } else if (st.main === 'flash') {
      out.push(`By day it probably sits motionless on ${sub}, with the ${m.foreName} forewings folded over the ${m.hindName} hindwings so that nothing bright shows.`);
      out.push(`If something finds it anyway, it can snap the forewings forward and flare the ${m.hindName} underwings. The sudden colour buys the half-second it needs to drop away and vanish again, a trick real underwing and tiger moths use.`);
    } else if (st.main === 'livingLeaf') {
      out.push(`It most likely rests under or on ${sub}, where ${m.foreName} wings pass for a leaf${m.veins ? ', and the pale vein lines do the rest of the work' : ''}.`);
      out.push(`That green is a fragile pigment: it fades toward yellow and tan within days of emerging, so an older individual would look noticeably off-colour against fresh leaves.`);
    } else if (st.main === 'deadLeaf') {
      out.push(`It rests among ${sub}, folded to look like a curled, dead leaf. ${m.hook > .15 ? `The hooked wing tip (${m.hook.toFixed(2)} on the hook scale) works as the leaf's pointed end` : 'The leaf-like outline'}${m.veins ? ', and the painted veins suggest a midrib' : ''}.`);
      out.push(`Dead-leaf mimics hold perfectly still all day, which is why this build gives up flash and bright colour entirely.`);
    } else if (st.main === 'bark') {
      out.push(`Its daytime rest is flat against ${sub}. The ${m.foreName} forewings ${nb >= 2 ? `carry ${nb} cross-bands that should line up across the overlapped wings, so the pattern reads as one continuous bark mark` : 'are mottled so the outline breaks up against the trunk'}.`);
      out.push(`Moths like this tend to come in a few discrete forms, a paler and a darker one, matched to how dark the local bark is. This individual would be one of those morphs.`);
    } else if (st.main === 'ground') {
      out.push(`A plain ${m.foreName} with little contrast suggests it matches bare ground, dry stems or pale timber, and relies on staying put and staying plain.`);
    } else {
      out.push(`Nothing about this colouring is loud or oddly specific, so it looks like a generalist: ${m.foreName} wings that blend into whatever bark, leaf or stone it happens to land on, the most common way to be a moth.`);
    }
    if (st.eyes) {
      const nm = [...new Set(E.slice(0, 2).map(e => cname((e.cols || [])[0] || '#222')))], names = nm.join(' and ');
      out.push(st.bigEyes
        ? `The ${m.eyes} large eyespot${m.eyes > 1 ? 's' : ''} (${names} rings) are a startle display: when a bird lifts the forewing, a pair of enormous staring eyes appears.`
        : `The small eyespot${m.eyes > 1 ? 's' : ''} (${names} rings) are better read as decoys, drawing a beak toward an expendable wing edge instead of the body.`);
    }
    if (st.tails) out.push(`The hindwing tails, ${Math.round(m.tailLen)} units long, are a bat defence: they trail behind the body and give echolocating bats a false target to bite.`);
    return out.join(' ');
  });

  S('predators', 'What hunts it', (m, p, R) => {
    const st = strategy(m), out = [], mode = m.act.mode, resting = mode !== 'day';
    const C = [];
    if (resting) C.push({ w: .9, t: `Because it flies at night, the biggest threat in the air is bats, which find moths by echolocation.` });
    if (mode === 'day' || mode === 'dusk') C.push({ w: .8, t: `Flying in the light makes it a target for birds, and for dragonflies or hunting wasps on warm afternoons.` });
    if (st.main !== 'warn') C.push({ w: .85, t: `Spend the day resting in the open and the main predator becomes the sharp-eyed bird, which is exactly the problem a ${m.foreName} wing colour is trying to solve.` });
    else C.push({ w: .85, t: `Once a bird has tasted one, it remembers; the colouring only needs to teach each predator that lesson a single time.` });
    if (m.fuzz > .5) C.push({ w: .5 + m.fuzz * .3, t: `The coat of fuzz (${p.body.fuzz.toFixed(1)}) soaks up bat ultrasound, so a fuzzy moth returns a much weaker echo than a bald one.` });
    if (st.tails) C.push({ w: .8, t: `With tails like that, the realistic threat is bats; the streamers act as decoys.` });
    if (m.act.mode !== 'day') C.push({ w: .4, t: `On the ground and in foliage it would also face spiders, lizards and shrews, and parasitoid wasps laying eggs in its caterpillar stage.` });
    return top(C, 4, .4).join(' ');
  });

  S('flight', 'How it moves', (m, p, R) => {
    const out = [], asp = m.aspect.toFixed(1), hr = Math.round(m.hindRatio * 100);
    if (m.narrow > .55 && m.heavy > .4) out.push(`Wings ${asp} times as long as wide on a heavy body make a fast, powerful, direct flier. It probably hovers and darts, and could travel long distances; the same proportions belong to well-known migrants.`);
    else if (m.narrow > .55) out.push(`Long, narrow wings (${asp} times as long as wide) on a light body suggest a quick, steady flier with good endurance.`);
    else if (m.broad > .55 && m.heavy > .4) out.push(`Broad wings (only ${asp} times as long as wide) carrying a heavy body mean a slow, labouring flier that travels in short, deliberate hops and does not go far.`);
    else if (m.broad > .55) out.push(`Wide, light wings make for a floppy, fluttering flight, easy to spot when it is moving but low and unhurried.`);
    else out.push(`Its wing proportions are middle of the road (${asp} times as long as wide), so it flies in the plain, steady way of most moths.`);
    out.push(m.hindRatio < .6 ? `The hindwings are small, only ${hr}% the length of the forewings, which is a speed adaptation: less drag, more thrust.` : m.hindRatio > .76 ? `The hindwings are generous, ${hr}% the length of the forewings, giving extra lift for slower, more agile fluttering.` : `The hindwings run to ${hr}% of the forewing length, a balanced pair with no strong lean toward speed or manoeuvrability.`);
    if (m.fuzz > .6) out.push(`It likely has to warm up by shivering before it can fly on a cool night, and will often rest between flights.`);
    return out.join(' ');
  });


  /* ---- life cycle, mating, honesty ---- */
  function lineage(m) {
    if (m.hawk || (m.club && m.heavy > .3)) return 'hawkmoth';
    if (m.uran) return 'uraniid-type day-flier';
    if (m.silk) return m.heavy > .3 && (m.broad > .6 || m.tail > .3) ? 'giant silk moth' : 'silk moth';
    if (m.feather && m.heavy > .3 && m.pale) return 'tiger or tussock-type moth';
    if (m.warn && m.narrow > .6) return 'burnet or tiger-moth type day-flier';
    if (m.warn) return 'tiger moth';
    if (m.slight > .5 && m.broad > .4 && !m.feather) return 'geometrid (inchworm moth)';
    return 'noctuid-style generalist';
  }

  S('life', 'What it eats and how its year runs', (m, p, R) => {
    const st = strategy(m), out = [], bio = habitat(m)[0].k, a = lineage(m);
    const nonFeeding = st.giant;
    out.push(nonFeeding
      ? `This is the build of a moth that does not feed as an adult: heavy, broad-winged and feather-antennaed, with mouthparts reduced to nothing. Everything it needs to fly and breed was eaten as a caterpillar, so its adult life is about a week long, spent finding a mate and laying eggs.`
      : m.narrow > .5 && m.heavy > .4
        ? `As an adult it probably drinks nectar on the wing, hovering at long-tubed flowers with a long proboscis, which is what a narrow-winged, heavy-bodied build is for. It would live a few weeks.`
        : m.warn ? `As an adult it likely drinks nectar from open, sunlit flowers, living for a few weeks on that and its stored reserves.`
          : `As an adult it probably takes a little nectar, tree sap or rotting fruit, living perhaps a few weeks, with the exact diet impossible to read from wing colour.`);
    const host = m.green ? `broad-leaved trees or shrubs, since a leaf-green adult usually grew up on green foliage`
      : m.warn ? `a chemically defended plant that makes the adult bitter`
        : m.narrow > .6 && m.cf.l > .55 ? `grasses and low herbs, which suit a pale, narrow-winged grassland moth`
          : m.barky || m.earthy ? `a broad range of trees and shrubs, as most bark-coloured moths are generalists`
            : `leafy plants, with the exact species undetermined`;
    out.push(`The caterpillar probably fed on ${host}. It would have its own colour and its own predators, separate from the adult.`);
    const season = { tropical: 'year-round, peaking in the wet season', arid: 'in short bursts after rain', temperate: 'from late spring through early autumn', boreal: 'in a brief high-summer window', alpine: 'in a short summer window', grass: 'through the warm months', wetland: 'through the warm months', urban: 'through the warm months' }[bio];
    const broods = (m.fuzz > .5 || m.dark || nonFeeding || bio === 'boreal' || bio === 'alpine') ? 'one brood a year' : (m.slight > .4 ? 'two or more broods a year, with the later generations often a shade paler or smaller' : 'one or two broods a year');
    out.push(`Adults would be on the wing ${season}, most likely with ${broods}.`);
    if (m.sat > .5 || m.green) out.push(`Vivid colours fade as the scales wear, so the ${m.foreName} would look noticeably duller on a week-old moth than on a freshly emerged one.`);
    return out.join(' ');
  });

  S('mates', 'Finding a mate', (m, p, R) => {
    const A = p.antenna, B = p.body, out = [], heavyAbd = B.abdW / B.tw > .9;
    if (m.feather) out.push(`Feather-like antennae with ${A.barb} units of side-branches turn each antenna into a huge scent-catching surface. A moth built this way is almost always a male, tracking the faint trail of a female's pheromone over long distances while she waits.`);
    else if (m.serrate) out.push(`Saw-edged antennae sit between thread and feather: able to pick up scent, but not specialised for it. Both sexes of such species tend to search actively.`);
    else out.push(`Thread-like antennae (${A.len} units long) suggest either a female, who releases scent rather than hunts for it, or a species where sight and plain scent are enough for finding partners.`);
    if (heavyAbd) out.push(`The abdomen is thick (${B.abdW} wide against a ${B.tw} thorax), which is how a female carrying a full load of eggs looks, and would explain a heavier, slower flight.`);
    else out.push(`The slim abdomen (${B.abdW} wide against a ${B.tw} thorax) fits a male built for search flight.`);
    if (m.heavy > .3 && m.feather) out.push(`If this is the male of a large non-feeding species, the female is likely larger and plumper, less keen to fly, and may be of a different colour intensity, since dimorphism in moths goes in no single direction.`);
    return out.join(' ');
  });

  S('confidence', 'How much of this is guesswork', (m, p, R) => {
    const out = [`Absolute size is not stored in these parameters (the forewing is always 100 units), so every statement about bulk, flight and feeding comes from proportions, not from real wingspan.`];
    out.push(`Links like pale moths in dry places and fuzzy moths in the cold are well-supported tendencies with exceptions; the notion that colour reveals diet or season is much weaker, and some of the underlying research comes from butterflies.`);
    out.push(`Read this as the most plausible life for this exact body and palette, not as a fact: change a single colour or wing proportion in the builder and the story may shift.`);
    return out.join(' ');
  });

  /*@@SECTIONS@@*/

  /* ---------------- public API ---------------- */
  function describe(raw) {
    const p = normalise(raw), m = measure(p), seed = h32(stable(raw && typeof raw === 'string' ? JSON.parse(raw) : raw));
    const sections = [];
    SECTIONS.forEach(s => { const text = s.build(m, p, rng(seed ^ h32(s.id))); if (text) sections.push({ id: s.id, title: s.title, text }); });
    const hab = habitat(m);
    const lin = lineage(m), md = { day: 'by day', dusk: 'at dusk and dawn', night: 'at night' }[m.act.mode];
    return { headline: `${an(m.foreName + ' ' + lin)} that probably flies ${md} in ${hab[0].n}.`, sections, facts: { lineage: lin, strategy: strategy(m).main, biome: hab[0].k, activity: activity(m).mode, aspect: +m.aspect.toFixed(2), mass: +m.mass.toFixed(2) } };
  }
  function toText(r) { return r.sections.map(s => s.title.toUpperCase() + '\n' + s.text).join('\n\n'); }

  root.MothEcology = { describe, toText, _measure: measure, _habitat: habitat, _cname: cname, _normalise: normalise };
})(typeof window !== 'undefined' ? window : globalThis);
