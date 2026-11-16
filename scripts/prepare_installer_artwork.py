# /**
#  * @file        prepare_installer_artwork.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.prepare_installer_artwork
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-16
#  *
#  * @description Generates multi-resolution .ico, wizard banner, and small logo bitmaps from canonical vector SVG artwork
#  */

import asyncio
import base64
from pathlib import Path
from PIL import Image


def generate_installer_assets():
    root_dir = Path(__file__).resolve().parent.parent
    artwork_dir = root_dir / "frontend" / "public" / "artwork" / "16112026" / "001"
    assets_dir = root_dir / "installer" / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    svg2_path = artwork_dir / "2.svg"
    fl_path = artwork_dir / "fl.svg"

    if not svg2_path.exists() or not fl_path.exists():
        print(f"[ARTWORK WARNING] Canonical SVGs missing in {artwork_dir}, falling back to legacy PNGs")
        return

    print(f"[ARTWORK] Rendering canonical vector SVGs: {svg2_path.name} & {fl_path.name} via Playwright")

    svg2_data = "data:image/svg+xml;base64," + base64.b64encode(svg2_path.read_bytes()).decode("utf-8")
    fl_data = "data:image/svg+xml;base64," + base64.b64encode(fl_path.read_bytes()).decode("utf-8")

    async def render_svgs():
        from playwright.async_api import async_playwright

        html_large = f"""<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }}
  body {{
    width: 164px;
    height: 314px;
    background: linear-gradient(180deg, #0A1C42 0%, #112A66 45%, #081636 100%);
    position: relative;
    overflow: hidden;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 14px 10px 10px 10px;
  }}
  .glow-top {{
    position: absolute;
    top: -30px;
    left: 20px;
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, rgba(255, 127, 42, 0.35) 0%, transparent 70%);
    border-radius: 50%;
  }}
  .glow-cyan {{
    position: absolute;
    bottom: 20px;
    right: -20px;
    width: 130px;
    height: 130px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%);
    border-radius: 50%;
  }}
  .emblem-card {{
    background: rgba(255, 255, 255, 0.98);
    border-radius: 14px;
    padding: 8px 6px 4px 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }}
  .emblem-img {{
    width: 54px;
    height: 54px;
    object-fit: contain;
  }}
  .fl-img {{
    width: 136px;
    height: 28px;
    object-fit: contain;
    margin-top: 3px;
  }}
  .edition-pill {{
    background: rgba(255, 127, 42, 0.18);
    border: 1px solid rgba(255, 127, 42, 0.45);
    border-radius: 20px;
    padding: 3px 6px;
    font-size: 8px;
    font-weight: 700;
    color: #FFB37C;
    text-align: center;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin: 8px 0 4px 0;
  }}
  .features {{
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 7px 8px;
    font-size: 8.5px;
    line-height: 1.45;
  }}
  .feature-item {{
    display: flex;
    align-items: center;
    gap: 5px;
    color: #E2E8F0;
    margin-bottom: 3.5px;
  }}
  .feature-item:last-child {{ margin-bottom: 0; }}
  .check-dot {{
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #38BDF8;
    box-shadow: 0 0 6px #38BDF8;
    flex-shrink: 0;
  }}
  .footer-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5px;
    color: #94A3B8;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }}
</style>
</head>
<body>
  <div class='glow-top'></div>
  <div class='glow-cyan'></div>
  <div>
    <div class='emblem-card'>
      <img src='{svg2_data}' class='emblem-img' />
      <img src='{fl_data}' class='fl-img' />
    </div>
    <div class='edition-pill'>Coaching Institute Edition</div>
  </div>
  <div class='features'>
    <div class='feature-item'><div class='check-dot'></div><span>100% Offline Local Engine</span></div>
    <div class='feature-item'><div class='check-dot'></div><span>Attendance &amp; Biometrics</span></div>
    <div class='feature-item'><div class='check-dot'></div><span>Fees &amp; Double-Entry Ledger</span></div>
    <div class='feature-item'><div class='check-dot'></div><span>Exams, OMR &amp; Marksheets</span></div>
  </div>
  <div class='footer-bar'>
    <span>v1.0.0 Production</span>
    <span style='color: #38BDF8; font-weight: 600;'>Smritisys &amp; AITDL</span>
  </div>
</body>
</html>"""

        html_small = f"""<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: 55px;
    height: 58px;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  img {{
    width: 48px;
    height: 48px;
    object-fit: contain;
  }}
</style>
</head>
<body>
  <img src='{svg2_data}' />
</body>
</html>"""

        html_icon = f"""<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: 256px;
    height: 256px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  img {{
    width: 240px;
    height: 240px;
    object-fit: contain;
  }}
</style>
</head>
<body>
  <img src='{svg2_data}' />
</body>
</html>"""

        async with async_playwright() as p:
            browser = await p.chromium.launch()

            # Render WizardLarge at 2x device scale factor for crystal-clear antialiasing
            page_large = await browser.new_page(viewport={"width": 164, "height": 314}, device_scale_factor=2)
            await page_large.set_content(html_large)
            tmp_large = assets_dir / "temp_large_hi.png"
            await page_large.screenshot(path=str(tmp_large))

            # Render WizardSmall
            page_small = await browser.new_page(viewport={"width": 55, "height": 58}, device_scale_factor=2)
            await page_small.set_content(html_small)
            tmp_small = assets_dir / "temp_small_hi.png"
            await page_small.screenshot(path=str(tmp_small))

            # Render App Icon
            page_icon = await browser.new_page(viewport={"width": 256, "height": 256})
            await page_icon.set_content(html_icon)
            tmp_icon = assets_dir / "temp_icon_256.png"
            await page_icon.screenshot(path=str(tmp_icon), omit_background=True)

            await browser.close()

    asyncio.run(render_svgs())

    # 1. Generate WizardLarge (164x314 24-bit BMP)
    tmp_large = assets_dir / "temp_large_hi.png"
    if tmp_large.exists():
        im_large = Image.open(tmp_large).convert("RGB")
        im_large = im_large.resize((164, 314), Image.Resampling.LANCZOS)
        large_bmp_path = assets_dir / "wizard_large.bmp"
        im_large.save(large_bmp_path, format="BMP")
        print(f"[ARTWORK SUCCESS] Generated WizardImage: {large_bmp_path} (164x314 BMP)")
        tmp_large.unlink(missing_ok=True)

    # 2. Generate WizardSmall (55x58 24-bit BMP)
    tmp_small = assets_dir / "temp_small_hi.png"
    if tmp_small.exists():
        im_small = Image.open(tmp_small).convert("RGB")
        im_small = im_small.resize((55, 58), Image.Resampling.LANCZOS)
        small_bmp_path = assets_dir / "wizard_small.bmp"
        im_small.save(small_bmp_path, format="BMP")
        print(f"[ARTWORK SUCCESS] Generated WizardSmallImage: {small_bmp_path} (55x58 BMP)")
        tmp_small.unlink(missing_ok=True)

    # 3. Generate Multi-resolution Windows App Icon
    tmp_icon = assets_dir / "temp_icon_256.png"
    if tmp_icon.exists():
        icon_src = Image.open(tmp_icon).convert("RGBA")
        ico_path = assets_dir / "app_icon.ico"
        icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
        icon_src.save(ico_path, format="ICO", sizes=icon_sizes)
        print(f"[ARTWORK SUCCESS] Generated Windows app_icon.ico with sizes: {icon_sizes}")

        # Sync with frontend favicon
        favicon_path = root_dir / "frontend" / "public" / "favicon.ico"
        icon_src.resize((64, 64), Image.Resampling.LANCZOS).save(favicon_path, format="ICO")
        dist_favicon = root_dir / "frontend" / "dist" / "favicon.ico"
        if dist_favicon.parent.exists():
            icon_src.resize((64, 64), Image.Resampling.LANCZOS).save(dist_favicon, format="ICO")
        tmp_icon.unlink(missing_ok=True)


if __name__ == "__main__":
    generate_installer_assets()
