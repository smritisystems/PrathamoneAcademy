/**
 * @file        ProjectLibraryModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.studio
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.141.0
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Project Library and Media Vault modal enabling project switching, duplication, JSON import/export, and verified application asset browsing.
 */

import React, { useState, useRef } from 'react'
import {
  X,
  Plus,
  FolderOpen,
  Copy,
  Trash2,
  Download,
  Upload,
  Clock,
  Layers,
  Image as ImageIcon,
  Check,
  Search,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { useVideoStudioStore } from '../../store/videoStudioStore'
import { VERIFIED_ASSET_VAULT } from '../../config/videoStudioAssets'
import type { VerifiedAssetItem } from '../../types/videoStudio'

interface ProjectLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenDirector: () => void
}

export default function ProjectLibraryModal({
  isOpen,
  onClose,
  onOpenDirector,
}: ProjectLibraryModalProps) {
  const {
    currentProject,
    savedProjects,
    loadProject,
    newProjectFromPreset,
    duplicateProject,
    deleteProject,
    addScene,
    exportProjectJson,
    importProjectJson,
  } = useVideoStudioStore()

  const [activeTab, setActiveTab] = useState<'projects' | 'assets'>('projects')
  const [assetCategory, setAssetCategory] = useState<string>('all')
  const [assetSearch, setAssetSearch] = useState<string>('')
  const [selectedAsset, setSelectedAsset] = useState<VerifiedAssetItem | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleExportJson = () => {
    const jsonStr = exportProjectJson()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentProject.name.toLowerCase().replace(/\s+/g, '-')}-project.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        const success = importProjectJson(text)
        if (success) {
          setImportError(null)
          onClose()
        } else {
          setImportError('Invalid project JSON structure. Please verify the file.')
        }
      }
    }
    reader.readAsText(file)
  }

  const filteredAssets = VERIFIED_ASSET_VAULT.filter((asset) => {
    const matchesCategory =
      assetCategory === 'all' || asset.category === assetCategory
    const matchesSearch =
      asset.title.toLowerCase().includes(assetSearch.toLowerCase()) ||
      asset.moduleName.toLowerCase().includes(assetSearch.toLowerCase()) ||
      asset.defaultHeadline.toLowerCase().includes(assetSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Project Library & Media Vault</h2>
            </div>
            {/* Tabs */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'projects'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Saved Projects ({savedProjects.length})
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'assets'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Verified Media Vault ({VERIFIED_ASSET_VAULT.length})
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'projects' ? (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    onClose()
                    onOpenDirector()
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-md hover:from-amber-400 hover:to-orange-400 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create with AI Director</span>
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Import JSON</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>

              {importError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-lg">
                  {importError}
                </div>
              )}

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedProjects.map((proj) => {
                  const isCurrent = proj.id === currentProject.id
                  return (
                    <div
                      key={proj.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                          : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-white">{proj.name}</h3>
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-medium">
                                Active Project
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {Math.round(proj.duration)}s duration
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3 text-blue-400" />
                              {proj.scenesCount} scenes
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => duplicateProject(proj.id)}
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Duplicate Project"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProject(proj.id)}
                            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Updated {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              // If it's another project, we load it or current stays
                              onClose()
                            }}
                            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                          >
                            <span>Open in Studio</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Verified Media Vault Tab */
            <div className="space-y-5">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  {['all', 'dashboard', 'students', 'fees', 'academics', 'eduboard', 'planning', 'attendance', 'exams', 'communication'].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setAssetCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors ${
                          assetCategory === cat
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search verified screens..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Assets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="group bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl p-2 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden relative border border-slate-800/60">
                      <img
                        src={asset.url}
                        alt={asset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute top-1 left-1 bg-slate-900/80 backdrop-blur-xs text-amber-300 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                        {asset.moduleName}
                      </span>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 truncate">
                        {asset.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {asset.defaultHeadline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Asset Detail Preview Drawer / Modal */}
              {selectedAsset && (
                <div className="mt-4 p-4 rounded-xl bg-slate-800/80 border border-amber-500/30 flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                    <img
                      src={selectedAsset.url}
                      alt={selectedAsset.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{selectedAsset.title}</h3>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-medium">
                        {selectedAsset.moduleName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{selectedAsset.defaultHeadline}</p>
                    <p className="text-xs text-slate-400 italic">"{selectedAsset.defaultScript}"</p>
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() => {
                          addScene(undefined, selectedAsset.id)
                          setSelectedAsset(null)
                          onClose()
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert Scene into Project</span>
                      </button>
                      <button
                        onClick={() => setSelectedAsset(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
