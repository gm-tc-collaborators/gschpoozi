# 3D Model Assets

Place your GLTF/GLB model files here.

## Required Models

| Filename | Description | Suggested Scale |
|----------|-------------|-----------------|
| `nema17.glb` | NEMA17 stepper motor | 1 unit = 1mm, origin at center |
| `extruder.glb` | Cold end extruder (BMG/Orbiter style) | 1 unit = 1mm |
| `hotend.glb` | Hot end (V6/Dragon style with fins) | 1 unit = 1mm |

## Optional Models

| Filename | Description |
|----------|-------------|
| `2020_extrusion.glb` | 2020 aluminum extrusion profile (1 unit length) |
| `linear_rail.glb` | MGN12 linear rail |

## Export Settings

When exporting from Blender:
- Format: glTF Binary (.glb)
- Enable Draco compression for smaller files
- Include materials (basic PBR)
- Target: < 20k triangles per model

## Orientation

- Y-axis = Up
- Motors: shaft pointing +Y
- Hotend: nozzle pointing -Y
