/**
 * @file        GlobalNavigationSearch.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.navigation
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Global navigation search command palette supporting quick module routing, pin shortcuts, and recent history.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Pin,
  PinOff,
  History,
  ArrowRight,
  X,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNavigationStore } from '../../store/navigationStore'
import { getAuthorizedModules } from '../../config/modules'
import { useBranding } from '../../config/branding'

export default function GlobalNavigationSearch() {
  const navigate = useNavigate()
  const branding = useBranding()
  const { user, selectedInstitutionId } = useAuthStore()
  const {
    isSearchOpen,
    closeSearch,
    pinnedItems,
    hiddenItems,
    togglePinItem,
    recentVisits,
    openCustomizer,
    savePreferences,
  } = useNavigationStore()

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const authorizedModules = useMemo(() => getAuthorizedModules(user), [user])

  // Flatten modules and sub-items for unified search
  const searchableItems = useMemo(() => {
    const list: Array<{
      id: string
      moduleKey: string
      title: string
      parentTitle?: string
      category: string
      routePath: string
      icon: any
      description: string
      isSubItem: boolean
      isPinned: boolean
      isHidden: boolean
    }> = []

    authorizedModules.forEach((mod) => {
      const isPinned = pinnedItems.includes(mod.id)
      const isHidden = hiddenItems.includes(mod.id)

      // Add parent module
      list.push({
        id: mod.id,
        moduleKey: mod.id,
        title: mod.label,
        category: mod.category,
        routePath: mod.defaultPath,
        icon: mod.icon,
        description: mod.description,
        isSubItem: false,
        isPinned,
        isHidden,
      })

      // Add sub-items
      mod.subItems.forEach((sub) => {
        const subKey = sub.id
        const isSubPinned = pinnedItems.includes(subKey)
        list.push({
          id: subKey,
          moduleKey: mod.id,
          title: sub.label,
          parentTitle: mod.label,
          category: mod.category,
          routePath: sub.to,
          icon: mod.icon,
          description: `${mod.label} sub-workspace`,
          isSubItem: true,
          isPinned: isSubPinned,
          isHidden: false,
        })
      })
    })

    return list
  }, [authorizedModules, pinnedItems, hiddenItems])

  // Filtered search results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    return searchableItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false
      }
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        (item.parentTitle && item.parentTitle.toLowerCase().includes(q)) ||
        item.routePath.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    })
  }, [searchableItems, query, selectedCategory])

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isSearchOpen])

  // Keyboard navigation & Ctrl+K trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isSearchOpen) {
          closeSearch()
        } else {
          useNavigationStore.getState().openSearch()
        }
      }

      if (!isSearchOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        closeSearch()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < filteredResults.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredResults.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredResults[selectedIndex]
        if (selected) {
          handleSelect(selected.routePath)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen, filteredResults, selectedIndex, closeSearch])

  if (!isSearchOpen) return null

  const handleSelect = (routePath: string) => {
    closeSearch()
    navigate(routePath)
  }

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    togglePinItem(id)
    savePreferences(selectedInstitutionId || 1).catch(() => {})
  }

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'core', label: 'Core' },
    { id: 'academic', label: 'Academic' },
    { id: 'students', label: 'Students & CRM' },
    { id: 'finance', label: 'Finance' },
    { id: 'workforce', label: 'Workforce' },
    { id: 'operations', label: 'Operations' },
    { id: 'admin', label: 'Admin' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={closeSearch}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search modules, pages, reports, or workflows... (Press Esc to exit)"
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.id)
                setSelectedIndex(0)
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === c.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {/* Recently Visited Section if query is empty */}
          {!query && recentVisits.length > 0 && selectedCategory === 'all' && (
            <div className="mb-3 px-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <History className="w-3.5 h-3.5" />
                <span>Recently Visited Workspaces</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {recentVisits.slice(0, 4).map((rec) => (
                  <button
                    key={rec.route_path}
                    onClick={() => handleSelect(rec.route_path)}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 text-left transition-all group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {rec.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{rec.route_path}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Module Results List */}
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold">No authorized modules found matching &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Try a different keyword or category filter</p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const IconComp = item.icon
              const isSelected = idx === selectedIndex

              return (
                <div
                  key={`${item.id}_${item.routePath}`}
                  onClick={() => handleSelect(item.routePath)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-white border border-primary-200 dark:border-primary-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        {item.parentTitle && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium truncate">
                            {item.parentTitle}
                          </span>
                        )}
                        {item.isHidden && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded font-bold">
                            Hidden in My Menu
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(e, item.id)}
                      title={item.isPinned ? 'Unpin from My Menu' : 'Pin to My Menu'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        item.isPinned
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-300 dark:border-amber-800'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent hover:border-slate-300'
                      }`}
                    >
                      {item.isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                    </button>
                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-primary-600' : 'text-slate-300'}`} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono">Enter</kbd> to select
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              closeSearch()
              openCustomizer()
            }}
            className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:underline font-semibold"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize My Menu</span>
          </button>
        </div>
      </div>
    </div>
  )
}
