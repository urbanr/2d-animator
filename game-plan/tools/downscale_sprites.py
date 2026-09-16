#!/usr/bin/env python3
"""Dependency-free dark-detail-preserving downscaler for RGBA PNG sprites.

The algorithm is an asymmetric, dark-preferring adaptation of DPID
(Rapid, Detail-Preserving Image Downscaling, Weber et al., 2016):

1. Build an area-averaged low-resolution guidance image.
2. Blur its luminance with the paper's small 1-2-1 guidance kernel.
3. Reconstruct every output pixel while giving extra weight only to source
   pixels darker than the local guidance luminance.
4. Mix the result with the physically correct area average and preserve alpha
   separately in premultiplied form.

Only Python's standard library is required. Input PNGs must be non-interlaced,
8-bit RGB or RGBA files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import zlib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
MATTE_RGB = (80, 80, 80)
LUMA = (0.2126, 0.7152, 0.0722)
SRGB_TO_LINEAR = tuple(
    value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
    for value in (index / 255.0 for index in range(256))
)
ENEMY_PRODUCTION_V1 = json.loads(
    (Path(__file__).with_name("profiles") / "enemy-production-v1.json").read_text(
        encoding="utf-8"
    )
)["settings"]


@dataclass(frozen=True)
class RgbaImage:
    width: int
    height: int
    pixels: bytes


def _paeth(left: int, up: int, upper_left: int) -> int:
    estimate = left + up - upper_left
    distance_left = abs(estimate - left)
    distance_up = abs(estimate - up)
    distance_upper_left = abs(estimate - upper_left)
    if distance_left <= distance_up and distance_left <= distance_upper_left:
        return left
    if distance_up <= distance_upper_left:
        return up
    return upper_left


def read_rgba_png(path: Path) -> RgbaImage:
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError(f"{path}: not a PNG file")

    offset = len(PNG_SIGNATURE)
    width = height = channels = None
    compressed = bytearray()
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError(f"{path}: truncated PNG chunk")
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk_data = data[offset + 8 : offset + 8 + length]
        expected_crc = struct.unpack(">I", data[offset + 8 + length : offset + 12 + length])[0]
        actual_crc = zlib.crc32(chunk_type)
        actual_crc = zlib.crc32(chunk_data, actual_crc) & 0xFFFFFFFF
        if actual_crc != expected_crc:
            raise ValueError(f"{path}: invalid CRC in {chunk_type.decode('ascii', 'replace')} chunk")
        offset += 12 + length

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(
                ">IIBBBBB", chunk_data
            )
            if (
                bit_depth != 8
                or color_type not in (2, 6)
                or compression != 0
                or filtering != 0
                or interlace != 0
            ):
                raise ValueError(
                    f"{path}: expected non-interlaced 8-bit RGB or RGBA PNG; got "
                    f"bit_depth={bit_depth}, color_type={color_type}, interlace={interlace}"
                )
            channels = 3 if color_type == 2 else 4
        elif chunk_type == b"IDAT":
            compressed.extend(chunk_data)
        elif chunk_type == b"IEND":
            break

    if width is None or height is None or channels is None:
        raise ValueError(f"{path}: missing IHDR chunk")

    raw = zlib.decompress(bytes(compressed))
    stride = width * channels
    expected_size = height * (stride + 1)
    if len(raw) != expected_size:
        raise ValueError(f"{path}: unexpected decompressed size {len(raw)}; expected {expected_size}")

    pixels = bytearray(height * stride)
    previous = bytearray(stride)
    source_offset = 0
    for row_index in range(height):
        filter_type = raw[source_offset]
        source_offset += 1
        encoded = raw[source_offset : source_offset + stride]
        source_offset += stride
        decoded = bytearray(stride)
        for index, value in enumerate(encoded):
            left = decoded[index - channels] if index >= channels else 0
            up = previous[index]
            upper_left = previous[index - channels] if index >= channels else 0
            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = up
            elif filter_type == 3:
                predictor = (left + up) // 2
            elif filter_type == 4:
                predictor = _paeth(left, up, upper_left)
            else:
                raise ValueError(f"{path}: unsupported PNG filter {filter_type}")
            decoded[index] = (value + predictor) & 0xFF
        row_start = row_index * stride
        pixels[row_start : row_start + stride] = decoded
        previous = decoded
    if channels == 4:
        rgba_pixels = pixels
    else:
        rgba_pixels = bytearray(width * height * 4)
        for source_offset in range(0, len(pixels), 3):
            target_offset = (source_offset // 3) * 4
            rgba_pixels[target_offset : target_offset + 4] = pixels[source_offset : source_offset + 3] + b"\xff"
    return RgbaImage(width, height, bytes(rgba_pixels))


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type)
    crc = zlib.crc32(data, crc) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def write_rgba_png(path: Path, image: RgbaImage) -> None:
    stride = image.width * 4
    rows = bytearray()
    for row_index in range(image.height):
        rows.append(0)
        start = row_index * stride
        rows.extend(image.pixels[start : start + stride])
    ihdr = struct.pack(">IIBBBBB", image.width, image.height, 8, 6, 0, 0, 0)
    payload = (
        PNG_SIGNATURE
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + _png_chunk(b"IEND", b"")
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def _linear_to_srgb_byte(value: float) -> int:
    value = min(1.0, max(0.0, value))
    if value <= 0.0031308:
        encoded = value * 12.92
    else:
        encoded = 1.055 * (value ** (1.0 / 2.4)) - 0.055
    return min(255, max(0, round(encoded * 255.0)))


def _axis_contributions(source_size: int, target_size: int) -> list[list[tuple[int, float]]]:
    scale = source_size / target_size
    result: list[list[tuple[int, float]]] = []
    for target_index in range(target_size):
        start = target_index * scale
        end = (target_index + 1) * scale
        first = math.floor(start)
        last = math.ceil(end)
        contributors: list[tuple[int, float]] = []
        for source_index in range(first, last):
            if 0 <= source_index < source_size:
                overlap = min(end, source_index + 1.0) - max(start, source_index)
                if overlap > 0.0:
                    contributors.append((source_index, overlap))
        result.append(contributors)
    return result


def _pixel_linear(image: RgbaImage, x: int, y: int) -> tuple[float, float, float, float]:
    offset = (y * image.width + x) * 4
    pixels = image.pixels
    return (
        SRGB_TO_LINEAR[pixels[offset]],
        SRGB_TO_LINEAR[pixels[offset + 1]],
        SRGB_TO_LINEAR[pixels[offset + 2]],
        pixels[offset + 3] / 255.0,
    )


def _area_base(
    image: RgbaImage,
    target_width: int,
    target_height: int,
    x_contrib: list[list[tuple[int, float]]],
    y_contrib: list[list[tuple[int, float]]],
) -> tuple[list[tuple[float, float, float]], list[float]]:
    footprint_area = (image.width / target_width) * (image.height / target_height)
    colors: list[tuple[float, float, float]] = []
    alphas: list[float] = []
    matte_linear = tuple(SRGB_TO_LINEAR[channel] for channel in MATTE_RGB)
    for target_y in range(target_height):
        for target_x in range(target_width):
            alpha_sum = red = green = blue = 0.0
            for source_y, weight_y in y_contrib[target_y]:
                for source_x, weight_x in x_contrib[target_x]:
                    area = weight_x * weight_y
                    source_red, source_green, source_blue, source_alpha = _pixel_linear(
                        image, source_x, source_y
                    )
                    alpha_area = area * source_alpha
                    alpha_sum += alpha_area
                    red += source_red * alpha_area
                    green += source_green * alpha_area
                    blue += source_blue * alpha_area
            if alpha_sum > 1e-12:
                colors.append((red / alpha_sum, green / alpha_sum, blue / alpha_sum))
            else:
                colors.append(matte_linear)
            alphas.append(min(1.0, max(0.0, alpha_sum / footprint_area)))
    return colors, alphas


def _guidance_luminance(
    colors: list[tuple[float, float, float]],
    alphas: list[float],
    width: int,
    height: int,
) -> list[float]:
    kernel = (1.0, 2.0, 1.0)
    luminance = [sum(channel * coefficient for channel, coefficient in zip(color, LUMA)) for color in colors]
    guidance: list[float] = []
    for y in range(height):
        for x in range(width):
            weighted_sum = weight_sum = 0.0
            for offset_y, weight_y in zip((-1, 0, 1), kernel):
                neighbour_y = y + offset_y
                if not 0 <= neighbour_y < height:
                    continue
                for offset_x, weight_x in zip((-1, 0, 1), kernel):
                    neighbour_x = x + offset_x
                    if not 0 <= neighbour_x < width:
                        continue
                    index = neighbour_y * width + neighbour_x
                    weight = weight_x * weight_y * alphas[index]
                    weighted_sum += luminance[index] * weight
                    weight_sum += weight
            own_index = y * width + x
            guidance.append(weighted_sum / weight_sum if weight_sum > 1e-12 else luminance[own_index])
    return guidance


def downscale(
    image: RgbaImage,
    target_width: int,
    target_height: int,
    *,
    dark_strength: float = 0.72,
    lambda_value: float = 0.60,
    dark_threshold: float = 0.01,
    detail_floor: float = 0.03,
) -> RgbaImage:
    if target_width <= 0 or target_height <= 0:
        raise ValueError("target dimensions must be positive")
    if target_width > image.width or target_height > image.height:
        raise ValueError("this tool only downscales; target dimensions must not exceed the source")
    if not 0.0 <= dark_strength <= 1.0:
        raise ValueError("dark_strength must be between 0 and 1")
    if lambda_value <= 0.0:
        raise ValueError("lambda_value must be positive")
    if dark_threshold < 0.0 or detail_floor <= 0.0:
        raise ValueError("dark_threshold must be non-negative and detail_floor positive")

    x_contrib = _axis_contributions(image.width, target_width)
    y_contrib = _axis_contributions(image.height, target_height)
    base_colors, output_alphas = _area_base(
        image, target_width, target_height, x_contrib, y_contrib
    )
    guidance = _guidance_luminance(base_colors, output_alphas, target_width, target_height)
    output = bytearray(target_width * target_height * 4)

    for target_y in range(target_height):
        for target_x in range(target_width):
            output_index = target_y * target_width + target_x
            detail_weight = detail_red = detail_green = detail_blue = 0.0
            local_guidance = guidance[output_index]
            for source_y, weight_y in y_contrib[target_y]:
                for source_x, weight_x in x_contrib[target_x]:
                    source_red, source_green, source_blue, source_alpha = _pixel_linear(
                        image, source_x, source_y
                    )
                    if source_alpha <= 0.0:
                        continue
                    source_luminance = (
                        source_red * LUMA[0] + source_green * LUMA[1] + source_blue * LUMA[2]
                    )
                    dark_difference = max(0.0, local_guidance - source_luminance - dark_threshold)
                    importance = detail_floor + dark_difference**lambda_value
                    weight = weight_x * weight_y * source_alpha * importance
                    detail_weight += weight
                    detail_red += source_red * weight
                    detail_green += source_green * weight
                    detail_blue += source_blue * weight

            base_red, base_green, base_blue = base_colors[output_index]
            if detail_weight > 1e-12:
                detail_color = (
                    detail_red / detail_weight,
                    detail_green / detail_weight,
                    detail_blue / detail_weight,
                )
            else:
                detail_color = (base_red, base_green, base_blue)
            final_color = tuple(
                base * (1.0 - dark_strength) + detail * dark_strength
                for base, detail in zip((base_red, base_green, base_blue), detail_color)
            )

            byte_offset = output_index * 4
            alpha_byte = min(255, max(0, round(output_alphas[output_index] * 255.0)))
            if alpha_byte == 0:
                output[byte_offset : byte_offset + 4] = bytes((*MATTE_RGB, 0))
            else:
                output[byte_offset] = _linear_to_srgb_byte(final_color[0])
                output[byte_offset + 1] = _linear_to_srgb_byte(final_color[1])
                output[byte_offset + 2] = _linear_to_srgb_byte(final_color[2])
                output[byte_offset + 3] = alpha_byte
    return RgbaImage(target_width, target_height, bytes(output))


def downscale_to_canvas(
    image: RgbaImage,
    canvas_width: int,
    canvas_height: int,
    *,
    fit: str = "contain",
    anchor: str = "bottom-center",
    dark_strength: float = 0.72,
    lambda_value: float = 0.60,
    dark_threshold: float = 0.01,
    detail_floor: float = 0.03,
) -> tuple[RgbaImage, dict[str, object]]:
    """Downscale without changing aspect ratio, then place on a fixed canvas."""
    if fit not in {"contain", "stretch"}:
        raise ValueError("fit must be 'contain' or 'stretch'")
    if anchor not in {"center", "bottom-center"}:
        raise ValueError("anchor must be 'center' or 'bottom-center'")

    if fit == "stretch":
        fitted_width, fitted_height = canvas_width, canvas_height
    else:
        scale = min(canvas_width / image.width, canvas_height / image.height)
        fitted_width = max(1, round(image.width * scale))
        fitted_height = max(1, round(image.height * scale))

    fitted = downscale(
        image,
        fitted_width,
        fitted_height,
        dark_strength=dark_strength,
        lambda_value=lambda_value,
        dark_threshold=dark_threshold,
        detail_floor=detail_floor,
    )
    offset_x = round((canvas_width - fitted_width) / 2)
    offset_y = (
        canvas_height - fitted_height
        if anchor == "bottom-center"
        else round((canvas_height - fitted_height) / 2)
    )
    canvas = bytearray(bytes((*MATTE_RGB, 0)) * (canvas_width * canvas_height))
    source_stride = fitted_width * 4
    destination_stride = canvas_width * 4
    for row in range(fitted_height):
        source_start = row * source_stride
        destination_start = ((row + offset_y) * destination_stride) + offset_x * 4
        canvas[destination_start : destination_start + source_stride] = fitted.pixels[
            source_start : source_start + source_stride
        ]
    return (
        RgbaImage(canvas_width, canvas_height, bytes(canvas)),
        {
            "fit": fit,
            "anchor": anchor,
            "fitted_size": [fitted_width, fitted_height],
            "offset": [offset_x, offset_y],
        },
    )


def apply_photopea_darken(
    image: RgbaImage,
    *,
    brightness: int = 0,
    contrast: float = 1.18,
    darken_opacity: float = 0.80,
) -> RgbaImage:
    """Approximate a contrast-adjusted duplicate layer in Photopea Darken mode.

    The contrast layer pushes channels away from the sRGB midpoint. Darken
    selects the lower value per channel; therefore shadows and ink become
    stronger while bright green, amber, and other highlights are retained.
    """
    if not -255 <= brightness <= 255:
        raise ValueError("photopea brightness must be between -255 and 255")
    if contrast < 1.0:
        raise ValueError("photopea contrast must be at least 1")
    if not 0.0 <= darken_opacity <= 1.0:
        raise ValueError("photopea darken opacity must be between 0 and 1")
    output = bytearray(image.pixels)
    for offset in range(0, len(output), 4):
        if output[offset + 3] == 0:
            output[offset : offset + 4] = bytes((*MATTE_RGB, 0))
            continue
        for channel in range(3):
            base = min(255, max(0, output[offset + channel] + brightness))
            contrast_value = min(255, max(0, round(128.0 + (base - 128.0) * contrast)))
            darken_value = min(base, contrast_value)
            output[offset + channel] = round(
                base * (1.0 - darken_opacity) + darken_value * darken_opacity
            )
    return RgbaImage(image.width, image.height, bytes(output))


def apply_outer_edge_darken(
    image: RgbaImage,
    *,
    strength: float = 0.45,
) -> RgbaImage:
    """Darken visible pixels next to transparency without expanding alpha.

    This reinforces the external silhouette but leaves internal shadows and
    colored areas alone. The edge mask is derived only from alpha differences,
    so its position remains deterministic across animation frames.
    """
    if not 0.0 <= strength <= 1.0:
        raise ValueError("outer edge strength must be between 0 and 1")
    width, height = image.width, image.height
    source = image.pixels
    output = bytearray(source)
    for y in range(height):
        for x in range(width):
            offset = (y * width + x) * 4
            alpha = source[offset + 3] / 255.0
            if alpha <= 0.0:
                output[offset : offset + 4] = bytes((*MATTE_RGB, 0))
                continue
            minimum_neighbour_alpha = alpha
            for neighbour_y in range(max(0, y - 1), min(height, y + 2)):
                for neighbour_x in range(max(0, x - 1), min(width, x + 2)):
                    if neighbour_x == x and neighbour_y == y:
                        continue
                    neighbour_offset = (neighbour_y * width + neighbour_x) * 4
                    neighbour_alpha = source[neighbour_offset + 3] / 255.0
                    minimum_neighbour_alpha = min(minimum_neighbour_alpha, neighbour_alpha)
            edge_amount = max(0.0, 1.0 - minimum_neighbour_alpha / alpha)
            multiplier = 1.0 - strength * edge_amount
            for channel in range(3):
                output[offset + channel] = round(source[offset + channel] * multiplier)
    return RgbaImage(width, height, bytes(output))


def apply_ink_blackness(
    image: RgbaImage,
    *,
    strength: float = 0.25,
    threshold: int = 128,
) -> RgbaImage:
    """Make existing dark ink darker without changing its width or alpha.

    Pixels above the luminance threshold are untouched. Darker pixels are
    progressively pulled toward black. No neighbours are sampled, so the
    contour cannot grow into adjacent pixels.
    """
    if not 0.0 <= strength <= 1.0:
        raise ValueError("ink blackness strength must be between 0 and 1")
    if not 1 <= threshold <= 255:
        raise ValueError("ink blackness threshold must be between 1 and 255")
    output = bytearray(image.pixels)
    for offset in range(0, len(output), 4):
        if output[offset + 3] == 0:
            output[offset : offset + 4] = bytes((*MATTE_RGB, 0))
            continue
        red, green, blue = output[offset : offset + 3]
        luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        ink_amount = max(0.0, min(1.0, (threshold - luminance) / threshold))
        multiplier = 1.0 - strength * ink_amount
        for channel in range(3):
            output[offset + channel] = round(output[offset + channel] * multiplier)
    return RgbaImage(image.width, image.height, bytes(output))


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _input_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]
    if input_path.is_dir():
        files = sorted(path for path in input_path.iterdir() if path.suffix.lower() == ".png")
        if not files:
            raise ValueError(f"{input_path}: directory contains no PNG files")
        return files
    raise ValueError(f"{input_path}: input does not exist")


def migrate(
    input_path: Path,
    output_path: Path,
    *,
    width: int,
    height: int,
    dark_strength: float,
    lambda_value: float,
    dark_threshold: float,
    detail_floor: float,
    overwrite: bool,
    fit: str = "contain",
    anchor: str = "bottom-center",
    photopea_brightness: int = 0,
    photopea_contrast: float = 1.0,
    photopea_darken_opacity: float = 0.0,
    outer_edge_strength: float = 0.0,
    ink_blackness_strength: float = 0.0,
    ink_blackness_threshold: int = 128,
    profile_name: str = "custom",
) -> dict[str, object]:
    source_files = _input_files(input_path)
    is_batch = input_path.is_dir()
    if is_batch:
        output_path.mkdir(parents=True, exist_ok=True)
    elif output_path.exists() and output_path.is_dir():
        output_path = output_path / input_path.name

    records: list[dict[str, object]] = []
    for source_file in source_files:
        destination = output_path / source_file.name if is_batch else output_path
        if destination.exists() and not overwrite:
            raise FileExistsError(f"{destination}: output exists; pass --overwrite to replace it")
        source = read_rgba_png(source_file)
        result, placement = downscale_to_canvas(
            source,
            width,
            height,
            fit=fit,
            anchor=anchor,
            dark_strength=dark_strength,
            lambda_value=lambda_value,
            dark_threshold=dark_threshold,
            detail_floor=detail_floor,
        )
        if photopea_darken_opacity > 0.0:
            result = apply_photopea_darken(
                result,
                brightness=photopea_brightness,
                contrast=photopea_contrast,
                darken_opacity=photopea_darken_opacity,
            )
        if outer_edge_strength > 0.0:
            result = apply_outer_edge_darken(result, strength=outer_edge_strength)
        if ink_blackness_strength > 0.0:
            result = apply_ink_blackness(
                result,
                strength=ink_blackness_strength,
                threshold=ink_blackness_threshold,
            )
        write_rgba_png(destination, result)
        verified = read_rgba_png(destination)
        if (verified.width, verified.height, len(verified.pixels)) != (
            width,
            height,
            width * height * 4,
        ):
            raise RuntimeError(f"verification failed for {destination}")
        records.append(
            {
                "source": str(source_file),
                "source_size": [source.width, source.height],
                "source_sha256": _sha256(source_file),
                "output": str(destination),
                "canvas_size": [width, height],
                "placement": placement,
                "output_sha256": _sha256(destination),
            }
        )

    if ink_blackness_strength > 0.0:
        algorithm = "dark-dpid-photopea-ink-v1"
    elif outer_edge_strength > 0.0:
        algorithm = "dark-dpid-photopea-outline-v1"
    elif photopea_darken_opacity > 0.0:
        algorithm = "dark-dpid-photopea-v2" if photopea_brightness else "dark-dpid-photopea-v1"
    else:
        algorithm = "dark-dpid-v1"
    manifest = {
        "schema_version": 1,
        "profile": profile_name,
        "algorithm": algorithm,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "dark_strength": dark_strength,
            "lambda": lambda_value,
            "dark_threshold_linear": dark_threshold,
            "detail_floor": detail_floor,
            "color_space": "linear-sRGB",
            "alpha": "area-averaged premultiplied RGBA",
            "transparent_pixel_rgb": list(MATTE_RGB),
            "fit": fit,
            "anchor": anchor,
            "photopea_brightness_srgb": photopea_brightness,
            "photopea_contrast": photopea_contrast,
            "photopea_darken_opacity": photopea_darken_opacity,
            "outer_edge_strength": outer_edge_strength,
            "ink_blackness_strength": ink_blackness_strength,
            "ink_blackness_threshold_srgb": ink_blackness_threshold,
        },
        "files": records,
    }
    if is_batch:
        manifest_path = output_path / "migration.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Downscale one RGBA PNG or a directory of PNG frames while preserving dark ink details."
    )
    parser.add_argument("input", type=Path, help="input PNG or directory containing PNG frames")
    parser.add_argument("output", type=Path, help="output PNG or directory")
    parser.add_argument("--width", type=int, required=True, help="target width in pixels")
    parser.add_argument("--height", type=int, required=True, help="target height in pixels")
    parser.add_argument(
        "--dark-strength",
        type=float,
        default=0.72,
        help="mix of dark-detail result over area average, 0..1 (default: 0.72)",
    )
    parser.add_argument(
        "--profile",
        choices=("dark-dpid", "photopea-darken", "enemy-production-v1"),
        default="dark-dpid",
        help="finishing profile; enemy-production-v1 is the fixed approved regular-enemy preprocessing",
    )
    parser.add_argument(
        "--photopea-brightness",
        type=int,
        default=0,
        help="sRGB brightness offset before the contrast and Darken layer (default: 0)",
    )
    parser.add_argument(
        "--photopea-contrast",
        type=float,
        default=1.18,
        help="contrast-layer factor for photopea-darken (default: 1.18)",
    )
    parser.add_argument(
        "--photopea-darken-opacity",
        type=float,
        default=0.80,
        help="Darken-layer opacity for photopea-darken, 0..1 (default: 0.80)",
    )
    parser.add_argument(
        "--outer-edge-strength",
        type=float,
        default=0.0,
        help="darken only pixels bordering transparency, 0..1 (default: 0)",
    )
    parser.add_argument(
        "--ink-blackness-strength",
        type=float,
        default=0.0,
        help="pull existing dark pixels toward black without widening them, 0..1 (default: 0)",
    )
    parser.add_argument(
        "--ink-blackness-threshold",
        type=int,
        default=128,
        help="sRGB luminance below which ink blackness is applied, 1..255 (default: 128)",
    )
    parser.add_argument(
        "--fit",
        choices=("contain", "stretch"),
        default="contain",
        help="preserve aspect ratio inside the canvas or stretch to fill it (default: contain)",
    )
    parser.add_argument(
        "--anchor",
        choices=("bottom-center", "center"),
        default="bottom-center",
        help="placement of contained artwork inside the canvas (default: bottom-center)",
    )
    parser.add_argument(
        "--lambda",
        dest="lambda_value",
        type=float,
        default=0.60,
        help="DPID dark-distinctness exponent (default: 0.60)",
    )
    parser.add_argument(
        "--dark-threshold",
        type=float,
        default=0.01,
        help="ignore smaller linear-luminance differences (default: 0.01)",
    )
    parser.add_argument(
        "--detail-floor",
        type=float,
        default=0.03,
        help="baseline weight that prevents pure min-pooling behavior (default: 0.03)",
    )
    parser.add_argument("--overwrite", action="store_true", help="replace existing outputs")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.profile == "enemy-production-v1":
        settings = ENEMY_PRODUCTION_V1
    else:
        settings = {
            "dark_strength": args.dark_strength,
            "lambda_value": args.lambda_value,
            "dark_threshold": args.dark_threshold,
            "detail_floor": args.detail_floor,
            "photopea_brightness": args.photopea_brightness,
            "photopea_contrast": args.photopea_contrast,
            "photopea_darken_opacity": (
                args.photopea_darken_opacity if args.profile == "photopea-darken" else 0.0
            ),
            "outer_edge_strength": args.outer_edge_strength,
            "ink_blackness_strength": args.ink_blackness_strength,
            "ink_blackness_threshold": args.ink_blackness_threshold,
        }
    try:
        manifest = migrate(
            args.input,
            args.output,
            width=args.width,
            height=args.height,
            dark_strength=settings["dark_strength"],
            lambda_value=settings["lambda_value"],
            dark_threshold=settings["dark_threshold"],
            detail_floor=settings["detail_floor"],
            overwrite=args.overwrite,
            fit=args.fit,
            anchor=args.anchor,
            photopea_brightness=settings["photopea_brightness"],
            photopea_contrast=settings["photopea_contrast"],
            photopea_darken_opacity=settings["photopea_darken_opacity"],
            outer_edge_strength=settings["outer_edge_strength"],
            ink_blackness_strength=settings["ink_blackness_strength"],
            ink_blackness_threshold=settings["ink_blackness_threshold"],
            profile_name=args.profile,
        )
    except (OSError, ValueError, RuntimeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(
        f"Migrated {len(manifest['files'])} PNG file(s) to {args.width}x{args.height} "
        f"using {manifest['algorithm']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
