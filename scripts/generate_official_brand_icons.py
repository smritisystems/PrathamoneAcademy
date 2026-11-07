# /**
#  * @file        generate_official_brand_icons.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Generates official high-resolution PWA icons, favicon.ico, and vector SVG favicons from master emblem artwork.
#  */

import os
import base64
from PIL import Image, ImageDraw

def create_brand_icons():
    master_symbol_path = "frontend/public/media/logo/prathamone-symbol-icon-transparent.png"
    if not os.path.exists(master_symbol_path):
        raise FileNotFoundError(f"Missing master symbol: {master_symbol_path}")

    symbol_img = Image.open(master_symbol_path).convert("RGBA")
    sw, sh = symbol_img.size

    # 1. Generate 512x512 App Icon (White squircle with subtle navy/orange border, transparent outside)
    canvas_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw_512 = ImageDraw.Draw(canvas_512)

    # Draw rounded squircle
    margin = 20
    draw_512.rounded_rectangle(
        [(margin, margin), (512 - margin, 512 - margin)],
        radius=96,
        fill=(255, 255, 255, 255),
        outline=(26, 26, 80, 255),  # Pratham Navy outline
        width=12
    )

    # Draw bottom-right subtle orange accent arc/corner
    draw_512.rounded_rectangle(
        [(margin + 6, margin + 6), (512 - margin - 6, 512 - margin - 6)],
        radius=90,
        outline=(238, 139, 54, 255),  # Pratham Orange inner ring
        width=4
    )

    # Calculate emblem dimensions to center inside squircle
    target_h = 360
    target_w = int(sw * (target_h / sh))
    symbol_resized = symbol_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Center horizontally and vertically
    x = (512 - target_w) // 2
    y = (512 - target_h) // 2
    canvas_512.paste(symbol_resized, (x, y), symbol_resized)

    # Save to public/icons/icon-512x512.png and public/media/logo/
    canvas_512.save("frontend/public/icons/icon-512x512.png", format="PNG", optimize=True)
    canvas_512.save("frontend/public/media/logo/prathamone-app-icon-512.png", format="PNG", optimize=True)

    # 2. Generate 192x192 App Icon
    canvas_192 = canvas_512.resize((192, 192), Image.Resampling.LANCZOS)
    canvas_192.save("frontend/public/icons/icon-192x192.png", format="PNG", optimize=True)
    canvas_192.save("frontend/public/media/logo/prathamone-app-icon-192.png", format="PNG", optimize=True)

    # 3. Generate Apple Touch Icon (180x180, solid white background with rounded squircle)
    apple_icon = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
    draw_apple = ImageDraw.Draw(apple_icon)
    draw_apple.rounded_rectangle(
        [(4, 4), (176, 176)],
        radius=36,
        fill=(255, 255, 255, 255),
        outline=(26, 26, 80, 255),
        width=4
    )
    target_h_apple = 126
    target_w_apple = int(sw * (target_h_apple / sh))
    symbol_apple = symbol_img.resize((target_w_apple, target_h_apple), Image.Resampling.LANCZOS)
    x_apple = (180 - target_w_apple) // 2
    y_apple = (180 - target_h_apple) // 2
    apple_icon.paste(symbol_apple, (x_apple, y_apple), symbol_apple)
    apple_icon.convert("RGB").save("frontend/public/icons/apple-touch-icon.png", format="PNG", optimize=True)

    # 4. Generate Maskable Icon (512x512, safe zone with solid background)
    maskable_512 = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
    target_h_mask = 320
    target_w_mask = int(sw * (target_h_mask / sh))
    symbol_mask = symbol_img.resize((target_w_mask, target_h_mask), Image.Resampling.LANCZOS)
    x_mask = (512 - target_w_mask) // 2
    y_mask = (512 - target_h_mask) // 2
    maskable_512.paste(symbol_mask, (x_mask, y_mask), symbol_mask)
    maskable_512.convert("RGB").save("frontend/public/icons/icon-maskable-512x512.png", format="PNG", optimize=True)

    # 5. Generate multi-resolution favicon.ico (16, 32, 48, 64)
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    canvas_512.save(
        "frontend/public/favicon.ico",
        format="ICO",
        sizes=icon_sizes
    )

    # 6. Generate SVG icons embedding high-resolution emblem
    with open("frontend/public/icons/icon-512x512.png", "rb") as f:
        png_b64 = base64.b64encode(f.read()).decode("utf-8")

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <title>PrathamOne EduOS Official Favicon</title>
  <defs>
    <clipPath id="squircleClip">
      <rect x="20" y="20" width="472" height="472" rx="96" ry="96" />
    </clipPath>
  </defs>
  <image href="data:image/png;base64,{png_b64}" x="0" y="0" width="512" height="512" />
</svg>'''

    with open("frontend/public/favicon.svg", "w", encoding="utf-8") as f:
        f.write(svg_content)

    with open("frontend/public/icons/icon.svg", "w", encoding="utf-8") as f:
        f.write(svg_content)

    print("Successfully generated all official brand icons, favicon.ico, and SVG favicons!")

if __name__ == "__main__":
    create_brand_icons()
