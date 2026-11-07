# /**
#  * @file        patch_branding_ui.py
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
#  * @description Patches Sidebar.tsx and OrganizationBranding.tsx with official PrathamOne brand assets and footnotes.
#  */

def patch_sidebar():
    path = "frontend/src/components/Sidebar.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("\r\n", "\n")

    footnote_student = """          {/* PrathamOne EduOS Platform Footnote */}
          {!isCollapsed && (
            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/70 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <img
                  src={branding.assets.symbolMarkTransparentUrl || branding.assets.prathamOneMarkTransparentUrl}
                  alt="PrathamOne"
                  className="w-3.5 h-3.5 object-contain opacity-80"
                />
                <span className="font-medium text-slate-300 truncate">{branding.suiteName}</span>
              </div>
              <span className="font-mono text-slate-400 text-[9.5px]">{branding.versionDisplay}</span>
            </div>
          )}
        </aside>"""

    footnote_admin = """        {/* PrathamOne EduOS Platform Footnote */}
        {!isCollapsed && (
          <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/70 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <img
                src={branding.assets.symbolMarkTransparentUrl || branding.assets.prathamOneMarkTransparentUrl}
                alt="PrathamOne"
                className="w-3.5 h-3.5 object-contain opacity-80"
              />
              <span className="font-medium text-slate-300 truncate">{branding.suiteName}</span>
            </div>
            <span className="font-mono text-slate-400 text-[9.5px]">{branding.versionDisplay}</span>
          </div>
        )}
      </aside>"""

    # Replace student aside
    target_student = "        </aside>\n      </>"
    replacement_student = footnote_student + "\n      </>"
    if target_student in content:
        content = content.replace(target_student, replacement_student, 1)

    # Replace admin aside
    target_admin = "      </aside>\n    </>"
    replacement_admin = footnote_admin + "\n    </>"
    if target_admin in content:
        content = content.replace(target_admin, replacement_admin, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched Sidebar.tsx successfully")

def patch_organization_branding():
    path = "frontend/src/components/OrganizationBranding.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("\r\n", "\n")

    old_icon_block = """                      <div
                        className={`p-1.5 rounded-lg ${
                          product.isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </div>"""

    new_icon_block = """                      <div
                        className={`p-1 rounded-lg flex items-center justify-center ${
                          product.isCurrent
                            ? 'bg-white border border-blue-200 shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        {product.id === 'prathamone' ? (
                          <img
                            src={branding.assets.symbolMarkTransparentUrl || branding.assets.prathamOneMarkTransparentUrl}
                            alt="PrathamOne"
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        )}
                      </div>"""

    if old_icon_block in content:
        content = content.replace(old_icon_block, new_icon_block)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched OrganizationBranding.tsx successfully")

if __name__ == "__main__":
    patch_sidebar()
    patch_organization_branding()
