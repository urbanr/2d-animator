#!/usr/bin/env python3
"""Pad a generated 4x2 pose atlas without scaling or aligning silhouettes.

Find completely empty shared column gutters near nominal cell boundaries.
The nominal grid center, NOT artwork bounds, determines every translation.
Original pixels and vertical motion are preserved; ambiguous cuts are rejected.
"""
import argparse
import json
from pathlib import Path

from downscale_sprites import RgbaImage, read_rgba_png, write_rgba_png
from import_sprite_sheet import remove_connected_gray_background, sha256


def pack(sheet: RgbaImage, size: int = 512):
    if sheet.height % 2 or size < sheet.height // 2:
        raise ValueError('Source rows must fit the output cells')
    mask, _ = remove_connected_gray_background(sheet)
    occupied = [False] * sheet.width
    for i, alpha in enumerate(mask.pixels[3::4]):
        if alpha > 16:
            occupied[i % sheet.width] = True
    cuts = [0]
    for column in range(1, 4):
        nominal = column * sheet.width / 4
        candidates = [x for x in range(max(2, int(nominal-sheet.width/20)),
                                       min(sheet.width-2, int(nominal+sheet.width/20)))
                      if not any(occupied[x-2:x+3])]
        if not candidates:
            raise ValueError(f'No safe gutter at column {column}; regenerate, do not clip')
        cuts.append(min(candidates, key=lambda x: abs(x-nominal)))
    cuts.append(sheet.width)
    out_width, out_height = size*4, size*2
    pixels = bytearray(bytes((80,80,80,255)) * out_width * out_height)
    placements = []
    row_height = sheet.height // 2
    dy = (size-row_height)//2
    for row in range(2):
        for col in range(4):
            # Uniform coordinate grid; the silhouette has no influence on placement.
            dx = round(size/2 - (col+.5)*sheet.width/4)
            left, right = cuts[col:col+2]
            used = [x for x in range(left,right) if occupied[x]]
            if not used or min(used)+dx < 1 or max(used)+dx >= size-1:
                raise ValueError('Artwork does not fit fixed cell size; do not shrink')
            # Discard only background padding outside the fixed output cell.
            lo, hi = max(left,-dx), min(right,size-dx)
            for y in range(row_height):
                src = ((row*row_height+y)*sheet.width+lo)*4
                dst = ((row*size+dy+y)*out_width+col*size+lo+dx)*4
                pixels[dst:dst+(hi-lo)*4] = sheet.pixels[src:src+(hi-lo)*4]
            placements.append({'frame':row*4+col+1,'source_rect':[lo,row*row_height,hi-lo,row_height],
                               'destination_in_cell':[lo+dx,dy]})
    return RgbaImage(out_width,out_height,bytes(pixels)), {'column_cuts':cuts,'cell_size':[size,size],
        'placements':placements,'resampled':False,'alignment':'nominal grid; no per-frame bounds fitting'}


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('output',type=Path)
    args=parser.parse_args()
    metadata=args.output.with_suffix('.json')
    if args.output.exists() or metadata.exists():
        raise SystemExit('Immutable output already exists')
    sheet=read_rgba_png(args.source)
    result,record=pack(sheet)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    write_rgba_png(args.output,result)
    record.update(source=str(args.source),source_sha256=sha256(args.source),source_size=[sheet.width,sheet.height],
                  output_sha256=sha256(args.output))
    metadata.write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record))
