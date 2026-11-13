# /**
#  * @file        apply_artwork_theme.py
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
#  * @description Source component for Apply Artwork Theme in the scripts module.
#  */

"""
/**
 * @file        apply_artwork_theme.py
 * @project     PrathamOne EduOS Coaching Institute Management System
 * @module      scripts.branding
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-13
 * @updated     2026-11-13
 *
 * @description Applies official brand artwork colors (#0B2D6B Navy, #071C44 Prussian Blue, #F57C00 Saffron Orange) across frontend and backend.
 */
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def update_settings_tsx():
    path = ROOT / "frontend" / "src" / "pages" / "Settings.tsx"
    text = path.read_text(encoding="utf-8")
    
    # 1. Initial state
    old_init = (
        "    primary_color: '#1E40AF',\n"
        "    secondary_color: '#3B82F6',\n"
        "    accent_color: '#8B5CF6',"
    )
    new_init = (
        "    primary_color: '#0B2D6B',\n"
        "    secondary_color: '#071C44',\n"
        "    accent_color: '#F57C00',"
    )
    if old_init in text:
        text = text.replace(old_init, new_init, 1)
        print("Updated initial profile state in Settings.tsx")
        
    # 2. Preset list
    old_presets = (
        "                          {[\n"
        "                            { name: 'Royal Blue & Indigo', primary: '#1E40AF', secondary: '#3B82F6', accent: '#8B5CF6' },"
    )
    new_presets = (
        "                          {[\n"
        "                            { name: 'Pratham Navy & Saffron (Official)', primary: '#0B2D6B', secondary: '#071C44', accent: '#F57C00' },\n"
        "                            { name: 'Royal Blue & Indigo', primary: '#1E40AF', secondary: '#3B82F6', accent: '#8B5CF6' },"
    )
    if old_presets in text:
        text = text.replace(old_presets, new_presets, 1)
        print("Added Pratham Navy & Saffron to theme presets in Settings.tsx")
        
    # 3. Fallbacks
    text = text.replace("|| '#1E40AF'", "|| '#0B2D6B'")
    text = text.replace("|| '#3B82F6'", "|| '#071C44'")
    text = text.replace("|| '#8B5CF6'", "|| '#F57C00'")
    
    path.write_text(text, encoding="utf-8")
    print(f"Updated Settings.tsx successfully ({path})")

def update_console_banner():
    path = ROOT / "frontend" / "src" / "utils" / "consoleBanner.ts"
    if path.exists():
        text = path.read_text(encoding="utf-8")
        text = text.replace("#1e40af", "#0B2D6B")
        text = text.replace("#3b82f6", "#071C44")
        text = text.replace("#06b6d4", "#F57C00")
        path.write_text(text, encoding="utf-8")
        print("Updated consoleBanner.ts gradient")

def update_tests():
    # GlobalBrandingEngine.test.tsx
    path1 = ROOT / "frontend" / "src" / "test" / "GlobalBrandingEngine.test.tsx"
    if path1.exists():
        text1 = path1.read_text(encoding="utf-8")
        text1 = text1.replace(
            "expect(hexToRgb('invalid')).toEqual({ r: 30, g: 64, b: 175 })",
            "expect(hexToRgb('invalid')).toEqual({ r: 11, g: 45, b: 107 })"
        )
        path1.write_text(text1, encoding="utf-8")
        print("Updated GlobalBrandingEngine.test.tsx fallback assertion")

    # Settings.test.tsx
    path2 = ROOT / "frontend" / "src" / "test" / "Settings.test.tsx"
    if path2.exists():
        text2 = path2.read_text(encoding="utf-8")
        text2 = text2.replace("primary_color: '#1E40AF'", "primary_color: '#0B2D6B'")
        text2 = text2.replace("secondary_color: '#3B82F6'", "secondary_color: '#071C44'")
        text2 = text2.replace("accent_color: '#8B5CF6'", "accent_color: '#F57C00'")
        path2.write_text(text2, encoding="utf-8")
        print("Updated Settings.test.tsx mock profile")

if __name__ == "__main__":
    update_settings_tsx()
    update_console_banner()
    update_tests()
    print("All theme file updates executed successfully.")
