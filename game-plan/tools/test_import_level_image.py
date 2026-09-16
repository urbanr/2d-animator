"""Level alternatives must preserve previous artwork and production selection."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import import_level_image as importer
from downscale_sprites import RgbaImage, read_rgba_png, write_rgba_png


class LevelImportTests(unittest.TestCase):
    def test_alternative_preserves_selection_pixels_and_mechanic(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            levels = base / "graphics" / "levels"
            levels.mkdir(parents=True)
            catalog = levels / "levels.json"
            original = {"mechanic": "existing mechanic", "source": "untouched.png"}
            catalog.write_text(json.dumps({"levels": {"test": {
                "display_name": "Test", "selected_variant": "concept-v1",
                "variants": {"concept-v1": original}}}}))
            source = base / "input.png"
            pixels = bytes([33, 66, 99, 255]) * (48 * 22)
            write_rgba_png(source, RgbaImage(48, 22, pixels))
            argv = ["import_level_image", "test", "Test", str(source),
                    "--variant", "composition-v2", "--keep-size"]
            with patch.multiple(importer, GAME_PLAN_ROOT=base, LEVELS_ROOT=levels, CATALOG=catalog), patch("sys.argv", argv):
                self.assertEqual(importer.main(), 0)
                saved = catalog.read_bytes()
                self.assertEqual(importer.main(), 1)
                self.assertEqual(catalog.read_bytes(), saved)
            level = json.loads(saved)["levels"]["test"]
            self.assertEqual(level["selected_variant"], "concept-v1")
            self.assertEqual(level["variants"]["concept-v1"], original)
            variant = level["variants"]["composition-v2"]
            self.assertEqual(variant["mechanic"], "existing mechanic")
            self.assertEqual(variant["master_size"], [48, 22])
            self.assertEqual(read_rgba_png(base / variant["background_master"]).pixels, pixels)

    def test_legacy_crop_remains_1536_by_704(self):
        image = RgbaImage(1536, 1024, bytes([0, 0, 0, 255]) * (1536 * 1024))
        result = importer.center_crop(image)
        self.assertEqual((result.width, result.height), (1536, 704))
        self.assertEqual(len(result.pixels), 1536 * 704 * 4)


if __name__ == "__main__":
    unittest.main()
