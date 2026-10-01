# Hero figure — source, license and modifications

## Source

`makehuman-base.obj` is the **MakeHuman base mesh**, downloaded unmodified on
30 September 2026 from the MakeHuman Community repository:

- https://github.com/makehumancommunity/makehuman — `makehuman/data/3dobjs/base.obj` (1,749,303 bytes)
- License text: `MAKEHUMAN-LICENSE.md`, from the same repository's `LICENSE.md`

## License

The MakeHuman bundled assets — including "the base mesh and proxies" — are
released under **CC0** (see section C of `MAKEHUMAN-LICENSE.md`, and the project's
FAQ, *What changed regarding the license in 2020?*). No attribution is required;
this note is kept for provenance.

## What is shipped

The OBJ is **not** served. `npm run hero:geometry`
(`scripts/hero/build-figure-geometry.ts`) processes it into
`public/hero/figure.bin` and `src/components/showcase/hero/figure-landmarks.ts`.

## Modifications

1. **Body only.** The `body` group is kept; eyes, eyelashes, teeth, tongue, hair,
   genital, skirt and tights helper geometry and the joint marker cubes are
   dropped (the joint cubes are read only to locate joints). Quads are
   triangulated.
2. **Neutral chest.** The chest front is drawn back toward a flatter plane so the
   figure reads as anyone rather than as a particular gender.
3. **Relaxed, asymmetric pose.** From the modelling A-pose: the arms are lowered
   (29° / 26°), the forearms swung back to hang (46° / 41°) and brought slightly
   in, the legs brought in from the wide stance (4.5° / 3.2°), and the head
   turned 7° and tilted 2.5°. Weights are smooth, distance-based falloffs around
   each joint — no rig is used.
4. **Normalized.** Scaled to 10 units tall, feet at y = −5, centred on the pelvis.
5. **Inner cavities removed.** Head triangles that cannot see out (the mouth
   cavity and eye sockets) are removed, so they do not show through the
   translucent skin.
6. **Derived data.** Smooth normals are recomputed; an occupancy grid is
   voxelized for interior sampling; joint positions are written as landmarks for
   the neural and vascular networks.
