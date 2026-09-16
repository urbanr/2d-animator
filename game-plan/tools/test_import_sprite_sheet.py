#!/usr/bin/env python3

import unittest

from downscale_sprites import RgbaImage
from import_sprite_sheet import crop_cell, join_quad_sheets, safe_margins, visible_bounds


class SpriteSheetSafetyTest(unittest.TestCase):
    def test_two_quad_sheets_keep_exact_pixels_and_row_major_order(self) -> None:
        def quad(start: int) -> RgbaImage:
            pixels = bytearray()
            for y in range(8):
                for x in range(8):
                    pixels.extend((start + (y // 4) * 2 + x // 4, 50, 80, 255))
            return RgbaImage(8, 8, bytes(pixels))
        atlas = join_quad_sheets(quad(1), quad(5))
        self.assertEqual((atlas.width, atlas.height), (16, 8))
        for i in range(8):
            frame = crop_cell(atlas, i % 4, i // 4, (4, 4), (1, 1, 2, 2))
            self.assertEqual(frame.pixels, bytes((i + 1, 50, 80, 255)) * 4)

    def test_crop_rejects_reserve_extending_outside_cell(self) -> None:
        with self.assertRaisesRegex(ValueError, "fit inside"):
            crop_cell(RgbaImage(8, 8, bytes(8 * 8 * 4)), 0, 0, (4, 4), (2, 0, 4, 4))

    def test_visible_bounds_and_margins_find_edge_intrusion(self) -> None:
        width, height = 10, 8
        pixels = bytearray(bytes((80, 80, 80, 0)) * (width * height))
        for x, y in ((1, 2), (4, 5), (8, 4)):
            offset = (y * width + x) * 4
            pixels[offset : offset + 4] = bytes((10, 10, 10, 255))
        image = RgbaImage(width, height, bytes(pixels))
        bounds = visible_bounds(image)
        self.assertEqual(bounds, (1, 2, 8, 5))
        assert bounds is not None
        self.assertEqual(
            safe_margins(image, bounds),
            {"left": 1, "right": 1, "top": 2, "bottom": 2},
        )


if __name__ == "__main__":
    unittest.main()
