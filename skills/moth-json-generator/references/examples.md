# Worked examples (all are real presets from the page; each renders cleanly)

These are PARTIAL JSONs: anything omitted takes the default. Use them as style and structure references, not templates to copy.

## Rosy maple moth
Pastel, fuzzy, rounded corners (negative apex/tornus). Two-colour wing split made with one wide skewed band. Legs on, feather antennae.

```json
{"fore":{"chord":56,"sweep":0.1,"bulge":0.3,"tx":0.82,"costal":0.2,"apex":-0.5,"tornus":-0.4,"base":"#ec7fa5","edge":"#c25a82","fringe":{"on":false,"len":0.5,"c":"#f6c3d3"},"bands":[{"u":0.48,"w":0.1,"w2":0.46,"skew":0.05,"wave":0,"freq":9,"c":"#f8e47c"}]},"hind":{"len":70,"chord":62,"round":0.5,"apex":-0.4,"anal":-0.4,"base":"#f8e47c","edge":"#d9b85a","margin":{"on":true,"w":3.5,"c":"#f2a6bf"},"fringe":{"on":false,"len":0.5,"c":"#f6c3d3"}},"body":{"tw":17,"abdW":15,"abdLen":46,"head":0.62,"eyeSize":0.12,"taper":0.35,"fuzz":1.9,"color":"#f8e47c","alt":"#f0a9c0","legs":{"on":true,"c":"#ee86a8"}},"antenna":{"type":"feather","len":28,"spread":34,"barb":5,"color":"#ee86a8"}}
```

## Sunset moth
Black wings with parallel teal wave-bands, white margin, big orange hindwing spots, long tails. Hindwing markings sit at v>.5 so the forewing does not hide them.

```json
{"fore":{"chord":40,"sweep":0.1,"bulge":0.2,"tx":0.85,"apex":0.3,"base":"#16181f","edge":"#0a0b0f","margin":{"on":true,"w":3,"c":"#f3f1ea"},"bands":[{"u":0.22,"w":0.045,"w2":0.045,"skew":0.2,"wave":3,"freq":9,"c":"#2fcf9f"},{"u":0.42,"w":0.05,"w2":0.05,"skew":0.2,"wave":3,"freq":9,"c":"#27b8c8"},{"u":0.63,"w":0.04,"w2":0.04,"skew":0.15,"wave":3,"freq":9,"c":"#2fcf9f"}]},"hind":{"len":74,"chord":56,"round":0.4,"tail":55,"tw":4,"curl":0.15,"tilt":14,"base":"#16181f","edge":"#0a0b0f","margin":{"on":true,"w":4,"c":"#f3f1ea"},"bands":[{"u":0.2,"w":0.05,"w2":0.05,"skew":0.1,"wave":3,"freq":9,"c":"#2fcf9f"}],"spots":[{"u":0.55,"v":0.62,"rx":0.2,"ry":0.18,"c":"#f08a24","ring":"#000000","rw":0,"o":1,"rot":0},{"u":0.7,"v":0.35,"rx":0.1,"ry":0.1,"c":"#e24a2a","ring":"#000000","rw":0,"o":1,"rot":0}]},"body":{"tw":12,"abdW":10,"abdLen":66,"color":"#20242b","alt":"#343a44","stripe":{"on":true,"c":"#f3f1ea"}},"antenna":{"len":40,"color":"#222222"}}
```

## Luna moth
Veins on, costal band, eyespots with 3 colours (cols padded to 4), long curled tails, feather antennae.

```json
{"fore":{"chord":40,"sweep":0.2,"hook":0.1,"bulge":0.2,"tx":0.84,"apex":0.3,"base":"#bfe0a8","edge":"#8aa070","costalBand":{"on":true,"w":6,"c":"#7a4b5c"},"veins":{"on":true,"c":"#7f9a68"},"fringe":{"on":false,"len":0.4,"c":"#e9f3d9"},"eyes":[{"u":0.5,"v":0.4,"r":0.07,"cols":["#6b3b6b","#f2e38a","#e8f1f4"],"hl":true}]},"hind":{"len":62,"chord":46,"tail":80,"tw":5,"curl":0.3,"tilt":14,"base":"#bfe0a8","edge":"#8aa070","margin":{"on":true,"w":2.5,"c":"#8d6a6a"},"veins":{"on":true,"c":"#7f9a68"},"eyes":[{"u":0.45,"v":0.4,"r":0.08,"cols":["#6b3b6b","#f2e38a","#e8f1f4"],"hl":true}]},"body":{"tw":15,"abdW":13,"abdLen":66,"fuzz":1.3,"color":"#f4f1e6","alt":"#e0dccb"},"antenna":{"type":"feather","len":36,"barb":8,"spread":38,"color":"#a89878"}}
```

## Garden tiger moth
Warning pattern: cream forewing with scattered brown spots (rotated ellipses), orange hindwing with dark ringed spots, banded abdomen.

```json
{"fore":{"chord":42,"sweep":0.1,"bulge":0.3,"tx":0.82,"apex":-0.1,"base":"#f4eddb","edge":"#6b4a2c","fringe":{"on":false,"len":0.5,"c":"#8a5a34"},"spots":[{"u":0.25,"v":0.32,"rx":0.09,"ry":0.14,"c":"#6a3d1f","ring":"#000000","rw":0,"o":1,"rot":20},{"u":0.5,"v":0.22,"rx":0.08,"ry":0.12,"c":"#5a3318","ring":"#000000","rw":0,"o":1,"rot":-10},{"u":0.72,"v":0.4,"rx":0.09,"ry":0.15,"c":"#6a3d1f","ring":"#000000","rw":0,"o":1,"rot":30},{"u":0.45,"v":0.62,"rx":0.1,"ry":0.11,"c":"#5a3318","ring":"#000000","rw":0,"o":1,"rot":0},{"u":0.85,"v":0.75,"rx":0.07,"ry":0.09,"c":"#6a3d1f","ring":"#000000","rw":0,"o":1,"rot":0}]},"hind":{"len":64,"chord":52,"tilt":12,"base":"#e8531f","edge":"#7a2a12","spots":[{"u":0.35,"v":0.4,"rx":0.07,"ry":0.09,"c":"#1b2442","ring":"#0c1226","rw":1.6,"o":1,"rot":0},{"u":0.62,"v":0.62,"rx":0.07,"ry":0.09,"c":"#1b2442","ring":"#0c1226","rw":1.6,"o":1,"rot":0},{"u":0.78,"v":0.3,"rx":0.06,"ry":0.08,"c":"#1b2442","ring":"#0c1226","rw":1.6,"o":1,"rot":0},{"u":0.3,"v":0.72,"rx":0.05,"ry":0.07,"c":"#1b2442","ring":"#0c1226","rw":1.6,"o":1,"rot":0}]},"body":{"tw":16,"abdW":13,"abdLen":58,"color":"#d4531e","alt":"#6a3d1f","stripe":{"on":true,"c":"#1b1816"},"fuzz":1.5},"antenna":{"type":"serrate","len":30,"color":"#2a2016"}}
```

## Cecropia moth
Gradient to a pale outer edge, white lines, crescent spots with dark rings, banded red body with a pale thorax mark.

```json
{"fore":{"chord":54,"sweep":0.14,"bulge":0.28,"tx":0.8,"apex":0.1,"base":"#8a3b2c","edge":"#3a1a14","grad":{"on":true,"c":"#c9bdb0"},"margin":{"on":true,"w":2.5,"c":"#f2eee8"},"bands":[{"u":0.28,"w":0.05,"w2":0.05,"skew":0.1,"wave":3,"freq":9,"c":"#f2eee8"},{"u":0.66,"w":0.04,"w2":0.04,"skew":0.1,"wave":3,"freq":9,"c":"#f2eee8"}],"spots":[{"u":0.46,"v":0.4,"rx":0.05,"ry":0.1,"c":"#f6f1ea","ring":"#2a1210","rw":1.6,"o":1,"rot":0},{"u":0.9,"v":0.1,"rx":0.03,"ry":0.06,"c":"#2a1a14","ring":"#000000","rw":0,"o":1,"rot":0}]},"hind":{"len":72,"chord":62,"tilt":14,"base":"#8a3b2c","edge":"#3a1a14","grad":{"on":true,"c":"#c9bdb0"},"margin":{"on":true,"w":2.5,"c":"#f2eee8"},"bands":[{"u":0.6,"w":0.04,"w2":0.04,"skew":0.1,"wave":3,"freq":9,"c":"#f2eee8"}],"spots":[{"u":0.42,"v":0.5,"rx":0.05,"ry":0.1,"c":"#f6f1ea","ring":"#2a1210","rw":1.6,"o":1,"rot":0}]},"body":{"tw":19,"abdW":17,"abdLen":60,"color":"#b83a2a","alt":"#8a2a20","stripe":{"on":true,"c":"#f2eee8"},"mark":{"on":true,"c":"#f2eee8"},"fuzz":1.5},"antenna":{"type":"feather","len":38,"barb":9,"spread":38,"color":"#3a1a14"}}
```
