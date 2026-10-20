/* moth_builder.js: moth rendering logic + builder UI. Loaded by moth_builder.html and moth_screensaver.html. */
(function () {
      /* ===================== CORE: renderMoth(params) -> SVG string ===================== */
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const get = (o, p) =>
        p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
      const set = (o, p, v) => {
        const k = p.split("."),
          l = k.pop();
        k.reduce((a, x) => a[x], o)[l] = v;
      };
      const mulberry = (a) => () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const dm = (a, b) => {
        if (b === undefined) return a;
        if (Array.isArray(b)) return b.map((x) => dm(undefined, x));
        if (b && typeof b === "object") {
          const o = {
            ...(a && typeof a === "object" && !Array.isArray(a) ? a : {}),
          };
          for (const k in b) o[k] = dm(o[k], b[k]);
          return o;
        }
        return b;
      };
      // closed Catmull-Rom spline -> smooth, corner-free wing outlines
      const cr = (P, n = 8) => {
        const N = P.length,
          o = [];
        for (let i = 0; i < N; i++) {
          const a = P[(i + N - 1) % N],
            b = P[i],
            c = P[(i + 1) % N],
            d = P[(i + 2) % N];
          for (let k = 0; k < n; k++) {
            const t = k / n,
              t2 = t * t,
              t3 = t2 * t;
            o.push(
              [0, 1].map(
                (j) =>
                  0.5 *
                  (2 * b[j] +
                    (-a[j] + c[j]) * t +
                    (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 +
                    (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t3),
              ),
            );
          }
        }
        return o;
      };
      const wavy = (pts, n, amp, c) =>
        n && amp
          ? pts.map((p, i) => {
              const t = i / (pts.length - 1),
                k = amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * n * t)),
                dx = c[0] - p[0],
                dy = c[1] - p[1],
                d = Math.hypot(dx, dy) || 1;
              return [p[0] + (dx / d) * k, p[1] + (dy / d) * k];
            })
          : pts;
      const mapper = (A, T, I) => (u, v) => {
        const tx = A[0] * u,
          ty = A[1] * u,
          bx = T[0] * u + I[0] * (1 - u),
          by = T[1] * u + I[1] * (1 - u);
        return [tx + (bx - tx) * v, ty + (by - ty) * v];
      };
      const pathOf = (p, close = true) =>
        "M" +
        p.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L") +
        (close ? "Z" : "");
      const bd = (u, w, c, skew = 0, wv = 0, freq = 9, w2 = w) => ({
        u,
        w,
        w2,
        skew,
        wave: wv,
        freq,
        c,
      });
      const sp = (u, v, rx, ry, c, ring = "", o = 1, rot = 0) => ({
        u,
        v,
        rx,
        ry,
        c,
        ring: ring || "#000000",
        rw: ring ? 1.6 : 0,
        o,
        rot,
      });
      const E = (u, v, r, cols, hl = true) => ({ u, v, r, cols, hl });
      const hex2 = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)),
        mix = (a, b, t) => {
          const x = hex2(a),
            y = hex2(b);
          return (
            "#" +
            x
              .map((v, i) =>
                Math.round(v + (y[i] - v) * t)
                  .toString(16)
                  .padStart(2, "0"),
              )
              .join("")
          );
        };
      const tint = (o, f) =>
        typeof o === "string"
          ? /^#[0-9a-f]{6}$/i.test(o)
            ? f(o)
            : o
          : Array.isArray(o)
            ? o.map((x) => tint(x, f))
            : o && typeof o === "object"
              ? Object.fromEntries(
                  Object.entries(o).map(([k, v]) => [k, tint(v, f)]),
                )
              : o;
      // text or number -> 32-bit seed (4,294,967,296 possible seeds)
      const seedOf = (t) => {
        t = String(t).trim();
        if (/^\d+$/.test(t) && +t < 4294967296) return +t;
        let h = 2166136261;
        for (const ch of t) {
          h ^= ch.codePointAt(0);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      };
      const M = (w, c) => ({ on: true, w, c }),
        SK = (n, s, c, rc) => ({
          on: true,
          n,
          s,
          c,
          ring: !!rc,
          rc: rc || "#111111",
        });

      const PAT = {
        margin: { on: false, w: 5, c: "#6b4f33" },
        costalBand: { on: false, w: 5, c: "#6b4f33" },
        grad: { on: false, c: "#8a6a45" },
        veins: { on: false, c: "#6b4f33" },
        fringe: { on: false, len: 0.6, c: "#e8ddc6" },
        speck: {
          on: false,
          n: 50,
          s: 0.012,
          c: "#3a2c20",
          ring: false,
          rc: "#111111",
        },
        bands: [],
        spots: [],
        eyes: [],
      };
      const DEF = {
        seed: 1,
        view: "top",
        organic: 0,
        underFade: 0.35,
        /* real-world wingspan, tip to tip, in millimetres; 0 means "not set" (ecology then estimates) */
        span: 0,
        fore: {
          len: 100,
          chord: 44,
          sweep: 0.14,
          hook: 0,
          bulge: 0.2,
          tx: 0.8,
          costal: 0.3,
          teeth: 0,
          tooth: 0,
          tilt: 0,
          apex: 0,
          tornus: 0,
          base: "#c9b18c",
          edge: "#4a3a28",
          ...PAT,
        },
        hind: {
          len: 66,
          chord: 56,
          round: 0.4,
          tail: 0,
          tw: 4,
          curl: 0,
          teeth: 0,
          tooth: 0,
          tilt: 12,
          tailPos: 0.58,
          apex: 0,
          anal: 0,
          base: "#d8c4a0",
          edge: "#4a3a28",
          ...PAT,
        },
        body: {
          tw: 13,
          abdW: 11,
          abdLen: 62,
          head: 0.55,
          eyes: true,
          eyeSize: 0.15,
          eyeColor: "#1c1612",
          taper: 0.5,
          fuzz: 1,
          segments: true,
          color: "#8a7050",
          alt: "#6f5a40",
          stripe: { on: false, c: "#3a2c20" },
          mark: { on: false, c: "#e8d8a8" },
          legs: { on: false, c: "#7a6244" },
        },
        antenna: {
          type: "thread",
          len: 36,
          spread: 30,
          barb: 7,
          color: "#3a2e22",
        },
      };
      const full = (o) => {
        const O = dm(structuredClone(DEF), o);
        for (const k of ["fore", "hind"])
          O[k].eyes.forEach((e) => {
            while (e.cols.length < 4) e.cols.push(e.cols[e.cols.length - 1]);
          });
        return O;
      };

      /* ---- parameter specs: also drive the UI and the cross-parameter realism limits ---- */
      const lim = (f, c) => (typeof f === "function" ? f(c) : f),
        g = (c, p) => get(c, p);
      const R = (p, l, mn, mx, st, vis) => ({ t: "r", p, l, mn, mx, st, vis }),
        K = (p, l, vis) => ({ t: "c", p, l, vis }),
        T = (p, l, vis) => ({ t: "t", p, l, vis }),
        S = (p, l, o, vis) => ({ t: "s", p, l, o, vis }),
        L = (p, l, item, make) => ({ t: "l", p, l, item, make });
      const on = (p) => (c) => !!get(c, p);
      const pat = (k) => [
        K(k + ".base", "Base colour"),
        K(k + ".edge", "Outline colour"),
        T(k + ".grad.on", "Gradient to outer edge"),
        K(k + ".grad.c", "Outer colour", on(k + ".grad.on")),
        T(k + ".margin.on", "Margin band"),
        R(k + ".margin.w", "Margin width", 1, 14, 0.5, on(k + ".margin.on")),
        K(k + ".margin.c", "Margin colour", on(k + ".margin.on")),
        T(k + ".costalBand.on", "Leading-edge band"),
        R(
          k + ".costalBand.w",
          "Band width",
          1,
          12,
          0.5,
          on(k + ".costalBand.on"),
        ),
        K(k + ".costalBand.c", "Band colour", on(k + ".costalBand.on")),
        T(k + ".fringe.on", "Wing fringe (hair-like scales along the edge)"),
        R(
          k + ".fringe.len",
          "Fringe length",
          0.2,
          1.6,
          0.05,
          on(k + ".fringe.on"),
        ),
        K(k + ".fringe.c", "Fringe colour", on(k + ".fringe.on")),
        T(k + ".veins.on", "Veins"),
        K(k + ".veins.c", "Vein colour", on(k + ".veins.on")),
        T(k + ".speck.on", "Speckling"),
        R(k + ".speck.n", "Speck count", 5, 200, 1, on(k + ".speck.on")),
        R(
          k + ".speck.s",
          "Speck size",
          0.006,
          0.03,
          0.001,
          on(k + ".speck.on"),
        ),
        K(k + ".speck.c", "Speck colour", on(k + ".speck.on")),
        T(k + ".speck.ring", "Ringed specks", on(k + ".speck.on")),
        K(
          k + ".speck.rc",
          "Ring colour",
          (c) => g(c, k + ".speck.on") && g(c, k + ".speck.ring"),
        ),
        L(
          k + ".bands",
          "Bands / lines",
          [
            R("u", "Position", 0.03, 0.97, 0.01),
            R("w", "Width at leading edge", 0.01, 0.4, 0.005),
            R("w2", "Width at inner edge", 0.01, 0.5, 0.005),
            R("skew", "Skew", -0.6, 0.6, 0.01),
            R("wave", "Waviness", 0, 8, 0.1),
            R("freq", "Wave frequency", 2, 16, 0.5),
            K("c", "Colour"),
          ],
          () => bd(0.5, 0.05, "#5a4630", 0, 3, 9),
        ),
        L(
          k + ".spots",
          "Spots",
          [
            R("u", "Along wing", 0.03, 0.97, 0.01),
            R("v", "Across wing", -0.1, 1.1, 0.01),
            R("rx", "Width", 0.01, 0.2, 0.005),
            R("ry", "Height", 0.01, 0.2, 0.005),
            R("rot", "Rotation", -90, 90, 1),
            R("o", "Opacity", 0.2, 1, 0.05),
            K("c", "Fill"),
            R("rw", "Ring width", 0, 3, 0.1),
            K("ring", "Ring colour"),
          ],
          () => sp(0.5, 0.5, 0.05, 0.07, "#e8dcc0", "#3a2c20"),
        ),
        L(
          k + ".eyes",
          "Eyespots",
          [
            R("u", "Along wing", 0.05, 0.95, 0.01),
            R("v", "Across wing", 0, 1, 0.01),
            R("r", "Size", 0.04, 0.24, 0.005),
            T("hl", "Highlight"),
            K("cols.0", "Outer ring"),
            K("cols.1", "Ring 2"),
            K("cols.2", "Ring 3"),
            K("cols.3", "Pupil"),
          ],
          () => E(0.5, 0.5, 0.12, ["#2a2420", "#f0cf5e", "#2a2420", "#86b3da"]),
        ),
      ];
      const TABS = {
        Forewing: [
          R("fore.chord", "Wing width", 30, 62, 0.5),
          R("fore.sweep", "Apex rake (forward sweep)", 0, 0.34, 0.01),
          R(
            "fore.hook",
            "Falcate apex hook",
            0,
            (c) => clamp((70 - g(c, "fore.chord")) / 25, 0, 0.9),
            0.01,
          ),
          R(
            "fore.bulge",
            "Outer margin convexity",
            0,
            (c) => 0.4 - g(c, "fore.hook") * 0.25,
            0.01,
          ),
          R("fore.tx", "Tornus position", 0.68, 0.92, 0.01),
          R("fore.costal", "Leading-edge convexity", 0, 0.5, 0.01),
          R(
            "fore.apex",
            "Front corner (apex): round ◂ 0 ▸ sharp",
            -0.9,
            0.9,
            0.01,
          ),
          R(
            "fore.tornus",
            "Back corner (tornus): round ◂ 0 ▸ sharp",
            -0.9,
            0.9,
            0.01,
          ),
          R("fore.teeth", "Scallops", 0, 7, 1),
          R(
            "fore.tooth",
            "Scallop depth",
            0,
            (c) => g(c, "fore.chord") * 0.05,
            0.1,
            (c) => g(c, "fore.teeth") > 0,
          ),
          R("fore.tilt", "Wing angle (swept back)", -6, 34, 0.5),
          R("fore.oblique", "Outer margin slant (triangular wing)", 0, 1, 0.01),
          R("fore.lobe", "Apex lobe (Atlas-style wingtip)", 0, 1, 0.01),
        ],
        Hindwing: [
          R(
            "hind.len",
            "Length",
            40,
            (c) => Math.min(92, Math.max(48, g(c, "fore.chord") * 2.3)),
            1,
          ),
          R(
            "hind.chord",
            "Width",
            (c) => g(c, "hind.len") * 0.5,
            (c) => Math.min(g(c, "hind.len") * 1.08, Math.max(30, g(c, "fore.chord") * 1.5)),
            0.5,
          ),
          R("hind.round", "Outer roundness", 0, 1, 0.01),
          R("hind.apex", "Front corner: round ◂ 0 ▸ sharp", -0.9, 0.9, 0.01),
          R(
            "hind.anal",
            "Back corner (anal angle): round ◂ 0 ▸ sharp",
            -0.9,
            0.9,
            0.01,
            (c) => g(c, "hind.tail") <= 2,
          ),
          R("hind.tail", "Tail length", 0, (c) => g(c, "hind.len") * 1.6, 1),
          R(
            "hind.tw",
            "Tail root width",
            2,
            (c) => Math.max(2.5, g(c, "hind.tail") * 0.12 + 2),
            0.1,
            (c) => g(c, "hind.tail") > 2,
          ),
          R(
            "hind.curl",
            "Tail curl",
            -0.5,
            0.5,
            0.01,
            (c) => g(c, "hind.tail") > 2,
          ),
          R(
            "hind.tailPos",
            "Tail position along trailing edge",
            0.35,
            0.78,
            0.01,
            (c) => g(c, "hind.tail") > 2,
          ),
          R("hind.teeth", "Scallops", 0, 7, 1),
          R(
            "hind.tooth",
            "Scallop depth",
            0,
            (c) => g(c, "hind.chord") * 0.05,
            0.1,
            (c) => g(c, "hind.teeth") > 0,
          ),
          R("hind.tilt", "Wing angle", 4, 24, 0.5),
        ],
        Body: [
          R(
            "body.tw",
            "Thorax width",
            10,
            (c) => Math.min(28, g(c, "fore.chord") * 0.6),
            0.5,
          ),
          R("body.shoulder", "Shoulder fluff (woolly thorax)", 0, 1, 0.01),
          R("body.head", "Head size", 0.42, 0.72, 0.01),
          R(
            "body.abdW",
            "Abdomen width",
            (c) => g(c, "body.tw") * 0.45,
            (c) => g(c, "body.tw") * 0.95,
            0.5,
          ),
          R(
            "body.abdLen",
            "Abdomen length",
            38,
            (c) =>
              Math.min(100, 1700 / g(c, "body.abdW"), g(c, "hind.chord") + 60),
            1,
          ),
          R("body.taper", "Abdomen taper", 0, 1, 0.01),
          R("body.fuzz", "Fuzz / hair-scales", 0, 2.2, 0.05),
          T("body.eyes", "Show eyes"),
          R("body.eyeSize", "Eye size", 0.08, 0.32, 0.01, on("body.eyes")),
          T("body.segments", "Abdomen segments"),
          T("body.stripe.on", "Abdomen bands"),
          K("body.stripe.c", "Band colour", on("body.stripe.on")),
          T("body.mark.on", "Thorax marking"),
          K("body.mark.c", "Marking colour", on("body.mark.on")),
          K("body.legs.c", "Leg colour (bottom view only)"),
        ],
        Antennae: [
          S("antenna.type", "Type", ["thread", "serrate", "feather", "club"]),
          R("antenna.len", "Length", 22, 60, 1),
          R("antenna.spread", "Spread angle", 15, 50, 1),
          R(
            "antenna.barb",
            "Barb length",
            2,
            (c) => g(c, "antenna.len") * 0.28,
            0.5,
            (c) => g(c, "antenna.type") !== "thread",
          ),
        ],
        "Fore pattern": pat("fore"),
        "Hind pattern": pat("hind"),
        Style: [
          S("view", "View", ["top", "bottom", "left", "right"]),
          R("organic", "Organic irregularity", 0, 1, 0.01),
          R("underFade", "Underside fade (bottom view)", 0, 0.8, 0.01),
        ],
        Palette: [
          K("fore.base", "Forewing"),
          K("fore.edge", "Forewing outline"),
          K("hind.base", "Hindwing"),
          K("hind.edge", "Hindwing outline"),
          K("body.color", "Body"),
          K("body.alt", "Body tufts"),
          K("body.eyeColor", "Eyes"),
          K("antenna.color", "Antennae"),
        ],
      };
      const walk = (specs, o, fn) => {
        for (const s of specs) {
          if (s.t === "l")
            (get(o, s.p) || []).forEach((_, i) =>
              walk(
                s.item.map((x) => ({ ...x, p: `${s.p}.${i}.${x.p}` })),
                o,
                fn,
              ),
            );
          else fn(s);
        }
      };
      function constrain(o) {
        /* wingspan: 0 (unset) or 8 to 320 mm; anything else is tidied up */
        o.span = Number.isFinite(+o.span) && +o.span > 0 ? clamp(Math.round(+o.span), 8, 320) : 0;
        for (let n = 0; n < 2; n++)
          for (const sp_ of Object.values(TABS))
            walk(sp_, o, (s) => {
              if (s.t !== "r") return;
              const v = get(o, s.p);
              if (typeof v !== "number") return;
              const mn = lim(s.mn, o),
                mx = Math.max(mn, lim(s.mx, o));
              set(o, s.p, clamp(v, mn, mx));
            });
        return o;
      }

      /* ---- wing outlines: smooth splines + low-frequency organic noise ---- */
      const nz = (rj) => {
        const p = [rj() * 6.28, rj() * 6.28, rj() * 6.28];
        return (i) =>
          Math.sin(i * 0.45 + p[0]) +
          0.6 * Math.sin(i * 1.1 + p[1]) +
          0.3 * Math.sin(i * 2.3 + p[2]);
      };
      // corner sharpness: pull neighbours in and push the corner out -> tighter turn
      const sharp = (P, i, s) => {
        if (!s) return;
        const b = P[i],
          a = P[i - 1],
          c = P[i + 1],
          m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2],
          nb = [b[0] + (b[0] - m[0]) * s * 0.4, b[1] + (b[1] - m[1]) * s * 0.4],
          k = 1 - 0.45 * s;
        P[i] = nb;
        P[i - 1] = [nb[0] + (a[0] - nb[0]) * k, nb[1] + (a[1] - nb[1]) * k];
        P[i + 1] = [nb[0] + (c[0] - nb[0]) * k, nb[1] + (c[1] - nb[1]) * k];
      };
      function finish(P, oS, oE, cE, A, T, I, w, L, C, org, rj) {
        const n = 8;
        let all = cr(P, n);
        if (org) {
          const f = nz(rj),
            amp = org * 0.011 * L;
          all = all.map((p, i) => {
            const dx = p[0] - L * 0.45,
              dy = p[1] - C * 0.4,
              m = Math.hypot(dx, dy) || 1,
              k = amp * f(i);
            return [p[0] + (dx / m) * k, p[1] + (dy / m) * k];
          });
        }
        const a = oS * n,
          b = oE * n,
          outer = wavy(all.slice(a, b + 1), w.teeth, w.tooth, [
            L * 0.5,
            C * 0.5,
          ]);
        all.splice(a, b - a + 1, ...outer);
        return {
          pts: all,
          outer,
          costal: all.slice(0, cE * n + 1),
          map: mapper(A, T, I),
          len: L,
          chord: C,
        };
      }
      function foreShape(w, org, rj) {
        const L = w.len,
          C = w.chord,
          ay = -w.sweep * L,
          h = w.hook,
          ob = w.oblique || 0,
          lb = w.lobe || 0,
          t = w.tx * (1 - 0.3 * ob);
        const P = [
          [0, -0.03 * C],
          [0.32 * L, ay * 0.32 - w.costal * 0.2 * C],
          [0.68 * L, ay * 0.72 - w.costal * 0.16 * C],
          [0.92 * L, ay * 0.97 + 0.04 * C],
          [L + h * 0.1 * L + lb * 0.1 * L, ay + 0.2 * C - h * 0.22 * C - lb * 0.14 * C],
          [
            L * (0.97 + w.bulge * 0.06) * (1 - 0.16 * ob - 0.1 * lb) - h * 0.14 * L,
            ay + (C - ay) * 0.45,
          ],
          [L * t + 0.08 * L, C * 0.88],
          [L * t - 0.03 * L, C],
          [0.55 * L, C * 0.98],
          [0.22 * L, C * 0.62],
          [0, C * 0.3],
        ];
        sharp(P, 4, w.apex);
        sharp(P, 7, w.tornus);
        return finish(
          P,
          4,
          7,
          4,
          [L, ay + 0.1 * C],
          [L * t, C * 0.95],
          [0, C * 0.3],
          w,
          L,
          C,
          org,
          rj,
        );
      }
      function hindShape(w, org, rj) {
        const L = w.len,
          C = w.chord,
          Q = [w.tailPos * L, C],
          tl = w.tail,
          tw = w.tw,
          k = w.curl * tl * 0.4;
        const P = [
          [0, -0.02 * C],
          [0.4 * L, -0.05 * C],
          [0.78 * L, 0],
          [L * 0.98, 0.2 * C],
          [L * (1 + w.round * 0.03), 0.52 * C],
          [Math.min(0.9 * L, Q[0] + 0.3 * L), 0.82 * C],
        ];
        if (tl > 2)
          P.push(
            [Q[0] + tw, C * 0.97],
            [Q[0] + tw * 0.6 + k * 0.5, C + tl * 0.55],
            [Q[0] + w.curl * tl, C + tl],
            [Q[0] - tw * 0.6 + k * 0.5, C + tl * 0.55],
            [Q[0] - tw, C * 0.97],
          );
        else P.push([Q[0], C]);
        P.push([Q[0] * 0.52, 0.86 * C], [Q[0] * 0.14, 0.5 * C]);
        sharp(P, 3, w.apex);
        if (!(tl > 2)) sharp(P, 6, w.anal);
        return finish(
          P,
          3,
          6,
          3,
          [L, 0.12 * C],
          Q,
          [0, 0.35 * C],
          w,
          L,
          C,
          org,
          rj,
        );
      }
      // hand-drawn-feeling venation: discal cell, forking curved veins from its end, posterior veins
      function veinsD(S, rj, org) {
        const N = S.outer.length - 1,
          m = S.map,
          C = S.chord,
          k = 8,
          Qd = (a, b, c) =>
            `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${b[0].toFixed(1)} ${b[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
        let d = "";
        d +=
          Qd(m(0.02, 0.4), m(0.2, 0.28), m(0.42, 0.34)) +
          Qd(m(0.02, 0.56), m(0.2, 0.64), m(0.4, 0.6)) +
          Qd(m(0.42, 0.34), m(0.48, 0.47), m(0.4, 0.6));
        for (let i = 0; i < k; i++) {
          const t = (i + 0.5) / k,
            s = m(0.42 + 0.02 * Math.sin(t * 3.1), 0.34 + 0.26 * t),
            e = S.outer[clamp(Math.round(N * (t + (rj() - 0.5) * 0.05)), 0, N)],
            mid = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2],
            len = Math.hypot(e[0] - s[0], e[1] - s[1]) || 1,
            b = (rj() - 0.5) * C * (0.15 + 0.3 * org),
            c = [
              mid[0] - ((e[1] - s[1]) / len) * b,
              mid[1] + ((e[0] - s[0]) / len) * b,
            ];
          d += Qd(s, c, e);
          if (i % 2) {
            const p = [
                s[0] + (e[0] - s[0]) * 0.7 + (c[0] - mid[0]) * 0.3,
                s[1] + (e[1] - s[1]) * 0.7 + (c[1] - mid[1]) * 0.3,
              ],
              f = S.outer[clamp(Math.round(N * (t + 0.09)), 0, N)];
            d += Qd(p, [(p[0] + f[0]) / 2, (p[1] + f[1]) / 2 + 2], f);
          }
        }
        return (
          d +
          Qd(m(0.02, 0.6), m(0.3, 0.8), m(0.55, 0.97)) +
          Qd(m(0.02, 0.58), m(0.15, 0.8), m(0.27, 0.97))
        );
      }
      function wingSVG(S, P, id, org, rs, rj, vp) {
        // vp ("fore"/"hind") switches on CSS-variable paint for the rig export
        const vs = (prop, v, c) =>
          vp ? ` style="${prop}:var(--${vp}-${v},${c})"` : "";
        const d = pathOf(S.pts),
          L = S.len,
          C = S.chord,
          J = (a = 1) => (rj() - 0.5) * org * a;
        let g_ = "",
          pre = "",
          df = `<clipPath id="${id}c"><path d="${d}"/></clipPath>`,
          fill = P.base;
        if (P.grad.on) {
          df += `<linearGradient id="${id}g"><stop offset=".15" stop-color="${P.base}"/><stop offset="1" stop-color="${P.grad.c}"/></linearGradient>`;
          fill = `url(#${id}g)`;
        }
        // scale fringe: hair-like scales along the outer margin, irregular length/angle
        if (P.fringe.on) {
          const cx = L * 0.5,
            cy = C * 0.45,
            l0 = P.fringe.len * L * 0.055;
          let q = "";
          for (const p of S.outer)
            for (let r = 0; r < 2; r++) {
              const dx = p[0] - cx,
                dy = p[1] - cy,
                m = Math.hypot(dx, dy) || 1,
                a = J(0.5),
                ux = (dx * Math.cos(a) - dy * Math.sin(a)) / m,
                uy = (dx * Math.sin(a) + dy * Math.cos(a)) / m,
                l = l0 * (1 + J(1.1)),
                o = r * 0.6;
              q += `M${(p[0] + o - ux * l * 0.5).toFixed(1)} ${(p[1] - uy * l * 0.5).toFixed(1)}L${(p[0] + o + ux * l).toFixed(1)} ${(p[1] + uy * l).toFixed(1)}`;
            }
          pre = `<path class="w-fringe" d="${q}" stroke="${P.fringe.c}" stroke-width=".9" stroke-linecap="round" fill="none"/>`;
        }
        // tonal mottling so flat colour doesn't feel mechanical
        if (org > 0.02)
          for (let i = 0, n = Math.round(40 * org); i < n; i++) {
            const [x, y] = S.map(rj(), rj() * 1.1 - 0.05);
            g_ += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(L * (0.04 + rj() * 0.08)).toFixed(1)}" ry="${(C * (0.015 + rj() * 0.035)).toFixed(1)}" transform="rotate(${(Math.atan2(y - C * 0.3, x + 1) * 57.3).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${rj() < 0.5 ? "#000" : "#fff"}" opacity="${(0.025 + rj() * 0.045).toFixed(3)}"/>`;
          }
        if (P.veins.on)
          g_ += `<path d="${veinsD(S, rj, org)}" fill="none" stroke="${P.veins.c}" stroke-width="1" opacity=".5" stroke-linecap="round"/>`;
        if (P.margin.on)
          g_ += `<path d="${pathOf(S.outer, false)}" fill="none" stroke="${P.margin.c}" stroke-width="${P.margin.w * 2}" stroke-linejoin="round"/>`;
        if (P.costalBand.on)
          g_ += `<path d="${pathOf(S.costal, false)}" fill="none" stroke="${P.costalBand.c}" stroke-width="${P.costalBand.w * 2}"/>`;
        for (const b of P.bands) {
          const l = [],
            r = [],
            f = nz(rj);
          for (let i = 0; i <= 16; i++) {
            const v = -0.3 + (1.6 * i) / 16,
              u =
                b.u +
                b.skew * (v - 0.5) +
                (b.wave * Math.sin(v * b.freq)) / L +
                f(i) * org * 0.008,
              hw =
                ((b.w + (b.w2 - b.w) * clamp(v, 0, 1)) / 2) *
                (1 + f(i + 7) * org * 0.12);
            l.push(S.map(u - hw, v));
            r.push(S.map(u + hw, v));
          }
          g_ += `<path d="${pathOf([...l, ...r.reverse()])}" fill="${b.c}"/>`;
        }
        for (const s of P.spots) {
          const [x, y] = S.map(s.u + J(0.03), s.v + J(0.03));
          g_ += `<ellipse cx="${x}" cy="${y}" rx="${s.rx * L * (1 + J(0.4))}" ry="${s.ry * C * (1 + J(0.4))}" transform="rotate(${s.rot + J(30)} ${x} ${y})" fill="${s.c}"${s.rw > 0 ? ` stroke="${s.ring}" stroke-width="${s.rw}"` : ""} opacity="${s.o}"/>`;
        }
        if (P.speck.on) {
          const k = P.speck;
          for (let i = 0; i < k.n; i++) {
            const [x, y] = S.map(rs(), rs() * 1.1 - 0.05);
            g_ += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(k.s * L * (0.5 + rs()) * (1 + J(0.3))).toFixed(1)}" fill="${k.c}"${k.ring ? ` stroke="${k.rc}"` : ""}/>`;
          }
        }
        for (const e of P.eyes) {
          const [x, y] = S.map(e.u, e.v),
            n = e.cols.length;
          e.cols.forEach((c, i) => {
            const r = e.r * L * (1 - (0.65 * i) / Math.max(n - 1, 1));
            g_ += `<ellipse cx="${(x + J(0.08) * r * i).toFixed(1)}" cy="${(y + J(0.08) * r * i).toFixed(1)}" rx="${(r * (1 + J(0.08))).toFixed(1)}" ry="${(r * (1 + J(0.08))).toFixed(1)}" fill="${c}"/>`;
          });
          if (e.hl)
            g_ += `<ellipse cx="${x - e.r * L * 0.15}" cy="${y - e.r * L * 0.18}" rx="${e.r * L * 0.12}" ry="${e.r * L * 0.08}" fill="#fff" opacity=".85"/>`;
        }
        return {
          defs: df,
          d,
          body: `<g>${pre}<path class="w-base" d="${d}" fill="${fill}"${P.grad.on ? "" : vs("fill", "base", P.base)}/><g class="w-art" clip-path="url(#${id}c)">${g_}</g><path class="w-edge" d="${d}" fill="none" stroke="${P.edge}"${vs("stroke", "edge", P.edge)} stroke-width="1.5" stroke-linejoin="round"/></g>`,
        };
      }

      /* ---- body: thorax, small head with lateral eyes, rounded segmented abdomen, antennae ---- */
      // antenna drawing shared by top/bottom and side views: pts = centreline, J = jitter, vk = stroke painter
      function antDraw(pts, A, J, vk) {
        let o = `<path d="${pathOf(pts, false)}" fill="none" ${vk("antenna", A.color)} stroke-width="${A.type === "club" ? 1.8 : 1.5}" stroke-linecap="round"/>`;
        if (A.type === "club") {
          // thickened, tapering outer half with a small hooked tip (hawkmoth / burnet style)
          const n = pts.length - 1,
            e = pts[n],
            q = pts[n - 1],
            ux = e[0] - q[0],
            uy = e[1] - q[1],
            m = Math.hypot(ux, uy) || 1;
          o += `<path d="${pathOf(pts.slice(Math.round(n * 0.45)), false)}" fill="none" ${vk("antenna", A.color)} stroke-width="3" stroke-linecap="round"/>`;
          o += `<path d="M${e[0]} ${e[1]}q${((ux / m) * 3 - (uy / m) * 3).toFixed(1)} ${((uy / m) * 3 + (ux / m) * 3).toFixed(1)} ${(-(uy / m) * 5).toFixed(1)} ${((ux / m) * 5).toFixed(1)}" fill="none" ${vk("antenna", A.color)} stroke-width="1.6" stroke-linecap="round"/>`;
        } else if (A.type !== "thread") {
          const f = A.type === "serrate" ? 0.35 : 1;
          let d = "";
          for (let i = 2; i < 24; i++) {
            const p = pts[i],
              dx = pts[i + 1][0] - pts[i - 1][0],
              dy = pts[i + 1][1] - pts[i - 1][1],
              nn = Math.hypot(dx, dy) || 1,
              l = A.barb * f * (1 - i / 30) * (1 + J(0.4)),
              nx = -dy / nn,
              ny = dx / nn,
              fx = (dx / nn) * l * 0.5,
              fy = (dy / nn) * l * 0.5;
            d += `M${p[0] + nx * l + fx} ${p[1] + ny * l + fy}L${p[0]} ${p[1]}L${p[0] - nx * l + fx} ${p[1] - ny * l + fy}`;
          }
          o += `<path d="${d}" fill="none" ${vk("antenna", A.color)} stroke-linecap="round"/>`;
        }
        return o;
      }
      // rig painters: plain attribute normally, attribute + CSS variable override in the rig
      const paintF = (rig) => (v, c) =>
          rig ? `fill="${c}" style="fill:var(--${v},${c})"` : `fill="${c}"`,
        paintK = (rig) => (v, c) =>
          rig ? `stroke="${c}" style="stroke:var(--${v},${c})"` : `stroke="${c}"`;
      // a part whose own origin is its pivot p; content is drawn in the parent's coordinates
      const part = (cls, p, c) =>
        `<g transform="translate(${p[0]} ${p[1]})"><g class="${cls}"><g transform="translate(${-p[0]} ${-p[1]})">${c}</g></g></g>`;
      function bodySVG(B, A, id, rnd, org, bottom, rig) {
        const tw = B.tw / 2,
          tl = tw * 1.15,
          hw = tw * B.head,
          hl = hw * 0.78,
          hy = -tl - hl * (0.5 - 0.22 * (B.shoulder || 0)),
          a0 = tl * 0.3,
          AL = B.abdLen,
          AW = B.abdW / 2,
          f = nz(rnd),
          J = (a = 1) => (rnd() - 0.5) * org * a;
        const tc = (i) =>
          [B.color, mix(B.color, B.alt, 0.3), mix(B.color, "#ffffff", 0.12)][
            i % 3
          ];
        const hwid = (t) =>
          AW *
          Math.pow(1 - Math.pow(t, 3.4), 0.5) *
          (1 - B.taper * 0.4 * t) *
          (1 + f(t * 24) * org * 0.05);
        const Rr = [],
          Ll = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24,
            h = hwid(t),
            y = a0 + AL * t;
          Rr.push([h, y]);
          Ll.push([-h, y]);
        }
        const abd = pathOf([...Rr, ...Ll.reverse()]);
        const clipDef = `<clipPath id="${id}a"><path d="${abd}"/></clipPath>`,
          vf = paintF(rig),
          vk = paintK(rig),
          Z = {};
        let s = "";
        const cut = (k) => {
          Z[k] = s;
          s = "";
        };
        if (bottom)
          for (const sg of [1, -1])
            for (let i = 0; i < 3; i++) {
              const y = -tl * 0.35 + i * tl * 0.5;
              s += `<path d="M${sg * tw * 0.7} ${y}L${sg * (tw + 9 + i * 3 + J(3))} ${y + (i - 1) * 6 - 3 + J(3)}" stroke="${B.legs.c}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
            }
        cut("legs");
        s += `<path d="${abd}" ${vf("body", B.color)}/><g clip-path="url(#${id}a)">`;
        if (B.stripe.on)
          for (let i = 1; i < 9; i += 2)
            s += `<rect x="${-AW}" y="${a0 + (AL * i) / 9}" width="${AW * 2}" height="${AL / 9}" fill="${bottom ? mix(B.stripe.c, B.color, 0.4) : B.stripe.c}"/>`;
        if (B.segments)
          for (let i = 1; i < 10; i++) {
            const y = a0 + (AL * i) / 10 + J(AL * 0.02);
            s += `<path d="M${-AW} ${y}L${AW} ${y + J(1.5)}" stroke="${B.alt}" stroke-width="1.1" opacity=".7"/>`;
          }
        s += "</g>";
        const na = Math.round(12 * B.fuzz);
        for (let i = 0; i < na; i++) {
          const t = 0.04 + (0.42 * i) / na,
            h = hwid(t);
          for (const sg of [1, -1])
            s += `<circle cx="${(sg * h * (0.95 + rnd() * 0.1)).toFixed(1)}" cy="${(a0 + AL * t + J(2)).toFixed(1)}" r="${(AW * 0.2 * (1 + J(0.7))).toFixed(1)}" fill="${tc(i + (sg > 0))}"/>`;
        }
        cut("abd");
        const shf = B.shoulder || 0,
          trx = tw * (1 + 0.3 * shf),
          try_ = tl * (1 + 0.1 * shf);
        s += `<ellipse rx="${trx}" ry="${try_}" ${B.thoraxColor ? vf("thorax", B.thoraxColor) : vf("body", B.color)}/>`;
        const nt = Math.round(28 * B.fuzz);
        for (let i = 0; i < nt; i++) {
          const a = (Math.PI * 2 * i) / nt + rnd() * 0.2,
            k = 0.92 + rnd() * 0.12;
          s += `<circle cx="${(Math.cos(a) * trx * k).toFixed(1)}" cy="${(Math.sin(a) * try_ * k).toFixed(1)}" r="${(tw * 0.24 * (1 + J(0.7))).toFixed(1)}" fill="${tc(i)}"/>`;
        }
        // soft tufts where the wings join the thorax
        if (shf > 0.05)
          for (const sg of [1, -1])
            for (let i = 0; i < 4; i++)
              s += `<circle cx="${(sg * trx * (0.8 + i * 0.07)).toFixed(1)}" cy="${(-try_ * 0.45 + i * try_ * 0.3 + J(2)).toFixed(1)}" r="${(tw * 0.3 * shf * (1 + J(0.5))).toFixed(1)}" fill="${tc(i + 1)}"/>`;
        if (B.mark.on && !bottom)
          s += `<ellipse cy="${-tl * 0.1}" rx="${tw * 0.42}" ry="${tl * 0.55}" fill="${B.mark.c}"/>`;
        cut("thorax");
        s += `<ellipse cy="${hy}" rx="${hw}" ry="${hl}" ${vf("body", B.color)}/>`;
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (1 + i / 8);
          s += `<circle cx="${Math.cos(a) * hw * 0.9}" cy="${hy + Math.sin(a) * hl * 0.9}" r="${hw * 0.28 * (1 + 0.8 * shf) * (1 + J(0.5))}" fill="${tc(i)}"/>`;
        }
        if (shf > 0.05)
          for (let i = 0; i < 7; i++) {
            const a = Math.PI * (0.12 + (0.76 * i) / 6);
            s += `<circle cx="${(Math.cos(a) * hw * 0.95).toFixed(1)}" cy="${(hy + hl * 0.55 + Math.sin(a) * hl * 0.5).toFixed(1)}" r="${(hw * 0.3 * (0.6 + shf * 0.5) * (1 + J(0.4))).toFixed(1)}" fill="${tc(i)}"/>`;
          }
        if (B.eyes)
          for (const sg of [1, -1])
            s += `<ellipse cx="${sg * hw * 0.78}" cy="${hy + hl * 0.1}" rx="${hw * B.eyeSize}" ry="${hw * B.eyeSize * 1.25}" ${vf("eye", B.eyeColor)}/>`;
        cut("head");
        const ant = (sg) => {
          const bx = sg * hw * 0.4,
            by = hy - hl * 0.6,
            a = ((A.spread + J(8)) * Math.PI) / 180,
            t = [bx + sg * Math.sin(a) * A.len, by - Math.cos(a) * A.len],
            pts = qz(
              [bx, by],
              [bx + sg * A.len * 0.1, by - A.len * 0.8],
              t,
              24,
            );
          return antDraw(pts, A, J, vk);
        };
        const aR = ant(1),
          aL = ant(-1);
        if (!rig)
          return clipDef + Z.legs + Z.abd + Z.thorax + Z.head + aR + aL;
        const by = hy - hl * 0.6;
        return {
          legs: Z.legs,
          abd: clipDef + Z.abd,
          thorax: Z.thorax,
          head: Z.head,
          antL: aL,
          antR: aR,
          piv: {
            abd: [0, a0],
            head: [0, -tl],
            antL: [-hw * 0.4, by],
            antR: [hw * 0.4, by],
          },
        };
      }
      const qz = (a, b, c, n) =>
        cr4(
          [
            a,
            [a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3],
            [c[0] + ((b[0] - c[0]) * 2) / 3, c[1] + ((b[1] - c[1]) * 2) / 3],
            c,
          ],
          n,
        );
      const cr4 = (p, n) =>
        Array.from({ length: n + 1 }, (_, i) => {
          const t = i / n,
            u = 1 - t,
            a = u * u * u,
            b = 3 * u * u * t,
            c = 3 * u * t * t,
            d = t * t * t;
          return [
            a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
            a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
          ];
        });

      // top view: forewings over hindwings, body on top. bottom view: layer order reverses, undersides are paler, legs show.
      function renderMoth(o = {}, opt = {}) {
        const O = full(o);
        if (!opt.free) constrain(O);
        if (O.view === "left" || O.view === "right") return sideMoth(O, opt);
        const org = O.organic,
          bottom = O.view === "bottom",
          sd = O.seed >>> 0 || 1,
          mk = (k) => mulberry(sd * 31 + k),
          id = opt.rig
            ? "m" + sd + O.view
            : "m" + Math.random().toString(36).slice(2, 7);
        const fade = (c) => mix(c, "#efe6d4", O.underFade * 0.8),
          F = bottom ? tint(O.fore, fade) : O.fore,
          H = bottom ? tint(O.hind, fade) : O.hind,
          A = O.antenna;
        const B = bottom
            ? {
                ...O.body,
                color: mix(O.body.color, O.body.alt, 0.6),
                legs: { ...O.body.legs, on: true },
              }
            : O.body,
          tw = B.tw / 2,
          tl = tw * 1.15;
        const fb = [tw * 0.5, -tl * 0.45],
          hb = [tw * 0.4, tl * 0.3];
        const sides = [0, 1].map((s) => {
          const fs = foreShape(F, org, mk(1 + s * 2)),
            hs = hindShape(H, org, mk(2 + s * 2));
          return {
            fs,
            hs,
            fw: wingSVG(fs, F, id + "f" + s, org, mk(5), mk(11 + s), opt.rig && "fore"),
            hw: wingSVG(hs, H, id + "h" + s, org, mk(6), mk(13 + s), opt.rig && "hind"),
            ft: F.tilt + (mk(21 + s)() - 0.5) * org * 1.6,
            ht: H.tilt + (mk(23 + s)() - 0.5) * org * 1.6,
          };
        });
        const sh = `url(#sh${id})`,
          grp = (w, b, a, s, shadow) =>
            `<g${shadow ? ` filter="${sh}"` : ""} transform="${s ? "scale(-1 1) " : ""}translate(${b}) rotate(${a})">${w.body}</g>`;
        const hindG = sides
            .map((q, s) => grp(q.hw, hb, q.ht, s, bottom))
            .join(""),
          foreG = sides.map((q, s) => grp(q.fw, fb, q.ft, s, !bottom)).join("");
        const bb = { x: 0, y1: 1e9, y2: -1e9 };
        const ext = (pts, b, a) => {
          const c = Math.cos((a * Math.PI) / 180),
            s = Math.sin((a * Math.PI) / 180);
          pts.forEach((p) => {
            const x = b[0] + p[0] * c - p[1] * s,
              y = b[1] + p[0] * s + p[1] * c;
            bb.x = Math.max(bb.x, Math.abs(x));
            bb.y1 = Math.min(bb.y1, y);
            bb.y2 = Math.max(bb.y2, y);
          });
        };
        sides.forEach((q) => {
          ext(q.fs.pts, fb, q.ft);
          ext(q.hs.pts, hb, q.ht);
        });
        const hy = -tl - tw * B.head * 0.78 * 0.5;
        bb.y1 = Math.min(bb.y1, hy - A.len - tw * B.head * 0.5);
        bb.y2 = Math.max(bb.y2, tl * 0.3 + B.abdLen);
        bb.x = Math.max(bb.x, Math.sin((A.spread * Math.PI) / 180) * A.len + 8);
        const pad = 14,
          wdefs = sides.map((q) => q.fw.defs + q.hw.defs).join(""),
          defs =
            wdefs +
            `<filter id="sh${id}" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="0" dy="1.8" stdDeviation="2.2" flood-color="#000" flood-opacity=".25"/></filter>`,
          vb = `${(-bb.x - pad).toFixed(1)} ${(bb.y1 - pad).toFixed(1)} ${(2 * (bb.x + pad)).toFixed(1)} ${(bb.y2 - bb.y1 + 2 * pad).toFixed(1)}`;
        if (opt.rig) {
          // rig: wings carry their own hinge origin; the mirror and tilt live on parent groups
          const Z = bodySVG(B, A, id, mk(30), org, bottom, true),
            rw = (w, b, a, s, c) =>
              `<g transform="${s ? "scale(-1 1) " : ""}translate(${b}) rotate(${a})"><g class="wing ${c} ${s ? "l" : "r"}">${w.body}</g></g>`,
            hindR = sides.map((q, s) => rw(q.hw, hb, q.ht, s, "wing-hind")).join(""),
            foreR = sides.map((q, s) => rw(q.fw, fb, q.ft, s, "wing-fore")).join(""),
            P = Z.piv,
            bodyG = `<g class="body">${bottom ? `<g class="legs">${Z.legs}</g>` : ""}${part("abdomen", P.abd, Z.abd)}<g class="thorax">${Z.thorax}</g>${part("head", P.head, Z.head)}${part("antenna l", P.antL, Z.antL)}${part("antenna r", P.antR, Z.antR)}</g>`;
          return rigWrap(
            id,
            vb,
            `Moth, ${bottom ? "bottom" : "top"} view`,
            wdefs,
            `<g class="moth-root">${bottom ? foreR + hindR : hindR + foreR}${bodyG}</g>`,
            F,
            H,
            B,
            A,
            false,
          );
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Moth, ${bottom ? "bottom" : "top"} view"><defs>${defs}</defs>${bottom ? foreG + hindG : hindG + foreG}<g filter="${sh}">${bodySVG(B, A, id, mk(30), org, bottom)}</g></svg>`;
      }

      /* ---- rig export: named parts, CSS-variable colours, optional built-in animation ---- */
      function rigCSS(u, side) {
        const q = `.moth-${u}`,
          sp = "var(--flap-speed,.32s)",
          am = "var(--flap-amp,.55)",
          sw = "var(--sway,1)",
          flap = side
            ? `0%,100%{transform:rotate(calc(${am}*7deg))}50%{transform:rotate(calc(${am}*-44deg))}`
            : `0%,100%{transform:rotate(0deg) scale(1,1)}50%{transform:rotate(calc(${am}*-10deg)) scale(calc(1 - ${am}),1)}`;
        return (
          `${q} .moth-root,${q} .wing,${q} .abdomen,${q} .head,${q} .antenna{transform-box:view-box;transform-origin:0 0}` +
          `@keyframes flap-${u}{${flap}}` +
          `@keyframes sway-${u}{0%,100%{transform:rotate(calc(${sw}*-3deg))}50%{transform:rotate(calc(${sw}*3deg))}}` +
          `@keyframes twitch-${u}{0%,100%{transform:rotate(0deg)}35%{transform:rotate(calc(${sw}*5deg))}65%{transform:rotate(calc(${sw}*-3deg))}}` +
          `@keyframes bob-${u}{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(${sw}*-2.5px))}}` +
          `${q}.fly .wing{animation:flap-${u} ${sp} ease-in-out infinite}` +
          `${q}.fly .wing.far{animation-delay:calc(${sp}*.05)}` +
          `${q}.fly .wing-hind{animation-delay:calc(${sp}*.12)}` +
          `${q}.fly .abdomen{animation:sway-${u} calc(${sp}*7) ease-in-out infinite}` +
          `${q}.fly .antenna{animation:twitch-${u} calc(${sp}*9) ease-in-out infinite}` +
          `${q}.fly .antenna.r,${q}.fly .antenna.far{animation-delay:calc(${sp}*-3)}` +
          `${q}.fly .moth-root{animation:bob-${u} calc(${sp}*2) ease-in-out infinite}` +
          `@media (prefers-reduced-motion:reduce){${q}.fly *{animation:none!important}}`
        );
      }
      function rigWrap(id, vb, label, defs, root, F, H, B, A, side) {
        const vars = `--fore-base:${F.base};--fore-edge:${F.edge};--hind-base:${H.base};--hind-edge:${H.edge};--body:${B.color};--antenna:${A.color};--eye:${B.eyeColor};--flap-speed:.32s;--flap-amp:.55;--sway:1`;
        return `<svg xmlns="http://www.w3.org/2000/svg" class="moth moth-${id} fly" viewBox="${vb}" style="overflow:visible;${vars}" role="img" aria-label="${label}"><style>${rigCSS(id, side)}</style><defs>${defs}</defs>${root}</svg>`;
      }

      /* ---- side views: stylised profile facing left; right = the same drawing mirrored ---- */
      function sideBody(B, A, id, rnd, org, rig) {
        const tw = B.tw / 2,
          tl = tw * 1.15,
          hw = tw * B.head,
          hl = hw * 0.78,
          a0 = tl * 0.3,
          AL = B.abdLen,
          AW = B.abdW / 2,
          f = nz(rnd),
          J = (a = 1) => (rnd() - 0.5) * org * a,
          vf = paintF(rig),
          vk = paintK(rig),
          tc = (i) =>
            [B.color, mix(B.color, B.alt, 0.3), mix(B.color, "#ffffff", 0.12)][
              i % 3
            ],
          hwid = (t) =>
            AW *
            Math.pow(1 - Math.pow(t, 3.4), 0.5) *
            (1 - B.taper * 0.4 * t) *
            (1 + f(t * 24) * org * 0.05),
          drop = (t) => AL * 0.13 * t * t;
        // abdomen: tapered, drooping, drawn in thorax coordinates, +x = backwards
        const up = [],
          lo = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24,
            h = hwid(t);
          up.push([a0 + AL * t, drop(t) - h]);
          lo.push([a0 + AL * t, drop(t) + h]);
        }
        const abd = pathOf([...up, ...lo.reverse()]);
        let s = `<clipPath id="${id}a"><path d="${abd}"/></clipPath><path d="${abd}" ${vf("body", B.color)}/><g clip-path="url(#${id}a)">`;
        const y0 = -AW * 2,
          hh = AW * 4 + AL * 0.13;
        if (B.stripe.on)
          for (let i = 1; i < 9; i += 2)
            s += `<rect x="${(a0 + (AL * i) / 9).toFixed(1)}" y="${y0.toFixed(1)}" width="${(AL / 9).toFixed(1)}" height="${hh.toFixed(1)}" fill="${B.stripe.c}"/>`;
        if (B.segments)
          for (let i = 1; i < 10; i++) {
            const x = a0 + (AL * i) / 10 + J(AL * 0.02);
            s += `<path d="M${x.toFixed(1)} ${y0.toFixed(1)}L${(x + J(1.5)).toFixed(1)} ${(y0 + hh).toFixed(1)}" stroke="${B.alt}" stroke-width="1.1" opacity=".7"/>`;
          }
        s += "</g>";
        const na = Math.round(12 * B.fuzz);
        for (let i = 0; i < na; i++) {
          const t = 0.04 + (0.42 * i) / na,
            h = hwid(t);
          for (const sg of [1, -1])
            s += `<circle cx="${(a0 + AL * t + J(2)).toFixed(1)}" cy="${(drop(t) + sg * h * (0.95 + rnd() * 0.1)).toFixed(1)}" r="${(AW * 0.2 * (1 + J(0.7))).toFixed(1)}" fill="${tc(i + (sg > 0))}"/>`;
        }
        const abdS = s;
        // thorax: length along x, depth along y
        const ty = tw * (0.95 + 0.25 * (B.shoulder || 0));
        s = `<ellipse rx="${tl}" ry="${ty}" ${B.thoraxColor ? vf("thorax", B.thoraxColor) : vf("body", B.color)}/>`;
        const nt = Math.round(28 * B.fuzz);
        for (let i = 0; i < nt; i++) {
          const a = (Math.PI * 2 * i) / nt + rnd() * 0.2,
            k = 0.92 + rnd() * 0.12;
          s += `<circle cx="${(Math.cos(a) * tl * k).toFixed(1)}" cy="${(Math.sin(a) * ty * k).toFixed(1)}" r="${(tw * 0.24 * (1 + J(0.7))).toFixed(1)}" fill="${tc(i)}"/>`;
        }
        if (B.mark.on)
          s += `<ellipse cy="${-tw * 0.45}" rx="${tl * 0.6}" ry="${tw * 0.35}" fill="${B.mark.c}"/>`;
        const thS = s;
        // head: faces left, one big eye
        const hc = [-(tl + hl * (0.55 - 0.2 * (B.shoulder || 0))), tw * 0.12];
        s = `<ellipse cx="${hc[0]}" cy="${hc[1]}" rx="${hl * 1.05}" ry="${hw}" ${vf("body", B.color)}/>`;
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.5 + i / 8);
          s += `<circle cx="${(hc[0] + Math.cos(a) * hl * 0.95).toFixed(1)}" cy="${(hc[1] + Math.sin(a) * hw * 0.9).toFixed(1)}" r="${(hw * 0.28 * (1 + J(0.5))).toFixed(1)}" fill="${tc(i)}"/>`;
        }
        if (B.eyes) {
          const er = hw * (0.28 + B.eyeSize * 1.5),
            ex = hc[0] - hl * 0.25,
            ey = hc[1] - hw * 0.12;
          s += `<circle cx="${ex}" cy="${ey}" r="${er}" ${vf("eye", B.eyeColor)}/><circle cx="${ex - er * 0.3}" cy="${ey - er * 0.35}" r="${er * 0.25}" fill="#fff" opacity=".55"/>`;
        }
        const headS = s;
        // antennae: near and far
        const ab = [hc[0] - hl * 0.2, hc[1] - hw * 0.85];
        let tipX = hc[0],
          tipY = ab[1];
        const ant = (base, spread) => {
          const a = ((spread + J(8)) * Math.PI) / 180,
            t = [base[0] - Math.sin(a) * A.len, base[1] - Math.cos(a) * A.len],
            pts = qz(base, [base[0] - A.len * 0.1, base[1] - A.len * 0.8], t, 24);
          tipX = Math.min(tipX, t[0]);
          tipY = Math.min(tipY, t[1]);
          return antDraw(pts, A, J, vk);
        };
        const abF = [ab[0] + 0.8, ab[1] - 0.5],
          antNear = ant(ab, A.spread * 0.8),
          antFar = ant(abF, A.spread * 0.8 + 14);
        // legs: three, hanging from the underside
        s = "";
        for (let i = 0; i < 3; i++) {
          const x = -tl * 0.5 + i * tl * 0.5,
            y = ty * 0.8,
            kx = x + (i - 0.6) * 3 + J(3),
            fx = x + (i - 0.3) * 6 + J(3);
          s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}L${kx.toFixed(1)} ${(y + 7).toFixed(1)}L${fx.toFixed(1)} ${(y + 14 + J(2)).toFixed(1)}" stroke="${B.legs.c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        }
        return {
          legs: s,
          abd: abdS,
          thorax: thS,
          head: headS,
          antNear,
          antFar,
          piv: { abd: [a0, 0], head: [-tl, 0], antNear: ab, antFar: abF },
          bb: {
            x1: Math.min(hc[0] - hl * 1.05, tipX),
            x2: a0 + AL,
            y1: Math.min(tipY, -ty),
            y2: Math.max(ty * 0.8 + 17, drop(1) + AW),
          },
          tw,
          tl,
        };
      }
      function sideMoth(O, opt) {
        const rig = !!opt.rig,
          right = O.view === "right",
          org = O.organic,
          sd = O.seed >>> 0 || 1,
          mk = (k) => mulberry(sd * 31 + k),
          id = rig
            ? "m" + sd + O.view
            : "m" + Math.random().toString(36).slice(2, 7),
          F = O.fore,
          H = O.hind,
          A = O.antenna,
          B = O.body,
          Z = sideBody(B, A, id, mk(30), org, rig),
          tw = Z.tw,
          tl = Z.tl;
        // near wing (s=0) hangs over the body; far wing (s=1) sits slightly higher, darker, behind
        const W = [0, 1].map((s) => {
          const fs = foreShape(F, org, mk(1 + s * 2)),
            hs = hindShape(H, org, mk(2 + s * 2));
          return {
            fs,
            hs,
            fw: wingSVG(fs, F, id + "f" + s, org, mk(5), mk(11 + s), rig ? "fore" : undefined),
            hw: wingSVG(hs, H, id + "h" + s, org, mk(6), mk(13 + s), rig ? "hind" : undefined),
          };
        });
        const m = [
            [0.92, 0.2, 0, 0.6],
            [0.92, 0.15, 0, 0.58],
          ],
          fpos = [
            [-tl * 0.45, -tw * 0.7],
            [-tl * 0.45 + 1.5, -tw * 0.7 - 2.5],
          ],
          hpos = [
            [tl * 0.3, -tw * 0.55],
            [tl * 0.3 + 1.5, -tw * 0.55 - 2.5],
          ];
        const wg = (w, cls, s, pos) =>
          `<g transform="translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)})"><g class="wing ${cls} ${s ? "far" : "near"}"><g transform="matrix(${m[s].join(" ")} 0 0)">${w.body}${s ? `<path class="w-shade" d="${w.d}" fill="#000" opacity=".22"/>` : ""}</g></g></g>`;
        const bb = { ...Z.bb },
          ext = (pts, pos, k) =>
            pts.forEach((p) => {
              const x = pos[0] + m[k][0] * p[0],
                y = pos[1] + m[k][1] * p[0] + m[k][3] * p[1];
              bb.x1 = Math.min(bb.x1, x);
              bb.x2 = Math.max(bb.x2, x);
              bb.y1 = Math.min(bb.y1, y);
              bb.y2 = Math.max(bb.y2, y);
            });
        [0, 1].forEach((s) => {
          ext(W[s].fs.pts, fpos[s], s);
          ext(W[s].hs.pts, hpos[s], s);
        });
        const P = Z.piv,
          body = `<g class="body">${part("antenna far", P.antFar, Z.antFar)}<g class="legs">${Z.legs}</g>${part("abdomen", P.abd, Z.abd)}<g class="thorax">${Z.thorax}</g>${part("head", P.head, Z.head)}${part("antenna near", P.antNear, Z.antNear)}</g>`,
          inner =
            wg(W[1].hw, "wing-hind", 1, hpos[1]) +
            wg(W[1].fw, "wing-fore", 1, fpos[1]) +
            body +
            wg(W[0].hw, "wing-hind", 0, hpos[0]) +
            wg(W[0].fw, "wing-fore", 0, fpos[0]),
          root = `<g class="moth-root">${inner}</g>`,
          mirrored = right
            ? `<g class="moth-mirror" transform="scale(-1 1)">${root}</g>`
            : root,
          pad = 14,
          x1 = right ? -bb.x2 : bb.x1,
          x2 = right ? -bb.x1 : bb.x2,
          vb = `${(x1 - pad).toFixed(1)} ${(bb.y1 - pad).toFixed(1)} ${(x2 - x1 + 2 * pad).toFixed(1)} ${(bb.y2 - bb.y1 + 2 * pad).toFixed(1)}`,
          wdefs = W.map((q) => q.fw.defs + q.hw.defs).join(""),
          label = `Moth, ${O.view} view`;
        if (rig) return rigWrap(id, vb, label, wdefs, mirrored, F, H, B, A, true);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${label}"><defs>${wdefs}<filter id="sh${id}" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="0" dy="1.8" stdDeviation="2.2" flood-color="#000" flood-opacity=".25"/></filter></defs><g filter="url(#sh${id})">${mirrored}</g></svg>`;
      }

      /* ---- random species: category archetypes. seed + style -> the same moth every time ---- */
      const hx = (h, s, l) => {
        h = ((h % 360) + 360) % 360;
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l),
          f = (n) => {
            const k = (n + h / 30) % 12;
            return Math.round(
              255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
            );
          };
        return (
          "#" +
          [f(0), f(8), f(4)]
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("")
        );
      };
      const CATS = [
        "Any",
        "Cool",
        "Cute",
        "Cryptic",
        "Showy",
        "Spooky",
        "Elegant",
        "Eyespot",
        "Classic species",
      ];
      const hsl2 = (c) => {
        const [r, g, b] = hex2(c).map((v) => v / 255),
          x = Math.max(r, g, b),
          n = Math.min(r, g, b),
          d = x - n,
          l = (x + n) / 2;
        let h = 0;
        if (d)
          h =
            x === r
              ? ((g - b) / d + 6) % 6
              : x === g
                ? (b - r) / d + 2
                : (r - g) / d + 4;
        return [h * 60, d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l * 100];
      };
      const rot = (c, d) => {
        const [h, s, l] = hsl2(c);
        return hx(h + d, s, l);
      };
      function randomMoth(seed, cat = "Any") {
        const r = mulberry(seed * 7919 + 13),
          Rn = (a, b) => a + (b - a) * r(),
          P = (a) => a[Math.floor(r() * a.length)],
          Y = (p) => r() < p,
          I = (a, b) => Math.round(Rn(a, b));
        if (cat === "Any")
          cat = P([
            "Cool",
            "Cool",
            "Cool",
            "Cute",
            "Cute",
            "Cryptic",
            "Showy",
            "Showy",
            "Spooky",
            "Elegant",
            "Elegant",
            "Eyespot",
            "Eyespot",
            "Classic species",
            "Classic species",
          ]);
        randomMoth.last = cat;
        if (cat === "Classic species") {
          const n = P(Object.keys(MOTHS)),
            ex = Y(0.3);
          let o = structuredClone(MOTHS[n]);
          randomMoth.last = cat + ": " + n + (ex ? "" : " cousin");
          if (!ex) {
            o = tint(o, (c) => rot(c, Rn(-35, 35)));
            o.fore = dm(o.fore, {
              chord: (o.fore.chord || 44) * Rn(0.92, 1.08),
              sweep: (o.fore.sweep ?? 0.14) * Rn(0.8, 1.2),
            });
          }
          return constrain(full({ ...o, seed }));
        }
        const V = (x, d) => {
          x = x ?? d;
          return Array.isArray(x) ? Rn(...x) : x;
        };
        const geo = (o = {}) => {
          const hl = V(o.hl, [58, 84]);
          return {
            fore: {
              chord: V(o.chord, [34, 56]),
              sweep: V(o.sweep, [0.06, 0.26]),
              hook: Y(o.hookP ?? 0.2) ? Rn(0.2, 0.7) : 0,
              bulge: V(o.bulge, [0.1, 0.35]),
              tx: V(o.tx, [0.74, 0.9]),
              costal: V(o.costal, [0.15, 0.4]),
              apex: V(o.apex, [-0.3, 0.5]),
              tornus: V(o.tornus, [-0.3, 0.4]),
              teeth: Y(o.teethP ?? 0.08) ? P([3, 4, 5, 6]) : 0,
              tooth: Rn(1, 2.2),
              tilt: Rn(8, 20),
              oblique: Rn(0.15, 0.5),
            },
            hind: {
              len: hl,
              chord: hl * V(o.hr, [0.75, 1]),
              round: Rn(0.2, 0.9),
              tail: Y(o.tailP ?? 0.08) ? hl * Rn(0.4, 1) : 0,
              tw: Rn(3, 5),
              curl: Rn(-0.2, 0.4),
              tilt: Rn(8, 18),
              apex: V(o.hapex, [-0.3, 0.4]),
              anal: V(o.anal, [-0.3, 0.4]),
              tailPos: Rn(0.5, 0.68),
            },
            body: {
              tw: V(o.tw, [11, 18]),
              abdLen: V(o.abdLen, [46, 80]),
              head: V(o.head, [0.5, 0.62]),
              eyeSize: V(o.eye, [0.11, 0.2]),
              taper: Rn(0.3, 0.8),
              fuzz: V(o.fuzz, [0.7, 1.6]),
            },
            antenna: {
              type: P(o.ant || ["thread", "thread", "serrate", "feather"]),
              len: V(o.al, [28, 46]),
              spread: Rn(20, 40),
              barb: 5,
            },
          };
        };
        const mk = (g, f, h, b, a) =>
          constrain(
            full({
              seed,
              fore: { ...g.fore, ...f },
              hind: { ...g.hind, ...h },
              body: { ...g.body, abdW: g.body.tw * Rn(0.6, 0.9), ...b },
              antenna: { ...g.antenna, ...a },
            }),
          );
        const ln = (n, u0, u1, w, c, wv, fq, sk) =>
          Array.from({ length: n }, (_, i) =>
            bd(
              n > 1 ? u0 + ((u1 - u0) * i) / (n - 1) : u0,
              w,
              c,
              sk ?? Rn(-0.25, 0.25),
              wv,
              fq,
              w * Rn(0.8, 1.3),
            ),
          );
        const scatter = (n, u0, u1, v0, v1, rx, ry, c, ring, o) =>
          Array.from({ length: n }, () =>
            sp(
              Rn(u0, u1),
              Rn(v0, v1),
              V(rx),
              V(ry),
              c,
              ring,
              o || 1,
              Rn(-40, 40),
            ),
          );
        let h, g, base, dk, lt, mid;
        if (cat === "Cool") {
          h = Rn(0, 360);
          const dark = Y(0.65);
          g = geo({
            chord: [40, 56],
            sweep: [0.12, 0.28],
            hookP: 0.35,
            tailP: 0.3,
            ant: ["feather", "feather", "serrate"],
          });
          base = dark
            ? hx(h, Rn(20, 50), Rn(7, 16))
            : hx(h, Rn(55, 80), Rn(30, 44));
          const a = hx(h + P([150, 180, 210]), Rn(70, 95), Rn(50, 62)),
            b = hx(h + P([30, 60, -40]), Rn(75, 95), Rn(52, 64)),
            pale = hx(h + Rn(-20, 20), 15, 94),
            edge = hx(h, 40, dark ? 5 : 18);
          const f = {
            base,
            edge,
            fringe: { on: false, len: 0.5, c: pale },
            bands: ln(
              I(2, 3),
              0.22,
              0.66,
              Rn(0.025, 0.045),
              a,
              Rn(2, 5),
              Rn(6, 10),
              Rn(-0.15, 0.15),
            ).map((x, i) => (i % 2 ? { ...x, c: b } : x)),
            spots: Y(0.5) ? [sp(0.5, Rn(0.3, 0.5), 0.03, 0.045, pale)] : [],
          };
          if (Y(0.55)) f.margin = M(Rn(2, 4), P([pale, b]));
          if (Y(0.35)) f.grad = { on: true, c: a };
          if (Y(0.3)) f.costalBand = M(Rn(3, 6), b);
          const hd = {
            base: Y(0.6)
              ? hx(h + P([180, 30, -30, 60]), Rn(80, 95), Rn(48, 58))
              : mix(base, a, 0.25),
            edge,
            fringe: { on: false, len: 0.5, c: pale },
            margin: M(Rn(3, 8), dark ? edge : pale),
          };
          if (Y(0.5))
            hd.spots = [
              sp(
                Rn(0.45, 0.65),
                Rn(0.5, 0.65),
                Rn(0.12, 0.22),
                Rn(0.1, 0.16),
                a,
              ),
              sp(Rn(0.6, 0.8), Rn(0.25, 0.4), 0.07, 0.08, b),
            ];
          else hd.eyes = [E(0.45, 0.5, Rn(0.14, 0.2), [edge, b, edge, pale])];
          if (Y(0.4)) hd.bands = ln(I(1, 2), 0.2, 0.35, 0.04, a, 3, 8);
          return mk(
            g,
            f,
            hd,
            {
              color: dark ? mix(base, a, 0.15) : mix(base, pale, 0.2),
              alt: a,
              stripe: { on: Y(0.5), c: b },
            },
            { color: edge },
          );
        }
        if (cat === "Cute") {
          h = P([340, 50, 20, 270, 150, 200, 10]);
          const s = Rn(55, 85);
          g = geo({
            chord: [46, 60],
            sweep: [0.03, 0.12],
            hookP: 0,
            bulge: [0.25, 0.4],
            apex: [-0.7, -0.3],
            tornus: [-0.6, -0.2],
            hl: [56, 70],
            hr: [0.92, 1.06],
            hapex: [-0.6, -0.3],
            anal: [-0.6, -0.3],
            tailP: 0,
            teethP: 0,
            tw: [15, 19],
            abdLen: [38, 50],
            head: [0.6, 0.66],
            eye: [0.18, 0.26],
            fuzz: [1.7, 2.2],
            al: [22, 30],
            ant: ["feather", "feather", "thread"],
          });
          base = hx(h, s, Rn(72, 84));
          const c2 = hx(h + P([40, -40, 180, 120]), s, Rn(78, 88));
          dk = hx(h, s * 0.8, Rn(55, 65));
          lt = hx(h, s * 0.5, 94);
          const f = {
            base,
            edge: dk,
            fringe: { on: false, len: Rn(0.6, 1.1), c: lt },
            margin: M(Rn(3, 6), c2),
            spots: scatter(
              I(2, 4),
              0.25,
              0.8,
              0.25,
              0.75,
              [0.025, 0.04],
              [0.05, 0.08],
              P([lt, c2]),
            ),
          };
          if (Y(0.5)) f.grad = { on: true, c: c2 };
          return mk(
            g,
            f,
            {
              base: c2,
              edge: dk,
              fringe: { on: false, len: Rn(0.6, 1.1), c: lt },
              margin: M(Rn(3, 6), base),
            },
            {
              color: mix(c2, "#ffffff", 0.2),
              alt: mix(base, c2, 0.5),
              eyeColor: "#2a1c1c",
              legs: { c: dk },
            },
            { color: dk },
          );
        }
        if (cat === "Cryptic") {
          const k = P(["bark", "bark", "lichen", "leaf", "birch", "sand"]),
            lf = k === "leaf";
          g = geo({
            chord: lf ? [38, 50] : [36, 54],
            sweep: lf ? [0.2, 0.3] : [0.06, 0.2],
            hookP: lf ? 1 : 0.1,
            teethP: lf ? 0.4 : 0.08,
            tailP: 0,
            ant: ["thread", "serrate", "feather"],
          });
          h = {
            bark: Rn(20, 40),
            lichen: Rn(70, 110),
            leaf: Rn(22, 38),
            birch: Rn(30, 50),
            sand: Rn(35, 48),
          }[k];
          const s = {
              bark: Rn(8, 25),
              lichen: Rn(8, 22),
              leaf: Rn(35, 55),
              birch: Rn(5, 15),
              sand: Rn(25, 45),
            }[k],
            l = {
              bark: Rn(30, 50),
              lichen: Rn(55, 72),
              leaf: Rn(34, 48),
              birch: Rn(88, 95),
              sand: Rn(68, 80),
            }[k];
          base = hx(h, s, l);
          dk = hx(h, s + 10, Math.max(l * 0.3, 8));
          mid = hx(h, s, l * 0.7);
          lt = hx(h, s * 0.6, Math.min(l + 22, 96));
          const f = {
              base,
              edge: mid,
              fringe: { on: false, len: 0.4, c: lt },
              veins: { on: lf || Y(0.3), c: mid },
              bands: [],
              spots: [],
            },
            hb = mix(base, lt, 0.5);
          if (lf) {
            f.bands = [
              bd(0.5, 0.03, dk, P([-0.5, 0.5]), 2, 9, 0.025),
              ...ln(3, 0.3, 0.75, 0.012, mid, 2, 9, P([-0.5, 0.5])),
            ];
            f.speck = SK(I(20, 50), 0.012, mid);
          } else {
            f.bands = ln(
              I(2, 3),
              0.25,
              0.7,
              Rn(0.015, 0.03),
              dk,
              Rn(3, 7),
              Rn(7, 13),
            );
            f.spots = [
              sp(0.4, 0.35, 0.03, 0.05, lt, dk),
              sp(0.55, 0.45, 0.025, 0.04, lt, dk),
            ];
            if (k !== "sand" || Y(0.5))
              f.speck = SK(I(60, 150), Rn(0.008, 0.016), dk);
            if (k === "lichen")
              f.spots.push(
                ...scatter(
                  4,
                  0.2,
                  0.8,
                  0.2,
                  0.8,
                  [0.07, 0.13],
                  [0.08, 0.2],
                  hx(h + Rn(10, 40), s + 15, l - 12),
                  "",
                  0.5,
                ),
              );
            if (Y(0.4)) f.costalBand = M(Rn(3, 6), mid);
          }
          return mk(
            g,
            f,
            {
              base: hb,
              edge: mid,
              fringe: { on: false, len: 0.4, c: lt },
              bands: ln(1, 0.55, 0.55, 0.02, dk, 4, 10),
              speck: SK(I(20, 70), 0.01, dk),
            },
            { color: Y(0.5) ? mid : base, alt: dk, stripe: { on: false } },
            { color: dk },
          );
        }
        if (cat === "Showy") {
          const k = P(["tiger", "burnet", "harlequin"]);
          dk = hx(P([230, 270, 20]), 25, 12);
          h = P([2, 12, 25, 45]);
          const pop = hx(h, Rn(80, 95), Rn(48, 56)),
            cream = hx(Rn(38, 55), Rn(30, 55), Rn(88, 94));
          g = geo({
            chord: [32, 46],
            sweep: [0.08, 0.16],
            hookP: 0,
            hl: [58, 70],
            tailP: 0,
            ant: ["thread", "serrate", "feather"],
          });
          let f, hd;
          if (k === "tiger") {
            const br = hx(Rn(15, 30), Rn(40, 60), Rn(18, 28));
            f = {
              base: cream,
              edge: br,
              fringe: { on: false, len: 0.5, c: br },
              spots: scatter(
                I(4, 6),
                0.2,
                0.85,
                0.15,
                0.85,
                [0.05, 0.1],
                [0.08, 0.14],
                br,
              ),
            };
            hd = {
              base: pop,
              edge: dk,
              spots: scatter(
                I(3, 5),
                0.25,
                0.8,
                0.25,
                0.8,
                [0.05, 0.08],
                [0.07, 0.1],
                hx(225, 50, 20),
                dk,
              ),
            };
          } else if (k === "burnet") {
            f = {
              base: dk,
              edge: dk,
              costalBand: { on: Y(0.5), w: 5, c: pop },
              spots: scatter(
                I(3, 5),
                0.25,
                0.85,
                0.35,
                0.9,
                [0.05, 0.07],
                [0.07, 0.09],
                pop,
              ),
            };
            hd = { base: pop, edge: dk, margin: M(Rn(4, 6), dk) };
          } else {
            f = {
              base: dk,
              edge: dk,
              margin: M(2.5, cream),
              bands: [
                bd(
                  Rn(0.3, 0.5),
                  Rn(0.08, 0.14),
                  cream,
                  Rn(-0.2, 0.2),
                  2,
                  9,
                  0.12,
                ),
              ],
              spots: scatter(2, 0.6, 0.85, 0.2, 0.7, 0.05, 0.07, pop),
            };
            hd = {
              base: hx(Rn(42, 55), 90, 56),
              edge: dk,
              margin: M(Rn(6, 9), dk),
              bands: ln(1, 0.5, 0.5, 0.06, dk, 3, 8),
            };
          }
          return mk(
            g,
            f,
            hd,
            {
              color: dk,
              alt: mix(dk, pop, 0.3),
              stripe: { on: true, c: k === "tiger" ? pop : cream },
            },
            { color: dk },
          );
        }
        if (cat === "Spooky") {
          const k = P(["night", "bone"]);
          h = P([270, 0, 160, 330]);
          const glow = P(["#d8202a", "#7ad04a", "#b05cf0"]),
            bone = hx(45, 25, 88);
          dk = hx(h, Rn(10, 35), Rn(8, 15));
          g = geo({
            chord: [42, 56],
            sweep: [0.16, 0.3],
            hookP: 0.6,
            tailP: 0.1,
            hl: [62, 84],
            ant: ["feather", "serrate"],
            tw: [14, 19],
          });
          let f, hd;
          if (k === "night") {
            f = {
              base: dk,
              edge: "#050505",
              grad: { on: true, c: mix(dk, glow, 0.3) },
              fringe: { on: false, len: 0.5, c: mix(dk, bone, 0.4) },
              bands: ln(2, 0.25, 0.62, 0.015, bone, Rn(3, 6), Rn(8, 12)),
              spots: [
                sp(0.5, 0.4, 0.025, 0.04, bone),
                sp(0.62, 0.5, 0.02, 0.03, bone),
              ],
              veins: { on: Y(0.4), c: mix(dk, bone, 0.3) },
            };
            hd = {
              base: mix(dk, glow, 0.15),
              edge: "#050505",
              margin: M(6, dk),
              eyes: [E(0.45, 0.5, Rn(0.16, 0.22), [dk, glow, dk, bone])],
            };
          } else {
            f = {
              base: bone,
              edge: dk,
              bands: ln(3, 0.25, 0.7, Rn(0.03, 0.06), dk, Rn(3, 6), Rn(7, 11)),
              speck: SK(I(40, 90), 0.012, dk),
              spots: [sp(0.45, 0.4, 0.03, 0.05, glow, dk)],
            };
            hd = {
              base: mix(dk, bone, 0.2),
              edge: dk,
              spots: scatter(3, 0.3, 0.8, 0.3, 0.8, 0.05, 0.07, bone),
              margin: M(5, dk),
            };
          }
          return mk(
            g,
            f,
            hd,
            {
              color: k === "bone" ? bone : dk,
              alt: mix(dk, glow, 0.3),
              mark: { on: true, c: bone },
              stripe: { on: Y(0.5), c: glow },
            },
            { color: mix(dk, bone, 0.55) },
          );
        }
        if (cat === "Elegant") {
          h = P([140, 170, 200, 280, 40, 20, 60]);
          g = geo({
            chord: [32, 44],
            sweep: [0.14, 0.28],
            hookP: 0.3,
            tailP: 1,
            hl: [64, 84],
            hr: [0.7, 0.85],
            anal: 0,
            ant: ["feather"],
            al: [34, 46],
            abdLen: [56, 72],
          });
          g.hind.tail = g.hind.len * Rn(0.7, 1.15);
          base = hx(h, Rn(35, 65), Rn(78, 88));
          const ac = hx(h + P([150, 180, -40, 40]), Rn(35, 60), Rn(30, 42)),
            lt2 = hx(h, 25, 95),
            cb = Y(0.6);
          const eyes = (n) => [
            E(0.5, 0.4, 0.07, [ac, hx(50, 80, 78), lt2, "#9ec7ee"]),
          ];
          const f = {
            base,
            edge: mix(base, ac, 0.4),
            veins: { on: true, c: mix(base, ac, 0.35) },
            fringe: { on: false, len: 0.4, c: lt2 },
            eyes: Y(0.7) ? eyes() : [],
          };
          if (cb) f.costalBand = M(Rn(3, 6), ac);
          if (Y(0.4)) f.grad = { on: true, c: lt2 };
          return mk(
            g,
            f,
            {
              base,
              edge: mix(base, ac, 0.4),
              veins: { on: true, c: mix(base, ac, 0.35) },
              margin: Y(0.6) ? M(2.5, ac) : { on: false },
              eyes: Y(0.7)
                ? [E(0.45, 0.4, 0.08, [ac, hx(50, 80, 78), lt2, "#9ec7ee"])]
                : [],
            },
            {
              color: mix(lt2, base, 0.3),
              alt: mix(base, "#ffffff", 0.5),
              fuzz: 1.3,
            },
            { color: mix(base, ac, 0.5) },
          );
        }
        // Eyespot
        h = P([25, 40, 55, 15, 80, 340]);
        g = geo({
          chord: [40, 56],
          hookP: 0.1,
          hl: [62, 80],
          hr: [0.85, 1.05],
          tailP: 0.05,
          ant: ["feather", "serrate", "thread"],
        });
        base = hx(h, Rn(35, 65), Rn(40, 60));
        dk = hx(h, 45, 10);
        const hb = hx(h + Rn(-15, 15), Rn(55, 85), Rn(52, 66)),
          rc = () => [
            dk,
            hx(h + Rn(20, 50), 85, 62),
            hx(h, 45, 12),
            P(["#ffffff", "#9ec7ee", "#f6e6a0"]),
          ];
        const f = {
          base,
          edge: mix(base, dk, 0.5),
          fringe: { on: false, len: 0.5, c: hx(h, 30, 85) },
          bands: ln(I(1, 2), 0.3, 0.65, 0.025, dk, Rn(3, 6), Rn(7, 12)),
          eyes: Y(0.55) ? [E(0.5, 0.4, Rn(0.06, 0.09), rc())] : [],
          margin: Y(0.4) ? M(3, mix(base, dk, 0.4)) : { on: false },
        };
        if (Y(0.4)) f.grad = { on: true, c: hx(h + 20, 50, 30) };
        return mk(
          g,
          f,
          {
            base: hb,
            edge: mix(hb, dk, 0.5),
            margin: M(Rn(3, 5), mix(hb, dk, 0.3)),
            eyes: Y(0.5)
              ? [E(0.42, 0.5, Rn(0.16, 0.24), rc())]
              : [E(0.45, 0.3, 0.12, rc()), E(0.45, 0.72, 0.1, rc())],
          },
          { color: mix(base, dk, 0.3), alt: mix(hb, dk, 0.2) },
          { color: dk },
        );
      }

      /* ---- personality quiz: answers -> style (scored) + seed (hash) + palette hue. Pure + deterministic ---- */
      const QZ = [
        {
          k: "eve",
          q: "Your ideal evening?",
          o: [
            ["Blanket, snacks, a favourite show", { Cute: 2, Cryptic: 1 }],
            ["A loud night out", { Showy: 2, Cool: 1 }],
            ["A long walk alone after dark", { Spooky: 2, Elegant: 1 }],
            ["Making something with your hands", { Eyespot: 2, Cryptic: 1 }],
          ],
        },
        {
          k: "grp",
          q: "In a group, you’re usually…",
          o: [
            ["The one making everyone laugh", { Showy: 2, Cute: 1 }],
            ["Quietly observing", { Cryptic: 2, Spooky: 1 }],
            ["The calm planner", { Elegant: 2, Eyespot: 1 }],
            ["The wildcard", { Cool: 2, Eyespot: 1 }],
          ],
        },
        {
          k: "plc",
          q: "Pick a place",
          o: [
            ["Misty pine forest", { Cryptic: 2, Elegant: 1 }],
            ["Neon city at night", { Cool: 2, Showy: 1 }],
            ["Sunlit meadow", { Cute: 2, Elegant: 1 }],
            ["Moonlit ruins", { Spooky: 2, Cryptic: 1 }],
          ],
        },
        {
          k: "bad",
          q: "When things go wrong, you…",
          o: [
            ["Laugh and improvise", { Showy: 1, Cool: 1 }],
            ["Retreat and recharge", { Cryptic: 1, Cute: 1 }],
            ["Make a plan", { Elegant: 2 }],
            ["Bluff and stand tall", { Eyespot: 2, Spooky: 1 }],
          ],
        },
        {
          k: "wrd",
          q: "Pick a word",
          o: [
            ["Gentle", { Cute: 2 }],
            ["Magnetic", { Cool: 2 }],
            ["Mysterious", { Spooky: 2 }],
            ["Graceful", { Elegant: 2 }],
            ["Unassuming", { Cryptic: 2 }],
            ["Bold", { Showy: 2 }],
            ["Playful", { Eyespot: 2 }],
          ],
        },
      ];
      const HUES = [
          ["Red", 5],
          ["Orange", 28],
          ["Yellow", 50],
          ["Green", 130],
          ["Blue", 215],
          ["Violet", 280],
          ["Pink", 330],
          ["No preference", null],
        ],
        QCATS = [
          "Cool",
          "Cute",
          "Cryptic",
          "Showy",
          "Spooky",
          "Elegant",
          "Eyespot",
        ];
      function personal(A, hue, name) {
        const sc = {};
        QZ.forEach((q) => {
          const i = A[q.k];
          if (i != null)
            for (const [c, v] of Object.entries(q.o[i][1]))
              sc[c] = (sc[c] || 0) + v;
        });
        const key = JSON.stringify([
            QZ.map((q) => A[q.k] ?? -1),
            hue,
            (name || "").trim().toLowerCase(),
          ]),
          seed = seedOf(key),
          r = mulberry(seed);
        let best = "Cool",
          bv = -1;
        for (const c of QCATS) {
          const v = (sc[c] || 0) + r() * 0.5;
          if (v > bv) {
            bv = v;
            best = c;
          }
        }
        let m = randomMoth(seed, best);
        if (hue != null) {
          const [h, s] = hsl2(m.fore.base);
          if (s > 12) {
            const d = hue - h;
            m = tint(m, (c) => rot(c, d));
          }
        }
        return { m: constrain(full(m)), cat: best, seed, key, sc };
      }

      /* ---- species presets ---- */
      const MOTHS = {
        "Rosy maple moth": {
          fore: {
            chord: 56,
            sweep: 0.1,
            bulge: 0.3,
            tx: 0.82,
            costal: 0.2,
            apex: -0.5,
            tornus: -0.4,
            base: "#ec7fa5",
            edge: "#c25a82",
            fringe: { on: false, len: 0.5, c: "#f6c3d3" },
            bands: [bd(0.48, 0.1, "#f8e47c", 0.05, 0, 9, 0.46)],
          },
          hind: {
            len: 70,
            chord: 62,
            round: 0.5,
            apex: -0.4,
            anal: -0.4,
            base: "#f8e47c",
            edge: "#d9b85a",
            margin: M(3.5, "#f2a6bf"),
            fringe: { on: false, len: 0.5, c: "#f6c3d3" },
          },
          body: {
            tw: 17,
            abdW: 15,
            abdLen: 46,
            head: 0.62,
            eyeSize: 0.12,
            taper: 0.35,
            fuzz: 1.9,
            color: "#f8e47c",
            alt: "#f0a9c0",
            legs: { on: true, c: "#ee86a8" },
          },
          antenna: {
            type: "feather",
            len: 28,
            spread: 34,
            barb: 5,
            color: "#ee86a8",
          },
        },
        "Luna moth": {
          fore: {
            chord: 40,
            sweep: 0.2,
            hook: 0.1,
            bulge: 0.2,
            tx: 0.84,
            apex: 0.3,
            base: "#bfe0a8",
            edge: "#8aa070",
            costalBand: M(6, "#7a4b5c"),
            veins: { on: true, c: "#7f9a68" },
            fringe: { on: false, len: 0.4, c: "#e9f3d9" },
            eyes: [E(0.5, 0.4, 0.07, ["#6b3b6b", "#f2e38a", "#e8f1f4"])],
          },
          hind: {
            len: 62,
            chord: 46,
            tail: 80,
            tw: 5,
            curl: 0.3,
            tilt: 14,
            base: "#bfe0a8",
            edge: "#8aa070",
            margin: M(2.5, "#8d6a6a"),
            veins: { on: true, c: "#7f9a68" },
            eyes: [E(0.45, 0.4, 0.08, ["#6b3b6b", "#f2e38a", "#e8f1f4"])],
          },
          body: {
            tw: 15,
            abdW: 13,
            abdLen: 66,
            fuzz: 1.3,
            color: "#f4f1e6",
            alt: "#e0dccb",
          },
          antenna: {
            type: "feather",
            len: 36,
            barb: 8,
            spread: 38,
            color: "#a89878",
          },
        },
        "Atlas moth": {
          fore: {
            chord: 56,
            sweep: 0.26,
            hook: 0.55,
            bulge: 0.22,
            tx: 0.74,
            apex: 0.6,
            base: "#b0552a",
            edge: "#5a2214",
            margin: M(6, "#e9c48c"),
            bands: [
              bd(0.22, 0.05, "#e9dcc8", 0.1, 6),
              bd(0.6, 0.07, "#3a1a12", 0.1, 5),
            ],
            spots: [
              sp(0.32, 0.42, 0.11, 0.16, "#fff7e6", "#2a120c", 0.9, 15),
              sp(0.88, 0.12, 0.04, 0.08, "#2a120c"),
            ],
          },
          hind: {
            len: 82,
            chord: 66,
            round: 0.4,
            tilt: 14,
            apex: -0.2,
            base: "#b8602f",
            edge: "#5a2214",
            margin: M(6, "#e9c48c"),
            bands: [bd(0.62, 0.08, "#e9dcc8", 0.2, 5)],
            spots: [sp(0.3, 0.5, 0.1, 0.15, "#fff7e6", "#2a120c", 0.9, 10)],
          },
          body: {
            tw: 20,
            abdW: 18,
            abdLen: 60,
            color: "#7a3b22",
            alt: "#a05a38",
            stripe: { on: true, c: "#e9dcc8" },
            fuzz: 1.6,
          },
          antenna: {
            type: "feather",
            len: 40,
            barb: 9,
            spread: 40,
            color: "#4a2a1e",
          },
        },
        "Polyphemus moth": {
          fore: {
            chord: 54,
            sweep: 0.1,
            bulge: 0.3,
            tx: 0.82,
            apex: -0.4,
            tornus: -0.3,
            base: "#d9a867",
            edge: "#8a5a30",
            bands: [
              bd(0.26, 0.03, "#e9a9a3", 0.15, 4),
              bd(0.72, 0.03, "#8a5a78", 0.1, 4),
            ],
            spots: [sp(0.48, 0.42, 0.045, 0.07, "#f6e8c8", "#3a2a22", 0.9)],
          },
          hind: {
            len: 74,
            chord: 70,
            tilt: 16,
            apex: -0.4,
            anal: -0.3,
            base: "#d9a867",
            edge: "#8a5a30",
            eyes: [
              E(0.42, 0.5, 0.2, ["#2a2420", "#f0cf5e", "#2a2420", "#86b3da"]),
            ],
          },
          body: {
            tw: 17,
            abdW: 15,
            abdLen: 58,
            color: "#b07840",
            alt: "#c9955a",
            fuzz: 1.4,
          },
          antenna: {
            type: "feather",
            len: 36,
            barb: 9,
            spread: 36,
            color: "#6a4a2a",
          },
        },
        "Io moth": {
          fore: {
            chord: 40,
            sweep: 0.1,
            bulge: 0.3,
            tx: 0.82,
            apex: -0.3,
            base: "#e8be46",
            edge: "#8a5a20",
            bands: [bd(0.4, 0.06, "#c97a3a", 0.2, 3)],
            spots: [sp(0.55, 0.45, 0.03, 0.05, "#f6e8b0", "#8a5a20")],
          },
          hind: {
            len: 66,
            chord: 56,
            tilt: 14,
            base: "#f1d04a",
            edge: "#8a5a20",
            bands: [bd(0.85, 0.05, "#6b3a2a", 0.1, 2)],
            eyes: [E(0.45, 0.5, 0.22, ["#1c1818", "#b5c4e0", "#1c1818"])],
          },
          body: {
            tw: 13,
            abdW: 11,
            abdLen: 56,
            color: "#e0a83a",
            alt: "#c98a2a",
            fuzz: 1.3,
          },
          antenna: {
            type: "feather",
            len: 28,
            barb: 6,
            spread: 34,
            color: "#5a3a1a",
          },
        },
        "Cinnabar moth": {
          fore: {
            chord: 32,
            sweep: 0.1,
            bulge: 0.2,
            tx: 0.88,
            base: "#2d2a33",
            edge: "#15131a",
            costalBand: M(5, "#d42a2f"),
            spots: [
              sp(0.5, 0.8, 0.07, 0.08, "#d42a2f"),
              sp(0.82, 0.68, 0.05, 0.07, "#d42a2f"),
            ],
          },
          hind: {
            len: 62,
            chord: 44,
            tilt: 10,
            anal: 0.3,
            base: "#d42a2f",
            edge: "#2d2a33",
            margin: M(5, "#2d2a33"),
          },
          body: {
            tw: 12,
            abdW: 9,
            abdLen: 62,
            color: "#2d2a33",
            alt: "#3f3b47",
            stripe: { on: true, c: "#d42a2f" },
            fuzz: 0.8,
          },
          antenna: { type: "thread", len: 34, color: "#2d2a33" },
        },
        "Sunset moth": {
          fore: {
            chord: 40,
            sweep: 0.1,
            bulge: 0.2,
            tx: 0.85,
            apex: 0.3,
            base: "#16181f",
            edge: "#0a0b0f",
            margin: M(3, "#f3f1ea"),
            bands: [
              bd(0.22, 0.045, "#2fcf9f", 0.2, 3),
              bd(0.42, 0.05, "#27b8c8", 0.2, 3),
              bd(0.63, 0.04, "#2fcf9f", 0.15, 3),
            ],
          },
          hind: {
            len: 74,
            chord: 56,
            round: 0.4,
            tail: 55,
            tw: 4,
            curl: 0.15,
            tilt: 14,
            base: "#16181f",
            edge: "#0a0b0f",
            margin: M(4, "#f3f1ea"),
            bands: [bd(0.2, 0.05, "#2fcf9f", 0.1, 3)],
            spots: [
              sp(0.55, 0.62, 0.2, 0.18, "#f08a24"),
              sp(0.7, 0.35, 0.1, 0.1, "#e24a2a"),
            ],
          },
          body: {
            tw: 12,
            abdW: 10,
            abdLen: 66,
            color: "#20242b",
            alt: "#343a44",
            stripe: { on: true, c: "#f3f1ea" },
          },
          antenna: { len: 40, color: "#222222" },
        },
        "Giant leopard moth": {
          fore: {
            chord: 38,
            sweep: 0.1,
            bulge: 0.25,
            tx: 0.84,
            base: "#f5f2ea",
            edge: "#2a2a33",
            speck: SK(22, 0.03, "#1f3550", "#111111"),
          },
          hind: {
            len: 66,
            chord: 50,
            tilt: 12,
            base: "#f5f2ea",
            edge: "#2a2a33",
            speck: SK(12, 0.03, "#1f3550", "#111111"),
          },
          body: {
            tw: 15,
            abdW: 13,
            abdLen: 66,
            color: "#1f3a5c",
            alt: "#2c4f7c",
            stripe: { on: true, c: "#e48a2e" },
            fuzz: 1.1,
          },
          antenna: {
            type: "feather",
            len: 30,
            barb: 5,
            spread: 34,
            color: "#222222",
          },
        },
        "Peppered moth": {
          fore: {
            chord: 42,
            sweep: 0.12,
            bulge: 0.3,
            tx: 0.82,
            apex: 0.2,
            tornus: 0.1,
            base: "#ece7da",
            edge: "#5a5750",
            bands: [
              bd(0.3, 0.025, "#2d2c2a", 0.1, 6, 11),
              bd(0.66, 0.025, "#2d2c2a", 0.1, 6, 11),
            ],
            speck: SK(110, 0.012, "#2d2c2a"),
          },
          hind: {
            len: 62,
            chord: 50,
            base: "#e8e3d6",
            edge: "#5a5750",
            bands: [bd(0.6, 0.02, "#2d2c2a", 0, 5, 12)],
            speck: SK(50, 0.012, "#2d2c2a"),
          },
          body: {
            tw: 13,
            abdW: 10,
            abdLen: 60,
            color: "#e6e0d2",
            alt: "#c9c2b2",
            stripe: { on: true, c: "#2d2c2a" },
          },
          antenna: { len: 32, color: "#3a3a38" },
        },
        "Death’s-head hawkmoth": {
          fore: {
            chord: 33,
            sweep: 0.2,
            hook: 0.3,
            bulge: 0.2,
            tx: 0.88,
            apex: 0.4,
            tornus: 0.2,
            base: "#4b3828",
            edge: "#241a12",
            bands: [
              bd(0.35, 0.06, "#b08e55", 0.15, 5),
              bd(0.7, 0.05, "#b08e55", 0.1, 5),
            ],
            speck: SK(50, 0.015, "#c9a566"),
            spots: [sp(0.5, 0.45, 0.025, 0.04, "#f1e6c0")],
          },
          hind: {
            len: 60,
            chord: 42,
            tilt: 14,
            base: "#f0b52f",
            edge: "#241a12",
            margin: M(8, "#3a2a1e"),
            bands: [
              bd(0.45, 0.09, "#3a2a1e", 0.1, 4),
              bd(0.78, 0.07, "#3a2a1e", 0.1, 4),
            ],
          },
          body: {
            tw: 16.5,
            abdW: 15,
            abdLen: 73,
            color: "#6a4e30",
            alt: "#8a6a44",
            stripe: { on: true, c: "#f0b52f" },
            mark: { on: true, c: "#ecdcab" },
            fuzz: 1.2,
          },
          antenna: { len: 34, spread: 30, color: "#241a12" },
        },
        "Elephant hawkmoth": {
          fore: {
            chord: 30,
            sweep: 0.24,
            hook: 0.3,
            bulge: 0.2,
            tx: 0.87,
            apex: 0.5,
            tornus: 0.2,
            base: "#9c9d56",
            edge: "#555a30",
            margin: M(2.5, "#e27a9b"),
            bands: [
              bd(0.3, 0.07, "#e27a9b", 0.2, 2, 9, 0.05),
              bd(0.62, 0.05, "#e27a9b", 0.15, 2, 9, 0.04),
            ],
            fringe: { on: false, len: 0.4, c: "#f0c4cf" },
          },
          hind: {
            len: 55,
            chord: 40,
            tilt: 12,
            base: "#e8758f",
            edge: "#9a4c62",
            margin: M(7, "#3a3a28"),
            fringe: { on: false, len: 0.4, c: "#f0c4cf" },
          },
          body: {
            tw: 16,
            abdW: 12,
            abdLen: 62,
            color: "#9c9d56",
            alt: "#e27a9b",
            taper: 0.7,
            stripe: { on: true, c: "#e27a9b" },
          },
          antenna: { len: 26, spread: 28, color: "#e27a9b" },
        },
        "Garden tiger moth": {
          fore: {
            chord: 42,
            sweep: 0.1,
            bulge: 0.3,
            tx: 0.82,
            apex: -0.1,
            base: "#f4eddb",
            edge: "#6b4a2c",
            fringe: { on: false, len: 0.5, c: "#8a5a34" },
            spots: [
              sp(0.25, 0.32, 0.09, 0.14, "#6a3d1f", "", 1, 20),
              sp(0.5, 0.22, 0.08, 0.12, "#5a3318", "", 1, -10),
              sp(0.72, 0.4, 0.09, 0.15, "#6a3d1f", "", 1, 30),
              sp(0.45, 0.62, 0.1, 0.11, "#5a3318"),
              sp(0.85, 0.75, 0.07, 0.09, "#6a3d1f"),
            ],
          },
          hind: {
            len: 64,
            chord: 52,
            tilt: 12,
            base: "#e8531f",
            edge: "#7a2a12",
            spots: [
              sp(0.35, 0.4, 0.07, 0.09, "#1b2442", "#0c1226"),
              sp(0.62, 0.62, 0.07, 0.09, "#1b2442", "#0c1226"),
              sp(0.78, 0.3, 0.06, 0.08, "#1b2442", "#0c1226"),
              sp(0.3, 0.72, 0.05, 0.07, "#1b2442", "#0c1226"),
            ],
          },
          body: {
            tw: 16,
            abdW: 13,
            abdLen: 58,
            color: "#d4531e",
            alt: "#6a3d1f",
            stripe: { on: true, c: "#1b1816" },
            fuzz: 1.5,
          },
          antenna: { type: "serrate", len: 30, color: "#2a2016" },
        },
        "Imperial moth": {
          fore: {
            chord: 50,
            sweep: 0.12,
            bulge: 0.28,
            tx: 0.82,
            apex: -0.1,
            base: "#f1d24c",
            edge: "#a8703a",
            speck: SK(130, 0.014, "#a5573a"),
            bands: [bd(0.55, 0.07, "#b5673f", 0.3, 3, 9, 0.05)],
            fringe: { on: false, len: 0.5, c: "#e9c24a" },
          },
          hind: {
            len: 66,
            chord: 58,
            tilt: 14,
            base: "#f1d24c",
            edge: "#a8703a",
            speck: SK(70, 0.014, "#a5573a"),
            margin: M(3, "#b5673f"),
          },
          body: {
            tw: 17,
            abdW: 14,
            abdLen: 56,
            color: "#e9c24a",
            alt: "#b5673f",
            fuzz: 1.5,
          },
          antenna: { type: "feather", len: 30, barb: 6, color: "#9a5a3a" },
        },
        "Cecropia moth": {
          fore: {
            chord: 54,
            sweep: 0.14,
            bulge: 0.28,
            tx: 0.8,
            apex: 0.1,
            base: "#8a3b2c",
            edge: "#3a1a14",
            grad: { on: true, c: "#c9bdb0" },
            margin: M(2.5, "#f2eee8"),
            bands: [
              bd(0.28, 0.05, "#f2eee8", 0.1, 3, 9, 0.05),
              bd(0.66, 0.04, "#f2eee8", 0.1, 3, 9),
            ],
            spots: [
              sp(0.46, 0.4, 0.05, 0.1, "#f6f1ea", "#2a1210"),
              sp(0.9, 0.1, 0.03, 0.06, "#2a1a14"),
            ],
          },
          hind: {
            len: 72,
            chord: 62,
            tilt: 14,
            base: "#8a3b2c",
            edge: "#3a1a14",
            grad: { on: true, c: "#c9bdb0" },
            margin: M(2.5, "#f2eee8"),
            bands: [bd(0.6, 0.04, "#f2eee8", 0.1, 3, 9)],
            spots: [sp(0.42, 0.5, 0.05, 0.1, "#f6f1ea", "#2a1210")],
          },
          body: {
            tw: 19,
            abdW: 17,
            abdLen: 60,
            color: "#b83a2a",
            alt: "#8a2a20",
            stripe: { on: true, c: "#f2eee8" },
            mark: { on: true, c: "#f2eee8" },
            fuzz: 1.5,
          },
          antenna: {
            type: "feather",
            len: 38,
            barb: 9,
            spread: 38,
            color: "#3a1a14",
          },
        },
        "Buff-tip moth": {
          fore: {
            chord: 36,
            sweep: 0.1,
            bulge: 0.3,
            tx: 0.84,
            apex: -0.2,
            base: "#bdb9b0",
            edge: "#8a8478",
            grad: { on: true, c: "#e6cf8c" },
            fringe: { on: false, len: 0.5, c: "#e6cf8c" },
            bands: [
              bd(0.3, 0.012, "#7a756b", 0.08, 2, 9),
              bd(0.5, 0.012, "#7a756b", 0.08, 2, 9),
              bd(0.68, 0.012, "#7a756b", 0.08, 2, 9),
            ],
            spots: [sp(0.45, 0.38, 0.03, 0.05, "#d9d2c0", "#7a756b")],
          },
          hind: {
            len: 58,
            chord: 48,
            base: "#ece6d6",
            edge: "#9a9486",
            fringe: { on: false, len: 0.5, c: "#e6cf8c" },
          },
          body: {
            tw: 15,
            abdW: 11,
            abdLen: 56,
            color: "#e0c680",
            alt: "#b8b0a0",
            fuzz: 1.5,
          },
          antenna: { type: "serrate", len: 28, color: "#6a6558" },
        },
      };
      /* ---- reference-photo pass: swept triangular forewings, woolly thorax, bigger eyes, soft fringe ---- */
      const FIX = {
        "Rosy maple moth": { f: [16, 0.5], sh: 0.9, ant: ["feather", "#b9773f"], fr: "#f2b5cc" },
        "Luna moth": { f: [12, 0.2, 0.3], sh: 0.6, fr: "#e6f2cf", tail: [58, 5.5] },
        "Atlas moth": { f: [10, 0.3, -0.35], sh: 0.7, fr: "#e8c9a0", lobe: 0.85 },
        "Polyphemus moth": { f: [14, 0.35], sh: 0.7, fr: "#e8cfa0" },
        "Io moth": { f: [14, 0.3], sh: 0.7, fr: "#f0d890" },
        "Cinnabar moth": { f: [26, 0.6, 0.5], hind: [62, 42, 0.2], sh: 0.5, fr: "#2a2430" },
        "Sunset moth": { f: [10, 0.2], sh: 0.3, fr: "#f4f0e6", flen: 0.7, hindTeeth: [6, 2.6], tail: [28, 4] },
        "Giant leopard moth": { f: [16, 0.3], sh: 0.7, fr: "#f4f0e6", thorax: ["#f4f1ea", "#1f3f9a"] },
        "Peppered moth": { f: [16, 0.4], sh: 0.6, fr: "#e8e4dc" },
        "Death’s-head hawkmoth": { f: [26, 0.65, 0.6], hind: [60, 40, 0.2], sh: 0.9, abd: [92, 0.85], ant: ["club", "#2a2420"], fr: "#c9b890" },
        "Elephant hawkmoth": { f: [30, 0.75, 0.8], hind: [58, 38, 0.2], sh: 0.9, abd: [96, 0.8], ant: ["club", "#f2e4e8"], fr: "#f6d7e2" },
        "Garden tiger moth": { f: [16, 0.35], sh: 0.9, hl: [72, 58], fr: "#f4ead0" },
        "Imperial moth": { f: [14, 0.3], sh: 0.8, fr: "#f2e6a0" },
        "Cecropia moth": { f: [14, 0.3], sh: 0.8, fr: "#f0e6d8" },
        "Buff-tip moth": { f: [18, 0.35], sh: 0.7, fr: "#d8c0a0" },
      };
      for (const [n, x] of Object.entries(FIX)) {
        const m = MOTHS[n];
        if (!m) continue;
        m.fore = { ...m.fore, tilt: x.f[0], oblique: x.f[1] };
        if (x.f[2] !== undefined) m.fore.apex = x.f[2] < 0 ? x.f[2] : Math.max(m.fore.apex ?? 0, x.f[2]);
        for (const k of ["fore", "hind"])
          m[k].fringe = { on: true, len: x.flen ?? 0.35, c: x.fr };
        const b = (m.body = { ...m.body });
        b.shoulder = x.sh;
        b.tw = Math.min(26, (b.tw ?? 13) * (1 + 0.3 * x.sh));
        b.eyeSize = Math.min(0.32, (b.eyeSize ?? 0.15) * 1.6);
        b.abdW = Math.min(b.tw * 0.95, Math.max(b.abdW ?? 11, b.tw * 0.8));
        if (x.hind) m.hind = { ...m.hind, len: x.hind[0], chord: x.hind[1], round: x.hind[2], tilt: 24 };
        if (x.abd) {
          b.abdLen = x.abd[0];
          b.abdW = Math.min(b.tw * 0.95, x.abd[1] * b.tw);
        }
        if (x.tail !== undefined) m.hind = { ...m.hind, tail: x.tail[0], tw: x.tail[1] };
        if (x.hl) m.hind = { ...m.hind, len: x.hl[0], chord: x.hl[1] };
        if (x.lobe) m.fore.lobe = x.lobe;
        if (x.hindTeeth) m.hind = { ...m.hind, teeth: x.hindTeeth[0], tooth: x.hindTeeth[1] };
        if (x.thorax) {
          b.thoraxColor = x.thorax[0];
          b.mark = { on: true, c: x.thorax[1] };
        }
        if (x.ant) m.antenna = { ...m.antenna, type: x.ant[0], color: x.ant[1] };
      }
      /* Typical wingspans (mm, middle of the usual published range) for the named species. */
      const PRESET_SPAN = {
        "Rosy maple moth": 48,
        "Luna moth": 100,
        "Atlas moth": 250,
        "Polyphemus moth": 125,
        "Io moth": 62,
        "Cinnabar moth": 37,
        "Sunset moth": 80,
        "Giant leopard moth": 75,
        "Peppered moth": 52,
        "Death’s-head hawkmoth": 110,
        "Elephant hawkmoth": 55,
        "Garden tiger moth": 62,
        "Imperial moth": 110,
        "Cecropia moth": 130,
        "Buff-tip moth": 62,
      };
      for (const [n, s] of Object.entries(PRESET_SPAN))
        if (MOTHS[n]) MOTHS[n].span = s;
      /* Shared with moth_screensaver.html: everything above this line is the rendering logic. */
      window.MothLib = { renderMoth, full, constrain, MOTHS, seedOf, randomMoth, CATS };
      /* Builder UI below only runs on moth_builder.html (so the screensaver can load this file safely). */
      if (!document.getElementById("panel")) return;
      //==UI==
      const $ = (s) => document.querySelector(s),
        fmt = (v) => (+v).toFixed(2).replace(/\.?0+$/, "") || "0",
        names = Object.keys(MOTHS),
        REG = [],
        LISTS = {};
      let cur,
        tab = "Species",
        seedText = "1",
        catText = "Any";
      function ctl(s, i) {
        const id = `id="r${i}"`;
        if (s.t === "r")
          return `<label ${id}><span>${s.l}</span><output></output><input type="range" step="${s.st}"></label>`;
        if (s.t === "c")
          return `<label ${id} class="c"><span>${s.l}</span><input type="color"></label>`;
        if (s.t === "t")
          return `<label ${id} class="t"><input type="checkbox"><span>${s.l}</span></label>`;
        return `<label ${id}><span>${s.l}</span><select>${s.o.map((o) => `<option>${o}</option>`).join("")}</select></label>`;
      }
      const reg = (s) => REG.push({ s, p: s.p }) - 1;
      function build(specs) {
        return specs
          .map((s) => {
            if (s.t !== "l") return ctl(s, reg(s));
            LISTS[s.p] = s;
            return `<fieldset><legend>${s.l}</legend>${(get(cur, s.p) || [])
              .map(
                (_, i) =>
                  `<div class="item"><b>#${i + 1}</b><button data-del="${s.p}|${i}">✕</button>${s.item
                    .map((x) => {
                      const q = { ...x, p: `${s.p}.${i}.${x.p}` };
                      return ctl(q, reg(q));
                    })
                    .join("")}</div>`,
              )
              .join("")}<button data-add="${s.p}">＋ Add</button></fieldset>`;
          })
          .join("");
      }
      function sync() {
        REG.forEach((x, i) => {
          const row = document.getElementById("r" + i);
          if (!row) return;
          const s = x.s,
            el = row.querySelector("input,select"),
            v = get(cur, x.p);
          row.hidden = s.vis ? !s.vis(cur) : false;
          if (s.t === "r") {
            const mn = lim(s.mn, cur),
              mx = Math.max(mn, lim(s.mx, cur));
            el.min = mn;
            el.max = mx;
            el.value = v;
            row.querySelector("output").textContent = fmt(v);
          } else if (s.t === "t") el.checked = !!v;
          else el.value = v;
        });
        document
          .querySelectorAll("[data-view]")
          .forEach((b) =>
            b.classList.toggle("on", b.dataset.view === cur.view),
          );
      }
      /* ---- wingspan and units ----
         span is stored in millimetres (0 = not set). It is shown in cm or inches: inches by default only for
         locales that use them (US, Liberia, Myanmar), otherwise cm. The choice is remembered on this device. */
      const defaultUnit = () => {
        try {
          const l = (navigator.languages && navigator.languages[0]) || navigator.language || "";
          return /-(US|LR|MM)\b/i.test(l) ? "in" : "cm";
        } catch (e) {
          return "cm";
        }
      };
      let unit = defaultUnit();
      try {
        const u = localStorage.getItem("moth-unit");
        if (u === "cm" || u === "in") unit = u;
      } catch (e) {}
      const mmToUnit = (mm) => (unit === "in" ? mm / 25.4 : mm / 10);
      const unitToMm = (v) => Math.round(unit === "in" ? v * 25.4 : v * 10);
      const spanText = (mm) =>
        unit === "in"
          ? `${(mm / 25.4).toFixed(1)} in (${(mm / 10).toFixed(1)} cm)`
          : `${(mm / 10).toFixed(1)} cm (${(mm / 25.4).toFixed(1)} in)`;
      function sizeHTML() {
        const v = cur.span > 0 ? mmToUnit(cur.span).toFixed(unit === "in" ? 2 : 1) : "";
        return `<fieldset class="size"><legend>Wingspan (tip to tip)</legend>
 <div class="spanrow"><input id="spanin" type="number" inputmode="decimal" min="0" step="${unit === "in" ? 0.05 : 0.1}" value="${v}" placeholder="Auto" aria-label="Wingspan in ${unit === "in" ? "inches" : "centimetres"}"><span class="unit">${unit}</span>
 <span class="seg"><button data-unit="cm"${unit === "cm" ? ' class="on"' : ""}>cm</button><button data-unit="in"${unit === "in" ? ' class="on"' : ""}>in</button></span></div>
 <div class="row"><button id="spanauto">Auto (estimate from the body)</button></div>
 <p class="note">Real size makes the Ecology tab far more specific. Leave it on Auto and it makes a rough guess and says so.</p></fieldset>`;
      }
      function setSpan(v) {
        const n = parseFloat(v);
        cur.span = Number.isFinite(n) && n > 0 ? Math.min(320, Math.max(8, unitToMm(n))) : 0;
        draw();
      }
      function sizeLine() {
        const el = $("#sizeline");
        if (el)
          el.textContent = cur.span > 0 ? `Wingspan ${spanText(cur.span)}` : "Wingspan not set (Ecology estimates one)";
      }

      /* Ecology tab: text inferred from the current parameters (same moth, same text). */
      const escHTML = (s) =>
        String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
      function ecologyHTML() {
        if (!window.MothEcology)
          return `<p class="note">moth_ecology.js did not load.</p>`;
        try {
          const r = window.MothEcology.describe(cur, { unit });
          return `<p class="note">Inferred from this moth's shape, colour and body, so it follows every slider. Same moth, same text.</p>
 <p class="eco-head">${escHTML(r.headline)}</p>
 ${r.sections.map((s) => `<h4 class="eco-h">${escHTML(s.title)}</h4><p class="eco-p">${escHTML(s.text)}</p>`).join("")}`;
        } catch (err) {
          return `<p class="note">Could not write the ecology: ${escHTML(err.message)}</p>`;
        }
      }
      function draw() {
        const svg = renderMoth(cur, { free: true });
        $("#stage").innerHTML = svg;
        sizeLine();
        if (tab === "Ecology") {
          /* keep the reader's scroll position while sliders elsewhere change the moth */
          const el = $("#panel"), y = el.scrollTop;
          el.innerHTML = ecologyHTML();
          el.scrollTop = y;
        }
        const j = $("#js"),
          sv = $("#svg");
        if (j && document.activeElement !== j) j.value = JSON.stringify(cur);
        if (sv) sv.value = svg;
      }
      function panel() {
        REG.length = 0;
        const el = $("#panel");
        if (tab === "Species")
          el.innerHTML = `<label><span>Species preset</span><select id="pre"><option value="">— choose —</option>${names.map((n, i) => `<option value="${i}">${n}</option>`).join("")}</select></label>
 <label><span>Generator style (seed + style → always the same moth)</span><select id="cat">${CATS.map((c) => `<option${c === catText ? " selected" : ""}>${c}</option>`).join("")}</select></label>
 <label><span>Seed — any text or number (Enter to load)</span><input id="seed" type="text" value="${seedText}" spellcheck="false" autocomplete="off"></label>
 <div class="row"><button id="go">Load seed</button><button id="rnd">🎲 Random seed</button></div>
 <p class="note">Seeds: 4,294,967,296 (2³²) per style; text is hashed into that space. “Any” mixes every style and also draws the named species presets (exact or as recoloured “cousins”). Current seed value: <b>${cur.seed}</b>.</p>
 ${sizeHTML()}
 <label><span>Parameters (JSON, editable)</span><textarea id="js" rows="7"></textarea></label><button id="app">Apply JSON</button>
 <label><span>SVG output</span><textarea id="svg" rows="4" readonly></textarea></label>`;
        else if (tab === "Quiz") el.innerHTML = quizHTML();
        else if (tab === "Ecology") el.innerHTML = ecologyHTML();
        else if (tab === "Info")
          el.innerHTML = window.MothInfo
            ? window.MothInfo.html()
            : `<p class="note">moth_info.js did not load.</p>`;
        else el.innerHTML = build(TABS[tab]);
        document
          .querySelectorAll("#tabs button")
          .forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
        sync();
        draw();
      }
      function load(o, name) {
        const keep = cur && {
          view: cur.view,
          organic: cur.organic,
          underFade: cur.underFade,
        };
        cur = constrain(full(o));
        if (keep) Object.assign(cur, keep);
        $("#name").textContent = "· " + name;
        panel();
      }
      const loadSeed = (t) => {
        seedText = String(t).trim() || "1";
        {
          const m = randomMoth(seedOf(seedText), catText);
          load(m, "seed " + seedText + " · " + randomMoth.last);
        }
      };
      $("#tabs").innerHTML = ["Species", "Quiz", "Ecology", ...Object.keys(TABS), "Info"]
        .map((t) => `<button data-t="${t}">${t}</button>`)
        .join("");
      $("#tabs").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (b) {
          tab = b.dataset.t;
          panel();
        }
      });
      const P_ = $("#panel");
      const edit = (e) => {
        const row = e.target.closest("label[id^=r]");
        if (!row) return;
        const x = REG[+row.id.slice(1)];
        if (!x) return;
        const el = e.target,
          t = x.s.t;
        set(
          cur,
          x.p,
          t === "r" ? +el.value : t === "t" ? el.checked : el.value,
        );
        constrain(cur);
        sync();
        draw();
      };
      P_.addEventListener("input", (e) => {
        if (e.target.id === "spanin") setSpan(e.target.value);
        else edit(e);
      });
      P_.addEventListener("change", (e) => {
        if (e.target.id === "pre") {
          if (e.target.value !== "") {
            const n = names[e.target.value];
            load({ ...MOTHS[n], seed: seedOf(n) }, n);
          }
        } else if (e.target.id === "cat") {
          catText = e.target.value;
          loadSeed(seedText);
        } else if (e.target.id === "seed") loadSeed(e.target.value);
        else edit(e);
      });
      P_.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.id === "seed") {
          e.preventDefault();
          loadSeed(e.target.value);
        }
      });
      P_.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (quizClick(b)) return;
        if (b.dataset.unit) {
          unit = b.dataset.unit;
          try {
            localStorage.setItem("moth-unit", unit);
          } catch (err) {}
          panel();
          return;
        }
        if (b.id === "spanauto") {
          cur.span = 0;
          panel();
          return;
        }
        if (b.id === "go") loadSeed($("#seed").value);
        else if (b.id === "rnd")
          loadSeed(Math.floor(Math.random() * 4294967296));
        else if (b.id === "app") {
          try {
            cur = constrain(full(JSON.parse($("#js").value)));
            $("#name").textContent = "· custom";
            sync();
            draw();
          } catch (err) {
            alert("Invalid JSON");
          }
        } else if (b.dataset.add) {
          get(cur, b.dataset.add).push(LISTS[b.dataset.add].make());
          panel();
        } else if (b.dataset.del) {
          const [p, i] = b.dataset.del.split("|");
          get(cur, p).splice(+i, 1);
          panel();
        }
      });
      /* ---- Quiz tab (deterministic) + optional AI path ---- */
      let QA = {},
        qHue = null,
        qName = "";
      const SYS = `You design a personalised moth for the Moth Generator by writing its parameter JSON. Reply with ONE json code block, then one line naming the moth and why it fits the person.
Personality to moth: express 2-3 traits through concrete choices (silhouette, palette, one signature mark, body/antennae), not everything. Gentle/cosy: rounded corners (negative apex/tornus), pastel, fuzzy body. Bold/loud: saturated high contrast, big spots or eyespots. Private/observant: muted, speckled, cryptic, with one hidden bright flash on the hindwing. Mysterious: near-black or bone base, one glow colour, falcate wings. Graceful: narrow wings, long curled tails, pale palette, veins. Playful/bluffing: eyespots. Keep real-moth logic: bright upper wings need a reason.
Rules: pure JSON, numbers like 0.2 (never .2), colours #rrggbb only. Lists replace and every item needs all fields: band {u,w,w2,skew,wave,freq,c}; spot {u,v,rx,ry,c,ring,rw,o,rot}; eyespot {u,v,r,cols:[outer..pupil],hl}. Toggle objects: margin/costalBand {on,w,c}, grad {on,c}, veins {on,c}, fringe {on,len,c}, speck {on,n,s,c,ring,rc}. Wing coords: u 0 at body to 1 at outer edge; v 0 leading edge to 1 trailing edge; hindwing markings belong at v>0.45 (forewing covers the rest). Ranges: fore.chord 30-62, fore.sweep 0-0.34, fore.hook 0-0.9 (max (70-chord)/25), fore.apex/tornus and hind.apex/anal -0.9 (round) to 0.9 (sharp), hind.len 40-92 (small triangular hindwings for hawkmoths ~45), hind.chord 0.5-1.08 x len, hind.tail 0-1.6 x len, body.tw 10-21, body.abdW 0.45-0.95 x tw, body.abdLen 38-100, body.fuzz 0-2.2, antenna.type thread|serrate|feather|club (club = thickened hooked tip, hawkmoths), antenna.len 22-60, fore.tilt 6-30 (wings swept back; narrow-winged moths 24-30), fore.oblique 0-1 (outer margin slant; 0.2 rounded, 0.7 sharp triangle), fore.lobe 0-1 (Atlas-style wingtip), body.shoulder 0-1 (woolly thorax), optional body.thoraxColor, body.tw up to 24, body.eyeSize up to 0.3. Keep fore.len 100 and organic 0; fringe on with len 0.4-0.7 in a pale colour.
You receive the person's quiz answers and a base moth JSON. Improve and personalise the base moth; output the complete JSON.`;
      const aiMsg = (p) =>
        JSON.stringify({
          answers: QZ.map((q) => [
            q.q,
            QA[q.k] != null ? q.o[QA[q.k]][0] : null,
          ]),
          favouriteColourHue: qHue,
          name: qName || null,
          baseStyle: p.cat,
          baseMoth: p.m,
        });
      const parseMoth = (t) => {
        const f = t.match(/```(?:json)?\s*([\s\S]*?)```/);
        let s = f ? f[1] : t;
        s = s
          .slice(s.indexOf("{"), s.lastIndexOf("}") + 1)
          .replace(/([:\[,]\s*)(-?)\.(\d)/g, (a, b, c, d) => b + c + "0." + d);
        return JSON.parse(s);
      };
      const aiSt = (m) => {
        const e = $("#aist");
        if (e) e.textContent = m;
      };
      const showMoth = (o, tag) => {
        const keep = {
          view: cur.view,
          organic: cur.organic,
          underFade: cur.underFade,
        };
        cur = Object.assign(constrain(full(o)), keep);
        $("#name").textContent = "· " + tag;
        draw();
      };
      function quizHTML() {
        const grp = (items) => `<div class="opts">${items}</div>`;
        return (
          `<p class="note">Answer as many as you like; the moth updates live. Same answers always give the same moth.</p>` +
          QZ.map(
            (q) =>
              `<fieldset><legend>${q.q}</legend>${grp(q.o.map((o, i) => `<button data-q="${q.k}|${i}"${QA[q.k] === i ? ' class="on"' : ""}>${o[0]}</button>`).join(""))}</fieldset>`,
          ).join("") +
          `<fieldset><legend>A colour you’re drawn to</legend>${grp(HUES.map(([n, h], i) => `<button data-hue="${i}"${qHue === h ? ' class="on"' : ""}>${h == null ? "" : `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${hx(h, 70, 55)};margin-right:5px"></span>`}${n}</button>`).join(""))}</fieldset>
 <label><span>Your name, or a word that matters to you (optional, goes into the seed)</span><input id="qname" type="text" value="${qName.replace(/"/g, "&quot;")}" autocomplete="off"></label><p class="note" id="qres"></p>
 <fieldset><legend>AI-personalised moth (optional)</legend><p class="note">Sends your answers plus the moth above to an LLM via OpenRouter, which redesigns it as a portrait of you. AI output is not perfectly repeatable: temperature 0 and a fixed seed help, and each answer-set’s result is cached on this device. When you like one, copy its JSON from the Species tab; that is the permanent version. Your key stays in this page and is only sent to openrouter.ai. It won’t work on a host that blocks outside requests; “Copy prompt” works anywhere.</p>
 <label><span>OpenRouter API key</span><input id="aikey" type="password" autocomplete="off"></label><label><span>Model</span><input id="aimodel" type="text" value="anthropic/claude-sonnet-4.5"></label>
 <div class="row"><button id="aigo">✨ Generate with AI</button><button id="aicopy">Copy prompt (any chatbot, no key)</button></div>
 <label><span>Paste the chatbot’s JSON reply</span><textarea id="aipaste" rows="4"></textarea></label><div class="row"><button id="aiuse">Use pasted JSON</button></div><p class="note" id="aist"></p></fieldset>`
        );
      }
      function applyQuiz() {
        const p = personal(QA, qHue, qName);
        showMoth(p.m, "quiz · " + p.cat);
        const r = $("#qres");
        if (r)
          r.innerHTML = `Your style: <b>${p.cat}</b> · seed <b>${p.seed}</b>`;
      }
      async function aiGo() {
        const p = personal(QA, qHue, qName),
          key = $("#aikey").value.trim(),
          model = $("#aimodel").value.trim(),
          ck = "moth-ai:" + model + ":" + p.key;
        try {
          const c = localStorage.getItem(ck);
          if (c) {
            showMoth(JSON.parse(c), "AI moth (saved)");
            aiSt("Loaded the saved result for these exact answers.");
            return;
          }
        } catch (e) {}
        if (!key) {
          aiSt("Paste an OpenRouter key first, or use “Copy prompt”.");
          return;
        }
        aiSt("Asking the model…");
        try {
          const res = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + key,
              },
              body: JSON.stringify({
                model,
                temperature: 0,
                seed: p.seed % 2147483647,
                messages: [
                  { role: "system", content: SYS },
                  { role: "user", content: aiMsg(p) },
                ],
              }),
            },
          );
          const j = await res.json();
          if (!res.ok) throw new Error(j.error?.message || res.status);
          const o = parseMoth(j.choices[0].message.content);
          showMoth(o, "AI moth");
          aiSt(
            "Done. Copy the JSON from the Species tab to keep this exact moth.",
          );
          try {
            localStorage.setItem(ck, JSON.stringify(o));
          } catch (e) {}
        } catch (err) {
          aiSt("Failed: " + err.message + ". Showing your quiz moth instead.");
          applyQuiz();
        }
      }
      const aiCopy = () =>
        navigator.clipboard
          .writeText(
            SYS + "\n\nPERSON DATA:\n" + aiMsg(personal(QA, qHue, qName)),
          )
          .then(
            () =>
              aiSt(
                "Prompt copied. Paste it into any chatbot, then paste its JSON reply below.",
              ),
            () => aiSt("Could not copy automatically."),
          );
      const aiUse = () => {
        try {
          showMoth(parseMoth($("#aipaste").value), "AI moth (pasted)");
          aiSt("Applied.");
        } catch (e) {
          aiSt("Could not read that JSON: " + e.message);
        }
      };
      function quizClick(b) {
        const one = () =>
          b.parentElement
            .querySelectorAll("button")
            .forEach((x) => x.classList.toggle("on", x === b));
        if (b.dataset.q) {
          const [k, i] = b.dataset.q.split("|");
          QA[k] = +i;
          one();
          applyQuiz();
          return true;
        }
        if (b.dataset.hue) {
          qHue = HUES[+b.dataset.hue][1];
          one();
          applyQuiz();
          return true;
        }
        if (b.id === "aigo") {
          aiGo();
          return true;
        }
        if (b.id === "aicopy") {
          aiCopy();
          return true;
        }
        if (b.id === "aiuse") {
          aiUse();
          return true;
        }
        return false;
      }
      $("#panel").addEventListener("input", (e) => {
        if (e.target.id === "qname") {
          qName = e.target.value;
          applyQuiz();
        }
      });

      /* view toggle + export */
      document.addEventListener("click", (e) => {
        const b = e.target.closest("[data-view]");
        if (b) {
          cur.view = b.dataset.view;
          sync();
          draw();
        }
      });
      async function saveFile(name, data) {
        const dl =
          window.claude && claude.use ? await claude.use("downloads") : null;
        if (dl) {
          try {
            await dl.save({ filename: name, data });
          } catch (err) {
            if (err && err.code !== "declined")
              alert("Could not save: " + (err.message || err.code));
          }
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(
            data instanceof Blob ? data : new Blob([data]),
          );
          a.download = name;
          a.click();
        }
      }
      const sized = (w, rig) => {
        const s = renderMoth(cur, { free: true, rig }),
          m = s
            .match(/viewBox="([^"]+)"/)[1]
            .split(" ")
            .map(Number),
          h = Math.round((w * m[3]) / m[2]);
        return {
          svg: s.replace("<svg ", `<svg width="${w}" height="${h}" `),
          w,
          h,
        };
      };
      const fname = (ext) => `moth-${cur.view}-${cur.seed}.${ext}`;
      $("#svgb").onclick = () =>
        saveFile(
          fname("svg"),
          '<?xml version="1.0" encoding="UTF-8"?>\n' + sized(1600).svg,
        );
      $("#rigb").onclick = () =>
        saveFile(
          `moth-rig-${cur.view}-${cur.seed}.svg`,
          '<?xml version="1.0" encoding="UTF-8"?>\n' + sized(1600, true).svg,
        );
      $("#pngb").onclick = async () => {
        const { svg, w, h } = sized(2400);
        try {
          const img = new Image();
          img.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
          await img.decode();
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          const blob = await new Promise((r) => c.toBlob(r, "image/png"));
          saveFile(fname("png"), blob);
        } catch (err) {
          alert("PNG export failed — try SVG instead.");
        }
      };
      load({ ...MOTHS[names[0]], seed: seedOf(names[0]) }, names[0]);
    
})();
