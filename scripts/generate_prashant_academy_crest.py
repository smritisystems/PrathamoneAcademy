# /**
#  * @file        generate_prashant_academy_crest.py
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
#  * @description Generator for the official Prashant Academy coaching institute crest and logo assets in SVG and high-resolution PNG.
#  */

import os
from PIL import Image, ImageDraw, ImageFont

svg_code = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="innerShield" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Outer Circle Border -->
  <circle cx="250" cy="250" r="240" fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="10" filter="url(#shadow)" />
  <circle cx="250" cy="250" r="222" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6,6" opacity="0.6" />

  <!-- Laurel Wreath Leaves (Left) -->
  <path d="M 90 250 C 90 180 130 130 170 110 C 150 140 150 190 170 230 C 130 220 100 240 90 250 Z" fill="url(#goldGrad)" opacity="0.9" />
  <path d="M 95 280 C 105 320 135 360 170 380 C 150 360 140 320 155 285 C 130 290 105 285 95 280 Z" fill="url(#goldGrad)" opacity="0.9" />

  <!-- Laurel Wreath Leaves (Right) -->
  <path d="M 410 250 C 410 180 370 130 330 110 C 350 140 350 190 330 230 C 370 220 400 240 410 250 Z" fill="url(#goldGrad)" opacity="0.9" />
  <path d="M 405 280 C 395 320 365 360 330 380 C 350 360 360 320 345 285 C 370 290 395 285 405 280 Z" fill="url(#goldGrad)" opacity="0.9" />

  <!-- Academic Shield Shape in Center -->
  <path d="M 145 130 L 355 130 C 355 260 250 345 250 375 C 250 345 145 260 145 130 Z" fill="url(#innerShield)" stroke="url(#goldGrad)" stroke-width="6" filter="url(#shadow)" />

  <!-- Graduation Cap (Top of shield) -->
  <polygon points="250,150 315,180 250,210 185,180" fill="#1e3a8a" stroke="url(#goldGrad)" stroke-width="3" />
  <path d="M 215 195 L 215 220 C 215 235 285 235 285 220 L 285 195" fill="#0f172a" />
  <circle cx="250" cy="180" r="4.5" fill="#fbbf24" />
  <path d="M 250 180 Q 315 195 322 230" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" />
  <circle cx="322" cy="232" r="5" fill="#f59e0b" />

  <!-- Monogram PA -->
  <text x="250" y="278" font-family="'Times New Roman', Georgia, serif" font-size="52" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="3">PA</text>

  <!-- Open Book of Knowledge -->
  <path d="M 250 300 C 230 282 185 278 170 282 L 170 330 C 190 325 230 330 250 348 C 270 330 310 325 330 330 L 330 282 C 315 278 270 282 250 300 Z" fill="#1e3a8a" stroke="url(#goldGrad)" stroke-width="3" />
  <path d="M 250 300 L 250 348" stroke="url(#goldGrad)" stroke-width="3" />

  <!-- Banner / Ribbon at Bottom -->
  <path d="M 85 400 L 140 422 L 130 388 L 370 388 L 360 422 L 415 400 L 390 438 L 250 450 L 110 438 Z" fill="url(#goldGrad)" stroke="#b45309" stroke-width="2.5" filter="url(#shadow)" />
  <text x="250" y="423" font-family="'Arial Black', Impact, sans-serif" font-size="19" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="2.5">PRASHANT ACADEMY</text>

  <!-- Motto below: LEARN • PRACTICE • ACHIEVE -->
  <text x="250" y="475" font-family="'Inter', sans-serif" font-size="13" font-weight="800" fill="#fbbf24" text-anchor="middle" letter-spacing="3.5">LEARN • PRACTICE • ACHIEVE</text>
</svg>"""

svg_paths = [
    r"frontend\public\media\logo\prashant-academy-logo.svg",
    r"docs\assets\branding\prashant-academy-logo.svg",
]

for p in svg_paths:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(svg_code)
    print(f"  [SAVED] {p}")

# Render raster PNG (512x512) with PIL
size = (512, 512)
png_img = Image.new("RGBA", size, (0, 0, 0, 0))
draw = ImageDraw.Draw(png_img)

# Outer circle
center = (256, 256)
r_outer = 240
draw.ellipse((center[0]-r_outer, center[1]-r_outer, center[0]+r_outer, center[1]+r_outer), fill=(15, 23, 42, 255), outline=(245, 158, 11, 255), width=10)

# Inner dashed circle
r_inner = 222
draw.ellipse((center[0]-r_inner, center[1]-r_inner, center[0]+r_inner, center[1]+r_inner), outline=(255, 255, 255, 160), width=3)

# Center White Shield
shield_pts = [
    (145, 130), (367, 130),
    (367, 260), (256, 375),
    (145, 260)
]
draw.polygon(shield_pts, fill=(255, 255, 255, 255), outline=(245, 158, 11, 255))

# Graduation cap in shield
cap_pts = [(256, 150), (320, 180), (256, 210), (192, 180)]
draw.polygon(cap_pts, fill=(30, 58, 138, 255), outline=(245, 158, 11, 255))
draw.ellipse((252, 176, 260, 184), fill=(251, 191, 36, 255))

# Monogram "PA"
try:
    font_pa = ImageFont.truetype("times.ttf", 60)
    font_banner = ImageFont.truetype("arialbd.ttf", 22)
    font_motto = ImageFont.truetype("arialbd.ttf", 14)
except:
    font_pa = font_banner = font_motto = None

if font_pa:
    draw.text((256, 250), "PA", fill=(15, 23, 42, 255), font=font_pa, anchor="mm")
    draw.text((256, 420), "PRASHANT ACADEMY", fill=(15, 23, 42, 255), font=font_banner, anchor="mm")
    draw.text((256, 472), "LEARN • PRACTICE • ACHIEVE", fill=(251, 191, 36, 255), font=font_motto, anchor="mm")

# Bottom gold banner
banner_pts = [(90, 400), (145, 422), (135, 388), (377, 388), (367, 422), (422, 400), (395, 438), (256, 450), (117, 438)]
draw.polygon(banner_pts, fill=(245, 158, 11, 255), outline=(180, 83, 9, 255))
if font_banner:
    draw.text((256, 420), "PRASHANT ACADEMY", fill=(15, 23, 42, 255), font=font_banner, anchor="mm")

png_paths = [
    r"frontend\public\media\logo\prashant-academy-logo.png",
    r"docs\assets\branding\prashant-academy-logo.png",
]

for p in png_paths:
    png_img.save(p, format="PNG", optimize=True)
    print(f"  [SAVED] {p} ({size[0]}x{size[1]})")

print("\n[SUCCESS] Prashant Academy official coaching institute crest generated!")
