# /**
#  * @file        prepare_installer_artwork.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.prepare_installer_artwork
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-15
#  *
#  * @description Generates multi-resolution .ico, wizard banner, and small logo bitmaps
#  */

from pathlib import Path
from PIL import Image


def generate_installer_assets():
    root_dir = Path(__file__).resolve().parent.parent
    artwork_dir = root_dir / "frontend" / "public" / "artwork" / "16112026"
    assets_dir = root_dir / "installer" / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    src_logo = artwork_dir / "batch_rect10_10802.png"
    src_banner = artwork_dir / "batch_rect10-2-0-9_10802.png"

    if not src_logo.exists():
        src_logo = artwork_dir / "batch_rect10-2_10802.png"

    print(f"[ARTWORK] Loading source logo: {src_logo.name}")
    logo_img = Image.open(src_logo).convert("RGBA")

    # 1. Generate multi-resolution .ico file
    ico_path = assets_dir / "app_icon.ico"
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    logo_img.save(ico_path, format="ICO", sizes=icon_sizes)
    print(f"[ARTWORK SUCCESS] Generated Windows icon: {ico_path} with sizes {icon_sizes}")

    # Copy to frontend favicon
    logo_img.resize((64, 64), Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS).save(
        root_dir / "frontend" / "public" / "favicon.ico", format="ICO"
    )
    if (root_dir / "frontend" / "dist").exists():
        logo_img.resize((64, 64), Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS).save(
            root_dir / "frontend" / "dist" / "favicon.ico", format="ICO"
        )

    # 2. Generate Inno Setup WizardSmallImage (55x55 24-bit BMP with white background)
    small_bmp_path = assets_dir / "wizard_small.bmp"
    bg_small = Image.new("RGB", (55, 55), (255, 255, 255))
    logo_small = logo_img.resize((48, 48), Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS)
    bg_small.paste(logo_small, (3, 3), mask=logo_small.split()[3])
    bg_small.save(small_bmp_path, format="BMP")
    print(f"[ARTWORK SUCCESS] Generated WizardSmallImage: {small_bmp_path} (55x55 BMP)")

    # 3. Generate Inno Setup WizardImage (164x314 24-bit BMP with branded background)
    large_bmp_path = assets_dir / "wizard_large.bmp"
    banner_w, banner_h = 164, 314
    bg_large = Image.new("RGB", (banner_w, banner_h), (255, 255, 255))

    if src_banner.exists():
        print(f"[ARTWORK] Loading source banner: {src_banner.name}")
        banner_img = Image.open(src_banner).convert("RGBA")
        # Resize banner to fit within 164x314 preserving aspect ratio
        banner_img.thumbnail((banner_w - 10, banner_h - 20), Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS)
        bx = (banner_w - banner_img.width) // 2
        by = (banner_h - banner_img.height) // 2
        bg_large.paste(banner_img, (bx, by), mask=banner_img.split()[3])
    else:
        # Fall back to centering logo on branded canvas
        logo_fitted = logo_img.resize((120, 120), Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS)
        bg_large.paste(logo_fitted, (22, 97), mask=logo_fitted.split()[3])

    bg_large.save(large_bmp_path, format="BMP")
    print(f"[ARTWORK SUCCESS] Generated WizardImage: {large_bmp_path} (164x314 BMP)")


if __name__ == "__main__":
    generate_installer_assets()
