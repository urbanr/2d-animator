#!/usr/bin/env python3

import json
import tempfile
import unittest
from pathlib import Path

from downscale_sprites import RgbaImage, write_rgba_png
from sprite_alignment import catalog_alignment_key, set_frame_offsets
from sprite_variants import build_gallery_data, build_game_data, create_variant, select_variant


class SpriteVariantsTest(unittest.TestCase):
    def test_create_alternative_then_select_and_generate_game_data(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            game_plan = Path(temporary_directory) / "game-plan"
            graphics = game_plan / "graphics"
            source = graphics / "test-enemy" / "rage-gray-v2" / "frames"
            source.mkdir(parents=True)
            for index in range(8):
                color = (30 + index, 60 + index, 90 + index, 255)
                write_rgba_png(
                    source / f"test-enemy-walk-{index:02d}.png",
                    RgbaImage(8, 8, bytes(color * 64)),
                )
            catalog_path = graphics / "sprite-variants.json"
            catalog_path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "characters": {
                            "test-enemy": {
                                "source_directory": "graphics/test-enemy/rage-gray-v2/frames",
                                "canvas_pixels": [4, 4],
                                "texture_scale": 1,
                                "fit": "contain",
                                "anchor": "bottom-center",
                                "selected_variant": None,
                                "variants": {},
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )
            game_data_path = graphics / "game-sprites.generated.json"

            create_variant(
                catalog_path,
                "test-enemy",
                "darker-test",
                "enemy-production-v1",
                ["ink_blackness_strength=0.4"],
                "Darker alternative",
            )
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
            variant = catalog["characters"]["test-enemy"]["variants"]["darker-test"]
            self.assertEqual(variant["status"], "alternative")
            self.assertEqual(variant["parameter_overrides"], ["ink_blackness_strength=0.4"])
            self.assertFalse(game_data_path.exists())

            result = select_variant(
                catalog_path,
                game_data_path,
                "test-enemy",
                "darker-test",
            )
            self.assertEqual(result["sprites"]["test-enemy"]["variant"], "darker-test")
            self.assertEqual(len(result["sprites"]["test-enemy"]["frames"]), 8)
            self.assertTrue(game_data_path.is_file())
            gallery_data_path = game_plan / "tool" / "sprite-variants.generated.js"
            gallery_items = build_gallery_data(catalog_path, gallery_data_path)
            self.assertEqual(len(gallery_items), 1)
            self.assertEqual(gallery_items[0]["group"], "current")
            self.assertEqual(gallery_items[0]["frameOffsets"], [{"x": 0, "y": 0}] * 8)
            self.assertTrue(gallery_data_path.is_file())

            offsets = [{"x": index - 3, "y": index} for index in range(8)]
            set_frame_offsets(
                graphics / "sprite-frame-offsets.json",
                catalog_alignment_key("test-enemy", "darker-test"),
                offsets,
            )
            rebuilt = build_game_data(catalog_path, game_data_path)
            self.assertEqual(
                rebuilt["sprites"]["test-enemy"]["frames"][7]["offset_pixels"],
                {"x": 4, "y": 7},
            )
            refreshed_gallery = build_gallery_data(catalog_path, gallery_data_path)
            self.assertEqual(refreshed_gallery[0]["frameOffsets"], offsets)
            self.assertTrue((game_plan / "tool" / "sprite-frame-offsets.generated.js").is_file())

            # A wraparound swap keeps the edited offset attached to its image.
            order = [8, 2, 3, 4, 5, 6, 7, 1]
            offsets[0], offsets[7] = offsets[7], offsets[0]
            store_path = graphics / "sprite-frame-offsets.json"
            key = catalog_alignment_key("test-enemy", "darker-test")
            set_frame_offsets(store_path, key, offsets, order)
            exported = build_game_data(catalog_path, game_data_path)["sprites"]["test-enemy"]["frames"]
            self.assertTrue(exported[0]["file"].endswith("-07.png"))
            self.assertEqual(exported[0]["offset_pixels"], {"x": 4, "y": 7})
            self.assertTrue(exported[7]["file"].endswith("-00.png"))
            self.assertEqual(exported[7]["offset_pixels"], {"x": -3, "y": 0})
            gallery = build_gallery_data(catalog_path, gallery_data_path)[0]
            self.assertEqual(gallery["frameOrder"], order)
            self.assertTrue(gallery["frames"][order[0] - 1].endswith("-07.png"))
            before = store_path.read_bytes()
            with self.assertRaises(ValueError):
                set_frame_offsets(store_path, key, offsets, [1] * 8)
            self.assertEqual(store_path.read_bytes(), before)
            # An older offsets-only client must not erase the saved ordering.
            set_frame_offsets(store_path, key, offsets)
            self.assertEqual(json.loads(store_path.read_text())["animations"][key]["frame_order"], order)

            original_source = catalog["characters"]["test-enemy"]["source_directory"]
            alternate = graphics / "test-enemy" / "pose-sprint" / "frames"
            alternate.mkdir(parents=True)
            for frame in source.glob("*.png"):
                (alternate / frame.name).write_bytes(frame.read_bytes())
            create_variant(catalog_path, "test-enemy", "pose-sprint", "enemy-production-v1", [],
                           "Pose experiment", source_directory="graphics/test-enemy/pose-sprint/frames", fps=12)
            after = json.loads(catalog_path.read_text())["characters"]["test-enemy"]
            self.assertEqual(after["source_directory"], original_source)
            self.assertEqual(after["selected_variant"], "darker-test")
            self.assertEqual(after["variants"]["pose-sprint"]["fps"], 12)
            gallery = build_gallery_data(catalog_path, gallery_data_path)
            self.assertEqual(next(item for item in gallery if item["variant"] == "pose-sprint")["fps"], 12)
            exported = select_variant(catalog_path, game_data_path, "test-enemy", "pose-sprint")
            self.assertEqual(exported["sprites"]["test-enemy"]["fps"], 12)
            with self.assertRaises(ValueError):
                create_variant(catalog_path, "test-enemy", "outside", "enemy-production-v1", [], "",
                               source_directory="../outside", fps=8)
            with self.assertRaises(ValueError):
                create_variant(catalog_path, "test-enemy", "invalid-fps", "enemy-production-v1", [], "", fps=0)


if __name__ == "__main__":
    unittest.main()
