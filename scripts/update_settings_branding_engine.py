# /**
#  * @file        update_settings_branding_engine.py
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
#  * @description Connects Settings.tsx to the centralized applyGlobalBrandTheme engine with live preview, preset indicators, and multi-component visual verification.
#  */

def update_settings():
    path = "frontend/src/pages/Settings.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Ensure import of applyGlobalBrandTheme
    if "applyGlobalBrandTheme" not in content:
        content = content.replace(
            "import { useBranding } from '../config/branding'",
            "import { useBranding, applyGlobalBrandTheme, BRANDING_STORAGE_KEY } from '../config/branding'"
        )

    # 2. Update handleProfileChange to call applyGlobalBrandTheme immediately
    old_handle_profile = """  const handleProfileChange = (field: keyof InstituteProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }"""

    new_handle_profile = """  const handleProfileChange = (field: keyof InstituteProfile, value: any) => {
    setProfile((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'primary_color' || field === 'secondary_color' || field === 'accent_color') {
        applyGlobalBrandTheme({
          primary: next.primary_color || '#1E40AF',
          secondary: next.secondary_color || '#3B82F6',
          accent: next.accent_color || '#8B5CF6',
        }, next.logo_url)
      }
      return next
    })
  }"""

    if old_handle_profile in content:
        content = content.replace(old_handle_profile, new_handle_profile)

    # 3. Update handleDiscard to restore DOM theme
    old_discard = """      if (originalProfile) setProfile(originalProfile)"""
    new_discard = """      if (originalProfile) {
        setProfile(originalProfile)
        applyGlobalBrandTheme({
          primary: originalProfile.primary_color || '#1E40AF',
          secondary: originalProfile.secondary_color || '#3B82F6',
          accent: originalProfile.accent_color || '#8B5CF6',
        }, originalProfile.logo_url)
      }"""
    if old_discard in content:
        content = content.replace(old_discard, new_discard)

    # 4. Update handleSave to persist theme to localStorage and apply theme
    old_save_invalidation = """        await queryClient.invalidateQueries({ queryKey: ['institutions'] })
        await queryClient.invalidateQueries({ queryKey: ['public_branding'] })
        await queryClient.invalidateQueries({ queryKey: ['institute_profile'] })
        showNotification('success', 'Institute profile and branding settings saved and applied across the application.')"""

    new_save_invalidation = """        applyGlobalBrandTheme({
          primary: res.data.profile.primary_color || '#1E40AF',
          secondary: res.data.profile.secondary_color || '#3B82F6',
          accent: res.data.profile.accent_color || '#8B5CF6',
        }, res.data.profile.logo_url)
        try {
          const cached = JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) || '{}')
          localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify({
            ...cached,
            colors: {
              ...(cached.colors || {}),
              primary: res.data.profile.primary_color || '#1E40AF',
              secondary: res.data.profile.secondary_color || '#3B82F6',
              accent: res.data.profile.accent_color || '#8B5CF6',
            },
            academyName: res.data.profile.name || cached.academyName,
            monogram: res.data.profile.short_name || cached.monogram,
            assets: {
              ...(cached.assets || {}),
              academyLogoUrl: res.data.profile.logo_url || cached.assets?.academyLogoUrl,
              logoUrl: res.data.profile.logo_url || cached.assets?.logoUrl,
            }
          }))
        } catch {}
        await queryClient.invalidateQueries({ queryKey: ['institutions'] })
        await queryClient.invalidateQueries({ queryKey: ['public_branding'] })
        await queryClient.invalidateQueries({ queryKey: ['institute_profile'] })
        showNotification('success', 'Institute profile and branding settings saved and applied globally across all modules.')"""

    if old_save_invalidation in content:
        content = content.replace(old_save_invalidation, new_save_invalidation)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated frontend/src/pages/Settings.tsx with branding integration")

if __name__ == "__main__":
    update_settings()

