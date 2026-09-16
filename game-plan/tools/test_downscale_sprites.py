#!/usr/bin/env python3

import tempfile
import unittest
import struct
import zlib
from pathlib import Path

from downscale_sprites import (
    ENEMY_PRODUCTION_V1,
    MATTE_RGB,
    RgbaImage,
    apply_ink_blackness,
    apply_outer_edge_darken,
    apply_photopea_darken,
    downscale,
    downscale_to_canvas,
    migrate,
    read_rgba_png,
    write_rgba_png,
)


def solid_rgba(width: int, height: int, color: tuple[int, int, int, int]) -> RgbaImage:
    return RgbaImage(width, height, bytes(color * (width * height)))


class DownscaleSpritesTest(unittest.TestCase):
    def test_reads_non_interlaced_rgb_png_as_opaque_rgba(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "rgb.png"
            ihdr = struct.pack(">IIBBBBB", 2, 1, 8, 2, 0, 0, 0)
            raw = b"\x00\x0a\x14\x1e\x28\x32\x3c"

            def chunk(kind: bytes, payload: bytes) -> bytes:
                checksum = zlib.crc32(payload, zlib.crc32(kind)) & 0xFFFFFFFF
                return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", checksum)

            path.write_bytes(
                b"\x89PNG\r\n\x1a\n"
                + chunk(b"IHDR", ihdr)
                + chunk(b"IDAT", zlib.compress(raw))
                + chunk(b"IEND", b"")
            )
            image = read_rgba_png(path)
            self.assertEqual((image.width, image.height), (2, 1))
            self.assertEqual(image.pixels, bytes((10, 20, 30, 255, 40, 50, 60, 255)))

    def test_enemy_production_profile_is_locked_to_approved_values(self) -> None:
        self.assertEqual(
            ENEMY_PRODUCTION_V1,
            {
                "dark_strength": 0.72,
                "lambda_value": 0.60,
                "dark_threshold": 0.01,
                "detail_floor": 0.03,
                "photopea_brightness": 30,
                "photopea_contrast": 1.40,
                "photopea_darken_opacity": 1.0,
                "outer_edge_strength": 0.45,
                "ink_blackness_strength": 0.25,
                "ink_blackness_threshold": 128,
            },
        )

    def test_preserves_uniform_color_and_dimensions(self) -> None:
        source = solid_rgba(9, 9, (120, 80, 40, 255))
        result = downscale(source, 3, 3)
        self.assertEqual((result.width, result.height), (3, 3))
        self.assertEqual(set(result.pixels[index : index + 4] for index in range(0, len(result.pixels), 4)), {bytes((120, 80, 40, 255))})

    def test_dark_line_is_darker_than_plain_area_average(self) -> None:
        pixels = bytearray((210, 120, 40, 255) * 81)
        for y in range(9):
            offset = (y * 9 + 4) * 4
            pixels[offset : offset + 4] = bytes((5, 5, 5, 255))
        source = RgbaImage(9, 9, bytes(pixels))
        area = downscale(source, 3, 3, dark_strength=0.0)
        dark = downscale(source, 3, 3, dark_strength=0.72)
        for y in range(3):
            area_red = area.pixels[(y * 3 + 1) * 4]
            dark_red = dark.pixels[(y * 3 + 1) * 4]
            self.assertLess(dark_red, area_red - 25)

    def test_transparent_colors_do_not_bleed_and_stay_gray(self) -> None:
        pixels = bytearray((255, 255, 255, 0) * 16)
        pixels[0:4] = bytes((20, 30, 40, 255))
        source = RgbaImage(4, 4, bytes(pixels))
        result = downscale(source, 2, 2)
        self.assertEqual(tuple(result.pixels[12:16]), (*MATTE_RGB, 0))
        self.assertEqual(tuple(result.pixels[4:8]), (*MATTE_RGB, 0))
        self.assertEqual(tuple(result.pixels[8:12]), (*MATTE_RGB, 0))
        self.assertGreater(result.pixels[3], 0)
        self.assertLess(result.pixels[0], 60)

    def test_contain_uses_common_canvas_without_distorting_artwork(self) -> None:
        source = solid_rgba(8, 10, (20, 30, 40, 255))
        result, placement = downscale_to_canvas(source, 10, 10)
        self.assertEqual((result.width, result.height), (10, 10))
        self.assertEqual(placement["fitted_size"], [8, 10])
        self.assertEqual(placement["offset"], [1, 0])
        self.assertEqual(tuple(result.pixels[:4]), (*MATTE_RGB, 0))
        self.assertEqual(tuple(result.pixels[4:8]), (20, 30, 40, 255))

    def test_photopea_darken_strengthens_shadows_but_keeps_highlights(self) -> None:
        source = RgbaImage(2, 1, bytes((40, 100, 220, 255, 80, 80, 80, 0)))
        result = apply_photopea_darken(source, contrast=1.20, darken_opacity=1.0)
        self.assertLess(result.pixels[0], 40)
        self.assertLess(result.pixels[1], 100)
        self.assertEqual(result.pixels[2], 220)
        self.assertEqual(result.pixels[3], 255)
        self.assertEqual(tuple(result.pixels[4:8]), (*MATTE_RGB, 0))

    def test_photopea_brightness_is_applied_before_darken_layer(self) -> None:
        source = RgbaImage(1, 1, bytes((100, 220, 20, 255)))
        result = apply_photopea_darken(
            source,
            brightness=10,
            contrast=1.0,
            darken_opacity=1.0,
        )
        self.assertEqual(tuple(result.pixels), (110, 230, 30, 255))

    def test_outer_edge_darken_changes_boundary_not_interior_or_alpha(self) -> None:
        pixels = bytearray((80, 80, 80, 0) * 25)
        for y in range(1, 4):
            for x in range(1, 4):
                offset = (y * 5 + x) * 4
                pixels[offset : offset + 4] = bytes((100, 120, 140, 255))
        source = RgbaImage(5, 5, bytes(pixels))
        result = apply_outer_edge_darken(source, strength=0.5)
        boundary = (1 * 5 + 1) * 4
        interior = (2 * 5 + 2) * 4
        self.assertEqual(tuple(result.pixels[boundary : boundary + 4]), (50, 60, 70, 255))
        self.assertEqual(tuple(result.pixels[interior : interior + 4]), (100, 120, 140, 255))
        self.assertEqual(result.pixels[3::4], source.pixels[3::4])

    def test_ink_blackness_darkens_existing_ink_without_growing_alpha(self) -> None:
        source = RgbaImage(
            3,
            1,
            bytes((32, 32, 32, 255, 220, 180, 40, 255, 80, 80, 80, 0)),
        )
        result = apply_ink_blackness(source, strength=0.25, threshold=128)
        self.assertLess(result.pixels[0], source.pixels[0])
        self.assertEqual(tuple(result.pixels[4:8]), (220, 180, 40, 255))
        self.assertEqual(tuple(result.pixels[8:12]), (*MATTE_RGB, 0))
        self.assertEqual(result.pixels[3::4], source.pixels[3::4])

    def test_png_round_trip_and_batch_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source_directory = root / "source"
            output_directory = root / "output"
            source_directory.mkdir()
            for index in range(2):
                write_rgba_png(source_directory / f"frame-{index}.png", solid_rgba(10, 8, (30 + index, 40, 50, 255)))
            manifest = migrate(
                source_directory,
                output_directory,
                width=3,
                height=4,
                dark_strength=0.72,
                lambda_value=0.60,
                dark_threshold=0.01,
                detail_floor=0.03,
                overwrite=False,
            )
            self.assertEqual(len(manifest["files"]), 2)
            self.assertTrue((output_directory / "migration.json").is_file())
            decoded = read_rgba_png(output_directory / "frame-0.png")
            self.assertEqual((decoded.width, decoded.height), (3, 4))
            self.assertEqual(manifest["files"][0]["placement"]["fitted_size"], [3, 2])


if __name__ == "__main__":
    unittest.main()
