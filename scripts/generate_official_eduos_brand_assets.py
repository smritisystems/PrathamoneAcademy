# /**
#  * @file        generate_official_eduos_brand_assets.py
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
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Production asset generation script that processes official brand artwork
#  */

import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SOURCE_LOCKUP = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e\.user_uploaded\media_1794078006247_de9fe54e.jpg"
SOURCE_SEAL = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e\.user_uploaded\media_1794078024127_d7141b46.png"

TARGET_DIRS = [
    r"frontend\public\media\logo",
    r"frontend\public\icons",
    r"frontend\public",
    r"docs\assets\branding",
]

for d in TARGET_DIRS:
    os.makedirs(d, exist_ok=True)

print("[INFO] Processing official PrathamOne EduOS brand assets...")

# 1. Load source artwork
img_lockup = Image.open(SOURCE_LOCKUP).convert("RGBA")
width, height = img_lockup.size

# 2. Extract tight bounding box of entire horizontal lockup
# Content spans roughly x: 25 to 995, y: 140 to 430
lockup_crop = img_lockup.crop((20, 135, 1000, 435))
w_crop, h_crop = lockup_crop.size

# Create transparent version of horizontal lockup
# Pixels near pure white (255, 255, 255) get smooth alpha feathering
arr_lockup = np.array(lockup_crop, dtype=np.float32)
# Calculate brightness
brightness = (arr_lockup[:, :, 0] + arr_lockup[:, :, 1] + arr_lockup[:, :, 2]) / 3.0

# Create soft alpha: fully opaque below 240, smoothly transitioning to 0 between 240 and 254
alpha_lockup = np.clip((254.0 - brightness) / (254.0 - 238.0) * 255.0, 0.0, 255.0).astype(np.uint8)

# Keep the original white inside the seal or text intact where appropriate
# Note: In the horizontal lockup, the background is white canvas
lockup_trans = Image.fromarray(np.dstack([
    arr_lockup[:, :, 0].astype(np.uint8),
    arr_lockup[:, :, 1].astype(np.uint8),
    arr_lockup[:, :, 2].astype(np.uint8),
    alpha_lockup
]), mode="RGBA")

# 3. Extract the Circular Seal with pixel-perfect circular masking
# In source coordinates: center is (168, 286), radius is 140
center_x, center_y = 168, 286
radius = 140
seal_crop = img_lockup.crop((center_x - radius, center_y - radius, center_x + radius, center_y + radius))
sw, sh = seal_crop.size

# Create a smooth supersampled circular mask for the seal
mask_size = (sw * 4, sh * 4)
circle_mask = Image.new("L", mask_size, 0)
draw = ImageDraw.Draw(circle_mask)
draw.ellipse((0, 0, mask_size[0], mask_size[1]), fill=255)
circle_mask = circle_mask.resize((sw, sh), Image.Resampling.LANCZOS)

# Apply mask to seal crop
seal_rgba = seal_crop.copy()
seal_rgba.putalpha(circle_mask)

# High-resolution 1024x1024 master seal
seal_1024 = seal_rgba.resize((1024, 1024), Image.Resampling.LANCZOS)
seal_512 = seal_rgba.resize((512, 512), Image.Resampling.LANCZOS)
seal_192 = seal_rgba.resize((192, 192), Image.Resampling.LANCZOS)
seal_64 = seal_rgba.resize((64, 64), Image.Resampling.LANCZOS)
seal_32 = seal_rgba.resize((32, 32), Image.Resampling.LANCZOS)
seal_16 = seal_rgba.resize((16, 16), Image.Resampling.LANCZOS)

# Save Master Assets to frontend/public/media/logo/
files_to_save = {
    # Horizontal Lockups
    r"frontend\public\media\logo\prathamone-eduos-horizontal.png": lockup_crop,
    r"frontend\public\media\logo\prathamone-eduos-horizontal-transparent.png": lockup_trans,
    r"docs\assets\branding\prathamone-eduos-horizontal.png": lockup_crop,
    r"docs\assets\branding\prathamone-eduos-horizontal-transparent.png": lockup_trans,

    # Circular Seals
    r"frontend\public\media\logo\prathamone-eduos-seal.png": seal_1024,
    r"frontend\public\media\logo\prathamone-eduos-seal-transparent.png": seal_1024,
    r"docs\assets\branding\prathamone-eduos-seal.png": seal_1024,
    r"docs\assets\branding\prathamone-eduos-seal-transparent.png": seal_1024,

    # Standard Symbol Mark aliases
    r"frontend\public\media\logo\prathamone-symbol-icon.png": seal_512,
    r"frontend\public\media\logo\prathamone-symbol-icon-transparent.png": seal_512,
    r"docs\assets\branding\prathamone-symbol-icon.png": seal_512,
    r"docs\assets\branding\prathamone-symbol-icon-transparent.png": seal_512,

    # PWA App Icons
    r"frontend\public\icons\icon-192x192.png": seal_192,
    r"frontend\public\icons\icon-512x512.png": seal_512,
    r"frontend\public\media\logo\prathamone-app-icon-192.png": seal_192,
    r"frontend\public\media\logo\prathamone-app-icon-512.png": seal_512,
    r"docs\assets\branding\prathamone-app-icon-192.png": seal_192,
    r"docs\assets\branding\prathamone-app-icon-512.png": seal_512,

    # Root Favicons
    r"frontend\public\favicon.png": seal_32,
}

for path, img in files_to_save.items():
    img.save(path, format="PNG", optimize=True)
    print(f"  [SAVED] {path} ({img.size[0]}x{img.size[1]})")

# Generate multi-size favicon.ico
seal_ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
ico_imgs = [seal_rgba.resize(s, Image.Resampling.LANCZOS) for s in seal_ico_sizes]
ico_path = r"frontend\public\favicon.ico"
ico_imgs[0].save(ico_path, format="ICO", sizes=seal_ico_sizes, append_images=ico_imgs[1:])
print(f"  [SAVED] {ico_path} (Multi-resolution ICO: 16, 32, 48, 64)")

# Generate SVG favicon representation with embedded seal
svg_favicon_path = r"frontend\public\favicon.svg"
# We can create a vector-like SVG containing the circular emblem
svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="#161C3B" stroke="#F47B20" stroke-width="2"/>
  <circle cx="50" cy="50" r="42" fill="#FFFFFF"/>
  <!-- Stylized Pratham Elephant Head & Ear (P) -->
  <path d="M 50 20 C 65 20, 78 32, 78 48 C 78 62, 66 72, 54 72 C 48 72, 44 68, 44 64 C 44 60, 48 56, 52 56 C 58 56, 64 52, 64 46 C 64 38, 56 32, 48 32 C 40 32, 32 38, 32 48 C 32 60, 40 76, 50 82" fill="none" stroke="#161C3B" stroke-width="5" stroke-linecap="round"/>
  <circle cx="44" cy="40" r="2.5" fill="#161C3B"/>
  <path d="M 38 68 C 36 74, 30 78, 26 78 C 24 74, 28 66, 32 62 Z" fill="#F47B20"/>
  <path d="M 68 64 C 74 60, 80 64, 80 68 C 76 72, 70 70, 68 64 Z" fill="#F47B20"/>
  <polygon points="30,30 32,34 36,34 33,36 34,40 30,38 26,40 27,36 24,34 28,34" fill="#F89D2B"/>
</svg>"""
with open(svg_favicon_path, "w", encoding="utf-8") as f:
    f.write(svg_content)
print(f"  [SAVED] {svg_favicon_path} (Scalable SVG Favicon)")

print("\n[SUCCESS] All official brand assets generated successfully!")
