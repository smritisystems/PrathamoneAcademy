# /**
#  * @file        apply_new_brand_logo.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-13
#  * @updated     2026-11-13
#  *
#  * @description Production asset generator and branding synchronizer that installs the new PrathamOne logo and icon from frontend/public/logo into global software branding, favicons, PWA icons, and media assets.
#  */

import os
import shutil
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(BASE_DIR, "frontend", "public", "logo")
PUBLIC_DIR = os.path.join(BASE_DIR, "frontend", "public")
MEDIA_LOGO_DIR = os.path.join(PUBLIC_DIR, "media", "logo")
ICONS_DIR = os.path.join(PUBLIC_DIR, "icons")
DOCS_BRANDING_DIR = os.path.join(BASE_DIR, "docs", "assets", "branding")

os.makedirs(MEDIA_LOGO_DIR, exist_ok=True)
os.makedirs(ICONS_DIR, exist_ok=True)
os.makedirs(DOCS_BRANDING_DIR, exist_ok=True)

SOURCE_LOGO_SVG = os.path.join(LOGO_DIR, "logoone.svg")
SOURCE_LOGO_1080 = os.path.join(LOGO_DIR, "logoone1080.png")
SOURCE_LOGO_256 = os.path.join(LOGO_DIR, "logoone256.png")
SOURCE_ICON_SVG = os.path.join(LOGO_DIR, "logo_rect2-7-9-1.svg")
SOURCE_ICON_PNG = os.path.join(LOGO_DIR, "logo_rect2-7-9-1.png")

print(f"[INFO] Source Logo 1080: {SOURCE_LOGO_1080} (exists={os.path.exists(SOURCE_LOGO_1080)})")
print(f"[INFO] Source Icon SVG:  {SOURCE_ICON_SVG} (exists={os.path.exists(SOURCE_ICON_SVG)})")

# 1. Copy Favicon SVG directly
favicon_svg_target = os.path.join(PUBLIC_DIR, "favicon.svg")
shutil.copy2(SOURCE_ICON_SVG, favicon_svg_target)
print(f"[SUCCESS] Updated {favicon_svg_target}")

# Also copy icon.svg in icons dir
icon_svg_target = os.path.join(ICONS_DIR, "icon.svg")
shutil.copy2(SOURCE_ICON_SVG, icon_svg_target)
print(f"[SUCCESS] Updated {icon_svg_target}")

# 2. Render Icon Raster Sizes using PyMuPDF if available, or load high-res icon
# Check if PyMuPDF (fitz) is available
has_fitz = False
try:
    import fitz
    has_fitz = True
    print("[INFO] PyMuPDF (fitz) is available on host.")
except ImportError:
    print("[INFO] PyMuPDF not available on host; will render via Docker or high-res raster.")

def render_svg_to_png(svg_path, out_path, size):
    if has_fitz:
        doc = fitz.open(svg_path)
        page = doc[0]
        rect = page.rect
        scale = float(size) / float(rect.width)
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=True)
        pix.save(out_path)
        return True
    return False

# If on host fitz is not installed, we can run PyMuPDF inside the backend docker container
def render_icon_sizes_via_docker():
    import subprocess
    cmd = (
        'docker exec -u root prashant_academy_backend python -c "'
        'import fitz\n'
        'doc = fitz.open(\'/tmp/logo/logo_rect2-7-9-1.svg\')\n'
        'page = doc[0]\n'
        'rect = page.rect\n'
        'for size in [512, 192, 180, 128, 64, 48, 32, 16]:\n'
        '    scale = float(size) / float(rect.width)\n'
        '    matrix = fitz.Matrix(scale, scale)\n'
        '    pix = page.get_pixmap(matrix=matrix, alpha=True)\n'
        '    pix.save(f\'/tmp/logo/icon_{size}.png\')\n'
        'print(\'Rendered all icon sizes via docker successfully!\')\n'
        '"'
    )
    subprocess.run(cmd, shell=True, check=True)
    for size in [512, 192, 180, 128, 64, 48, 32, 16]:
        subprocess.run(
            f'docker cp prashant_academy_backend:/tmp/logo/icon_{size}.png frontend/public/logo/temp_icon_{size}.png',
            shell=True,
            check=True
        )

# Render icon sizes
try:
    if not has_fitz:
        render_icon_sizes_via_docker()
        icon_512 = Image.open(os.path.join(LOGO_DIR, "temp_icon_512.png")).convert("RGBA")
        icon_192 = Image.open(os.path.join(LOGO_DIR, "temp_icon_192.png")).convert("RGBA")
        icon_180 = Image.open(os.path.join(LOGO_DIR, "temp_icon_180.png")).convert("RGBA")
        icon_128 = Image.open(os.path.join(LOGO_DIR, "temp_icon_128.png")).convert("RGBA")
        icon_64  = Image.open(os.path.join(LOGO_DIR, "temp_icon_64.png")).convert("RGBA")
        icon_48  = Image.open(os.path.join(LOGO_DIR, "temp_icon_48.png")).convert("RGBA")
        icon_32  = Image.open(os.path.join(LOGO_DIR, "temp_icon_32.png")).convert("RGBA")
        icon_16  = Image.open(os.path.join(LOGO_DIR, "temp_icon_16.png")).convert("RGBA")
    else:
        # Host rendering
        temp_512 = os.path.join(LOGO_DIR, "temp_icon_512.png")
        render_svg_to_png(SOURCE_ICON_SVG, temp_512, 512)
        icon_512 = Image.open(temp_512).convert("RGBA")
        icon_192 = icon_512.resize((192, 192), Image.Resampling.LANCZOS)
        icon_180 = icon_512.resize((180, 180), Image.Resampling.LANCZOS)
        icon_128 = icon_512.resize((128, 128), Image.Resampling.LANCZOS)
        icon_64 = icon_512.resize((64, 64), Image.Resampling.LANCZOS)
        icon_48 = icon_512.resize((48, 48), Image.Resampling.LANCZOS)
        icon_32 = icon_512.resize((32, 32), Image.Resampling.LANCZOS)
        icon_16 = icon_512.resize((16, 16), Image.Resampling.LANCZOS)
except Exception as e:
    print(f"[ERROR] Failed rendering icons: {e}")
    raise

# Save Favicons
favicon_png = os.path.join(PUBLIC_DIR, "favicon.png")
icon_128.save(favicon_png, "PNG")
print(f"[SUCCESS] Updated {favicon_png}")

favicon_ico = os.path.join(PUBLIC_DIR, "favicon.ico")
icon_512.save(favicon_ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print(f"[SUCCESS] Updated {favicon_ico} (multi-frame ICO)")

# Save PWA and Touch Icons
apple_touch_icon = os.path.join(ICONS_DIR, "apple-touch-icon.png")
icon_180.save(apple_touch_icon, "PNG")
print(f"[SUCCESS] Updated {apple_touch_icon}")

icon_192_path = os.path.join(ICONS_DIR, "icon-192x192.png")
icon_192.save(icon_192_path, "PNG")
print(f"[SUCCESS] Updated {icon_192_path}")

icon_512_path = os.path.join(ICONS_DIR, "icon-512x512.png")
icon_512.save(icon_512_path, "PNG")
print(f"[SUCCESS] Updated {icon_512_path}")

# Maskable 512x512 (with 15% safe padding around icon)
maskable_512 = Image.new("RGBA", (512, 512), (0, 0, 100, 255)) # Navy Blue background matching logo
inner_size = 384
inner_icon = icon_512.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
offset = (512 - inner_size) // 2
maskable_512.paste(inner_icon, (offset, offset), inner_icon)
maskable_path = os.path.join(ICONS_DIR, "icon-maskable-512x512.png")
maskable_512.save(maskable_path, "PNG")
print(f"[SUCCESS] Updated {maskable_path}")

# Save Symbol Marks in media/logo
symbol_marks = [
    os.path.join(MEDIA_LOGO_DIR, "prathamone-symbol-icon.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-symbol-icon-transparent.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-symbol-icon-dark.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-seal.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-seal-transparent.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-mark.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-mark-transparent.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-app-icon-512.png"),
    os.path.join(DOCS_BRANDING_DIR, "prathamone-symbol-icon.png"),
    os.path.join(DOCS_BRANDING_DIR, "prathamone-symbol-icon-transparent.png"),
]
for p in symbol_marks:
    icon_512.save(p, "PNG")
    print(f"[SUCCESS] Updated symbol mark: {p}")

icon_192.save(os.path.join(MEDIA_LOGO_DIR, "prathamone-app-icon-192.png"), "PNG")
print(f"[SUCCESS] Updated prathamone-app-icon-192.png")

# 3. Save Master Horizontal Logos in media/logo
logo_1080_img = Image.open(SOURCE_LOGO_1080).convert("RGBA")
horizontal_logos = [
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-horizontal.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-horizontal-transparent.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-horizontal-dark.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-master-logo.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-master-logo-transparent.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-master-logo-dark.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-primary.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-primary-transparent.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-primary-dark.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-logo.png"),
    os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-logo-transparent.png"),
    os.path.join(MEDIA_LOGO_DIR, "POlogo.png"),
    os.path.join(DOCS_BRANDING_DIR, "prathamone-eduos-horizontal.png"),
    os.path.join(DOCS_BRANDING_DIR, "prathamone-eduos-horizontal-transparent.png"),
]
for p in horizontal_logos:
    logo_1080_img.save(p, "PNG")
    print(f"[SUCCESS] Updated horizontal logo: {p}")

# Also copy vector SVG to media/logo/prathamone-eduos-horizontal.svg
shutil.copy2(SOURCE_LOGO_SVG, os.path.join(MEDIA_LOGO_DIR, "prathamone-eduos-horizontal.svg"))
shutil.copy2(SOURCE_ICON_SVG, os.path.join(MEDIA_LOGO_DIR, "prathamone-symbol-icon.svg"))
print("[SUCCESS] Copied vector SVGs to media/logo")

# Clean up temp files
for size in [512, 192, 180, 128, 64, 48, 32, 16]:
    temp_p = os.path.join(LOGO_DIR, f"temp_icon_{size}.png")
    if os.path.exists(temp_p):
        os.remove(temp_p)

print("\n[ALL DONE] All software branding logo and icon assets successfully generated and synchronized!")
