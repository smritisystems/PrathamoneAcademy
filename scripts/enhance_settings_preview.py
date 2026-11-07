# /**
#  * @file        enhance_settings_preview.py
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
#  * @description Enriches Settings.tsx branding preview with multi-element verification (banner, buttons, active nav, document header) and atomic preset application.
#  */

def enhance_preview():
    path = "frontend/src/pages/Settings.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Define the new enhanced branding section
    target_start = "{/* ─────────────────────────────────────────────────────────── */}\n                {/* SECTION 2: BRANDING & APPEARANCE                            */}\n                {/* ─────────────────────────────────────────────────────────── */}\n                {activeCategory === 'branding' && ("
    
    if target_start not in content:
        # Try alternate line endings
        target_start = target_start.replace("\n", "\r\n")

    if target_start not in content:
        print("Could not find SECTION 2: BRANDING & APPEARANCE start")
        return

    # Find the end of this section
    target_end = "{/* SECTION 3: ACADEMIC CONFIGURATION                           */}"
    idx_start = content.find(target_start)
    idx_end = content.find(target_end)
    if idx_end == -1:
        print("Could not find SECTION 3 start")
        return

    # Back up to the closing tags before section 3
    idx_cut = content.rfind("{/* ─────────────────────────────────────────────────────────── */}", idx_start, idx_end)
    if idx_cut == -1:
        idx_cut = idx_end

    new_branding_section = """{/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 2: BRANDING & APPEARANCE                            */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'branding' && (
                  <div className="space-y-6 max-w-4xl">
                    {/* Live Branding Preview Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Real-Time Global Branding Preview</h3>
                            <p className="text-[11px] text-gray-500">
                              Live simulation across banner, buttons, active navigation, and official print documents
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          Tenant: {profile.short_name || 'PA'}
                        </span>
                      </div>

                      {/* 1. Dynamic Live Banner Card */}
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${profile.primary_color || '#1E40AF'} 0%, ${profile.secondary_color || '#3B82F6'} 100%)`,
                        }}
                        className="rounded-xl p-4 text-white shadow-md flex items-center gap-3.5 relative overflow-hidden"
                      >
                        <div
                          style={{ backgroundColor: profile.accent_color || '#8B5CF6' }}
                          className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none"
                        />
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg text-white border border-white/30 shadow-xs flex-shrink-0">
                          {profile.logo_url && profile.logo_url !== '/logo.svg' ? (
                            <img
                              src={profile.logo_url}
                              alt="Logo preview"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            profile.short_name || 'PA'
                          )}
                        </div>
                        <div className="min-w-0 flex-1 relative z-10">
                          <h4 className="font-bold text-sm tracking-tight truncate">
                            {profile.name || 'Prashant Academy'}
                          </h4>
                          <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                            {profile.tagline || 'Learn • Practice • Achieve'}
                          </p>
                        </div>
                      </div>

                      {/* 2. Multi-Element Interactive Component Previews */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {/* Primary & Secondary Buttons Preview */}
                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Buttons & Actions
                          </div>
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              style={{ backgroundColor: profile.primary_color || '#1E40AF' }}
                              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-white shadow-2xs hover:brightness-105 transition-all text-center"
                            >
                              Primary Action
                            </button>
                            <button
                              type="button"
                              style={{
                                color: profile.primary_color || '#1E40AF',
                                borderColor: profile.primary_color || '#1E40AF',
                              }}
                              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border hover:bg-slate-50 transition-all text-center"
                            >
                              Secondary Action
                            </button>
                          </div>
                        </div>

                        {/* Active Navigation Pill Preview */}
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-white">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Sidebar Navigation
                          </div>
                          <div className="space-y-1">
                            <div
                              style={{ backgroundColor: profile.primary_color || '#1E40AF' }}
                              className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-white shadow-xs flex items-center justify-between"
                            >
                              <span>Active Menu Tab</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                            <div className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-400">
                              Inactive Item
                            </div>
                          </div>
                        </div>

                        {/* Document Print Header Excerpt Preview */}
                        <div className="p-3 bg-white border-2 border-slate-900 rounded-xl space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                            Print Documents
                          </div>
                          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                            <div
                              style={{
                                background: `linear-gradient(135deg, ${profile.primary_color || '#1E40AF'} 0%, ${profile.secondary_color || '#3B82F6'} 100%)`,
                              }}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-serif font-black text-white shrink-0"
                            >
                              {profile.short_name || 'PA'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold text-slate-900 truncate">
                                {profile.name || 'Prashant Academy'}
                              </div>
                              <div className="text-[8.5px] text-slate-500 font-mono">
                                REF: RCP-2026-001
                              </div>
                            </div>
                          </div>
                          <div
                            style={{ backgroundColor: profile.accent_color || '#8B5CF6' }}
                            className="text-[9px] font-bold text-white px-2 py-0.5 rounded text-center"
                          >
                            Accent Status Badge
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Presets and Custom Colors Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Theme Presets */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                          <Palette className="w-4 h-4 text-blue-600" />
                          <span>Curated Theme Presets</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { name: 'Royal Blue & Indigo', primary: '#1E40AF', secondary: '#3B82F6', accent: '#8B5CF6' },
                            { name: 'Emerald Forest', primary: '#065F46', secondary: '#10B981', accent: '#059669' },
                            { name: 'Midnight Slate', primary: '#0F172A', secondary: '#38BDF8', accent: '#6366F1' },
                            { name: 'Imperial Crimson', primary: '#881337', secondary: '#F43F5E', accent: '#FB7185' },
                          ].map((preset) => {
                            const isCurrent =
                              profile.primary_color?.toUpperCase() === preset.primary.toUpperCase() &&
                              profile.secondary_color?.toUpperCase() === preset.secondary.toUpperCase()
                            return (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                  setProfile((prev) => {
                                    const next = {
                                      ...prev,
                                      primary_color: preset.primary,
                                      secondary_color: preset.secondary,
                                      accent_color: preset.accent,
                                    }
                                    applyGlobalBrandTheme({
                                      primary: preset.primary,
                                      secondary: preset.secondary,
                                      accent: preset.accent,
                                    }, next.logo_url)
                                    return next
                                  })
                                  showNotification('success', `Preset "${preset.name}" applied to live preview. Click Save Changes to commit globally.`)
                                }}
                                className={`p-3 border rounded-xl text-left transition-all relative ${
                                  isCurrent
                                    ? 'border-blue-600 ring-2 ring-blue-500 bg-blue-50/20 shadow-xs'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                                }`}
                              >
                                {isCurrent && (
                                  <span className="absolute top-2 right-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded-full">
                                    Active
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.primary }} />
                                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.secondary }} />
                                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accent }} />
                                </div>
                                <div className="text-xs font-bold text-gray-900">{preset.name}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Custom Palette Controls */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-blue-600" />
                          <span>Custom Color Controls</span>
                        </h3>
                        <div className="space-y-3">
                          {/* Primary */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium text-gray-900">Primary Color</div>
                              <div className="text-[10px] text-gray-400">Buttons, active nav, primary highlights</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={profile.primary_color || '#1E40AF'}
                                onChange={(e) => handleProfileChange('primary_color', e.target.value)}
                                className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                              />
                              <input
                                type="text"
                                value={profile.primary_color || '#1E40AF'}
                                onChange={(e) => handleProfileChange('primary_color', e.target.value)}
                                className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                              />
                            </div>
                          </div>
                          {/* Secondary */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium text-gray-900">Secondary Color</div>
                              <div className="text-[10px] text-gray-400">Supporting gradients & header accents</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={profile.secondary_color || '#3B82F6'}
                                onChange={(e) => handleProfileChange('secondary_color', e.target.value)}
                                className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                              />
                              <input
                                type="text"
                                value={profile.secondary_color || '#3B82F6'}
                                onChange={(e) => handleProfileChange('secondary_color', e.target.value)}
                                className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                              />
                            </div>
                          </div>
                          {/* Accent */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium text-gray-900">Accent Color</div>
                              <div className="text-[10px] text-gray-400">Badges, indicators & ambient halos</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={profile.accent_color || '#8B5CF6'}
                                onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                              />
                              <input
                                type="text"
                                value={profile.accent_color || '#8B5CF6'}
                                onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}\n\n                """

    content = content[:idx_start] + new_branding_section + content[idx_cut:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Enhanced Settings.tsx branding preview and theme presets")

if __name__ == "__main__":
    enhance_preview()

