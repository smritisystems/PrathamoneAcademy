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
#  * @updated     2026-11-26
#  *
#  * @description Generates multi-resolution .ico, wizard banner, and small logo bitmaps from canonical vector SVG artwork
#  */

import asyncio
import base64
import shutil
from pathlib import Path
from PIL import Image


def generate_installer_assets():
    root_dir = Path(__file__).resolve().parent.parent
    brand_2511_dir = root_dir / "frontend" / "public" / "artwork" / "25112026"
    csm_artwork_dir = root_dir / "frontend" / "public" / "artwork" / "CSM"
    legacy_artwork_dir = root_dir / "frontend" / "public" / "artwork" / "16112026" / "001"
    assets_dir = root_dir / "installer" / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    # Prefer new 25112026 branding pack, falling back cleanly if absent
    widelogo_light_path = brand_2511_dir / "batch_g44.svg"
    if not widelogo_light_path.exists():
        widelogo_light_path = csm_artwork_dir / "widelogo.svg"
    if not widelogo_light_path.exists():
        widelogo_light_path = legacy_artwork_dir / "fl.svg"

    widelogo_dark_path = brand_2511_dir / "batch_g45.svg"
    if not widelogo_dark_path.exists():
        widelogo_dark_path = widelogo_light_path

    crest_path = brand_2511_dir / "batch_g46.svg"
    if not crest_path.exists():
        crest_path = legacy_artwork_dir / "2.svg"

    crest_light_path = brand_2511_dir / "batch_g47.svg"
    if not crest_light_path.exists():
        crest_light_path = crest_path

    hero_img_path = brand_2511_dir / "Image.jpg"
    splash_gif_path = brand_2511_dir / "Splash.gif"

    if not widelogo_light_path.exists() or not crest_path.exists():
        print(f"[ARTWORK WARNING] Canonical SVGs missing in {brand_2511_dir} / {csm_artwork_dir}")
        return

    print(
        f"[ARTWORK] Rendering 25112026 brand artwork: {widelogo_light_path.name}, "
        f"{widelogo_dark_path.name}, & {crest_path.name} via Playwright"
    )

    widelogo_data = "data:image/svg+xml;base64," + base64.b64encode(widelogo_light_path.read_bytes()).decode("utf-8")
    widelogo_dark_data = "data:image/svg+xml;base64," + base64.b64encode(widelogo_dark_path.read_bytes()).decode("utf-8")
    crest_data = "data:image/svg+xml;base64," + base64.b64encode(crest_path.read_bytes()).decode("utf-8")
    hero_bg_css = ""
    if hero_img_path.is_file():
        hero_b64 = base64.b64encode(hero_img_path.read_bytes()).decode("ascii")
        hero_bg_css = (
            f"background-image: linear-gradient(180deg, rgba(0,34,85,0.88) 0%, rgba(0,22,60,0.82) 55%, "
            f"rgba(0,18,48,0.95) 100%), url('data:image/jpeg;base64,{hero_b64}'); "
            f"background-size: cover; background-position: center;"
        )

    # Sync canonical brand assets directly into installer/assets/
    shutil.copy2(widelogo_light_path, assets_dir / "widelogo.svg")
    shutil.copy2(crest_path, assets_dir / "prathamone_emblem.svg")
    if (brand_2511_dir / "batch_g46.png").is_file():
        shutil.copy2(brand_2511_dir / "batch_g46.png", assets_dir / "prathamone_emblem.png")
    if (brand_2511_dir / "batch_g44.png").is_file():
        shutil.copy2(brand_2511_dir / "batch_g44.png", assets_dir / "widelogo.png")
    if splash_gif_path.is_file():
        shutil.copy2(splash_gif_path, assets_dir / "Splash.gif")
    if hero_img_path.is_file():
        shutil.copy2(hero_img_path, assets_dir / "Image.jpg")

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
    background: linear-gradient(180deg, #002255 0%, #0A2E6E 50%, #061A40 100%);
    {hero_bg_css}
    position: relative;
    overflow: hidden;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px 10px 10px 10px;
  }}
  .logo-card {{
    background: #002255;
    border-radius: 8px;
    padding: 4px 4px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.38);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 127, 42, 0.45);
    overflow: hidden;
  }}
  .logo-card img {{
    width: 100%;
    height: auto;
    display: block;
  }}
  .edition-pill {{
    background: rgba(255, 127, 42, 0.16);
    border: 1px solid rgba(255, 127, 42, 0.42);
    border-radius: 20px;
    padding: 3.5px 6px;
    font-size: 7.5px;
    font-weight: 700;
    color: #FDBA74;
    text-align: center;
    letter-spacing: 0.35px;
    text-transform: uppercase;
    margin: 8px 0 4px 0;
  }}
  .features {{
    background: rgba(8, 22, 54, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 10px;
    padding: 8px 7px;
    font-size: 8.5px;
    line-height: 1.45;
  }}
  .feature-item {{
    display: flex;
    align-items: center;
    gap: 5px;
    color: #F1F5F9;
    margin-bottom: 3.5px;
  }}
  .feature-item:last-child {{ margin-bottom: 0; }}
  .check-dot {{
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #FB923C;
    box-shadow: 0 0 6px #FB923C;
    flex-shrink: 0;
  }}
  .footer-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5px;
    color: #CBD5E1;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }}
</style>
</head>
<body>
  <div>
    <div class='logo-card'>
      <img src='{widelogo_dark_data}' />
    </div>
    <div class='edition-pill'>Simply Powerful</div>
  </div>
  <div class='features'>
    <div class='feature-item'><div class='check-dot'></div><span>100% Offline Local Engine</span></div>
    <div class='feature-item'><div class='check-dot'></div><span>Attendance &amp; Biometrics</span></div>
    <div class='feature-item'><div class='check-dot'></div><span>Fees &amp; Double-Entry Ledger</span></div>
    <div class='feature-item'><div class='check-dot'></div><span>Exams, OMR &amp; Marksheets</span></div>
  </div>
  <div class='footer-bar'>
    <span>v1.0.0 EduOS</span>
    <span style='color: #FB923C; font-weight: 600;'>Smritisys &amp; AITDL</span>
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
    width: 160px;
    height: 58px;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 2px 6px;
  }}
  img {{
    width: 148px;
    height: 54px;
    object-fit: cover;
    object-position: center;
    display: block;
  }}
</style>
</head>
<body>
  <img src='{widelogo_data}' />
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
  .tile {{
    width: 244px;
    height: 244px;
    border-radius: 46px;
    overflow: hidden;
    background: #002255;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  img {{
    width: 244px;
    height: 244px;
    object-fit: cover;
    display: block;
  }}
</style>
</head>
<body>
  <div class='tile'><img src='{crest_data}' /></div>
</body>
</html>"""

        html_widelogo_png = f"""<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: 1000px;
    height: 204px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  img {{
    width: 1000px;
    height: auto;
    display: block;
  }}
</style>
</head>
<body>
  <img src='{widelogo_data}' />
</body>
</html>"""

        async with async_playwright() as p:
            browser = await p.chromium.launch()

            # Render WizardLarge at 2x device scale factor for crystal-clear antialiasing
            page_large = await browser.new_page(viewport={"width": 164, "height": 314}, device_scale_factor=2)
            await page_large.set_content(html_large)
            tmp_large = assets_dir / "temp_large_hi.png"
            await page_large.screenshot(path=str(tmp_large))

            # Render WizardSmall (160x58 at 2x)
            page_small = await browser.new_page(viewport={"width": 160, "height": 58}, device_scale_factor=2)
            await page_small.set_content(html_small)
            tmp_small = assets_dir / "temp_small_hi.png"
            await page_small.screenshot(path=str(tmp_small))

            # Render App Icon
            page_icon = await browser.new_page(viewport={"width": 256, "height": 256})
            await page_icon.set_content(html_icon)
            tmp_icon = assets_dir / "temp_icon_256.png"
            await page_icon.screenshot(path=str(tmp_icon), omit_background=True)

            # Render High-Resolution Widelogo PNG
            page_widelogo = await browser.new_page(viewport={"width": 1000, "height": 204})
            await page_widelogo.set_content(html_widelogo_png)
            widelogo_png_path = assets_dir / "widelogo.png"
            await page_widelogo.screenshot(path=str(widelogo_png_path), omit_background=True)

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

    # 2. Generate WizardSmall (160x58 24-bit BMP)
    tmp_small = assets_dir / "temp_small_hi.png"
    if tmp_small.exists():
        im_small = Image.open(tmp_small).convert("RGB")
        im_small = im_small.resize((160, 58), Image.Resampling.LANCZOS)
        small_bmp_path = assets_dir / "wizard_small.bmp"
        im_small.save(small_bmp_path, format="BMP")
        print(f"[ARTWORK SUCCESS] Generated WizardSmallImage: {small_bmp_path} (160x58 BMP)")
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
