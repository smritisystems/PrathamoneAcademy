# /**
#  * @file        convert_artwork_svgs_to_png.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description High-DPI transparent rasterizer converting all official vector artwork SVGs in frontend/public/artwork/18112026 to crisp PNG assets using PyMuPDF.
#  */

import os
import glob
from pathlib import Path
import fitz

ARTWORK_DIR = Path("frontend/public/artwork/18112026")


def convert_all_svgs():
    svgs = sorted(ARTWORK_DIR.glob("**/*.svg"))
    print(f"Scanning {len(svgs)} SVG files in {ARTWORK_DIR}...")

    converted_count = 0
    for svg_path in svgs:
        png_path = svg_path.with_suffix(".png")
        if not png_path.exists() or png_path.stat().st_size == 0:
            doc = fitz.open(str(svg_path))
            page = doc[0]
            # 2x zoom for high-DPI clarity
            matrix = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=matrix, alpha=True)
            pix.save(str(png_path))
            doc.close()
            print(f"  Converted: {svg_path.name} -> {png_path.name} ({pix.width}x{pix.height})")
            converted_count += 1
        else:
            print(f"  Verified existing: {png_path.name}")

    print(f"\nAll SVGs converted / verified successfully! ({converted_count} new conversions).")


if __name__ == "__main__":
    convert_all_svgs()
