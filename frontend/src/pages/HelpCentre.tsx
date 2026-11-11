/**
 * @file        HelpCentre.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      src.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-12
 *
 * @description Source component for Helpcentre in the src.pages module.
 */

// /**
//  * @file        HelpCentre.tsx
//  * @project     PrathamOne EduOS Coaching Institute Management System
//  * @module      frontend.src.pages
//  *
//  * @author      Jawahar R. Mallah
//  * @organization AITDL (AI Technology & Development Lab)
//  * @client      Prashant Academy Coaching Institute
//  * @copyright   Copyright (c) 2026 AITDL
//  * @license     Proprietary
//  *
//  * @version     1.0.0
//  * @created     2026-11-11
//  * @updated     2026-11-11
//  *
//  * @description Official customer-facing Help & About Centre portal unifying Getting Started, Module Guides, Tutorials, FAQs, Support Centre, About Product, About Company, Version Info, Legal & Compliance, Admin System Info, and Content Governance.
//  */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  Headphones,
  HelpCircle,
  Info,
  PackageCheck,
  PlayCircle,
  Scale,
  Search,
  ServerCog,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { helpApi } from '../api/endpoints'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuthStore } from '../store/authStore'
import type {
  HelpArticleDetail,
  HelpArticleSummary,
  HelpCategory,
  HelpProductAndVersionResponse,
  HelpSearchResultItem,
} from '../types'
import {
  HELP_WORKSPACE_TABS,
  isHelpAdminRole,
  SECTION_LABELS,
  type HelpWorkspaceTab,
} from '../components/help/helpNavigation'
import HelpArticleView from '../components/help/HelpArticleView'
import HelpSupportCentre from '../components/help/HelpSupportCentre'
import AboutProductSection from '../components/help/AboutProductSection'
import AboutCompanySection from '../components/help/AboutCompanySection'
import ProductVersionSection from '../components/help/ProductVersionSection'
import LegalComplianceSection from '../components/help/LegalComplianceSection'
import SystemInfoSection from '../components/help/SystemInfoSection'
import HelpGovernanceSection from '../components/help/HelpGovernanceSection'

function resolveActiveTab(pathname: string, search: string): HelpWorkspaceTab {
  if (pathname === '/about' || pathname.startsWith('/help/about-product')) return 'about_product'
  if (pathname.startsWith('/help/about-company')) return 'about_company'
  if (pathname.startsWith('/help/version')) return 'version'
  if (pathname.startsWith('/help/legal')) return 'legal'
  if (pathname.startsWith('/help/system-info')) return 'system_info'
  if (pathname.startsWith('/help/governance')) return 'governance'
  if (pathname === '/support' || pathname.startsWith('/help/support')) return 'support'

  const sp = new URLSearchParams(search)
  const sec = sp.get('section')
  if (sec === 'getting_started' || sec === 'module_guide' || sec === 'tutorial' || sec === 'faq') {
    return sec
  }
  return 'overview'
}

export default function HelpCentre() {
  useDocumentTitle('Help & About Centre')
  const location = useLocation()
  const navigate = useNavigate()
  const { slug: routeSlug } = useParams<{ slug?: string }>()
  const { user } = useAuthStore()
  const isAdmin = isHelpAdminRole(user?.role)

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const fromRoute = searchParams.get('from')
  const isArticleRoute = location.pathname.startsWith('/help/article/')
  const isLegalRoute = location.pathname.startsWith('/help/legal')
  const activeTab = resolveActiveTab(location.pathname, location.search)

  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [articles, setArticles] = useState<HelpArticleSummary[]>([])
  const [productInfo, setProductInfo] = useState<HelpProductAndVersionResponse | null>(null)
  const [articleDetail, setArticleDetail] = useState<HelpArticleDetail | null>(null)
  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingArticle, setLoadingArticle] = useState(false)

  // Unified Search State
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [searchResults, setSearchResults] = useState<HelpSearchResultItem[] | null>(null)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([
    'Fee Collection',
    'Concessions & Waivers',
    'Scholarships',
    'Student Admission',
    'Attendance',
    'Report Cards',
  ])
  const [searching, setSearching] = useState(false)

  const loadBaseData = useCallback(async () => {
    setLoadingBase(true)
    try {
      const [catRes, artRes, prodRes] = await Promise.all([
        helpApi.getCategories(),
        helpApi.getArticles(),
        helpApi.getProductInfo(),
      ])
      setCategories(catRes.data.items || [])
      setArticles(artRes.data.items || [])
      setProductInfo(prodRes.data)
    } catch {
      toast.error('Unable to load Help & About Centre directory.')
    } finally {
      setLoadingBase(false)
    }
  }, [])

  useEffect(() => {
    loadBaseData()
  }, [loadBaseData])

  // Load article detail when on /help/article/:slug
  useEffect(() => {
    if (!isArticleRoute || !routeSlug) {
      setArticleDetail(null)
      return
    }
    let active = true
    setLoadingArticle(true)
    helpApi
      .getArticle(routeSlug)
      .then((res) => {
        if (active) setArticleDetail(res.data)
      })
      .catch(() => {
        if (active) {
          setArticleDetail(null)
          toast.error('Requested documentation article was not found.')
        }
      })
      .finally(() => {
        if (active) setLoadingArticle(false)
      })
    return () => {
      active = false
    }
  }, [isArticleRoute, routeSlug])

  const executeSearch = async (q: string) => {
    const trimmed = q.trim()
    setSearchQuery(trimmed)
    if (!trimmed) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await helpApi.search(trimmed)
      setSearchResults(res.data.results || [])
      if (res.data.suggestions?.length) {
        setSearchSuggestions(res.data.suggestions)
      }
    } catch {
      toast.error('Help search failed. Please retry.')
    } finally {
      setSearching(false)
    }
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isArticleRoute) {
      navigate(`/help?q=${encodeURIComponent(searchInput.trim())}`)
    }
    executeSearch(searchInput)
  }

  useEffect(() => {
    const qParam = searchParams.get('q') || ''
    if (qParam) {
      setSearchInput(qParam)
      executeSearch(qParam)
    } else if (!searchInput) {
      setSearchResults(null)
    }
  }, [location.search])

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    setSearchResults(null)
    if (searchParams.get('q')) {
      navigate('/help')
    }
  }

  const visibleTabs = useMemo(
    () => HELP_WORKSPACE_TABS.filter((t) => !t.adminOnly || isAdmin),
    [isAdmin],
  )

  const articlesBySection = useMemo(() => {
    const grouped: Record<string, HelpArticleSummary[]> = {
      getting_started: [],
      module_guide: [],
      tutorial: [],
      faq: [],
      legal: [],
    }
    for (const a of articles) {
      if (!grouped[a.section]) grouped[a.section] = []
      grouped[a.section].push(a)
    }
    return grouped
  }, [articles])

  const openArticleSlug = (slug: string, sectionHint?: string) => {
    if (sectionHint === 'legal') {
      navigate(`/help/legal/${slug}`)
      return
    }
    const suffix = fromRoute ? `?from=${encodeURIComponent(fromRoute)}` : ''
    navigate(`/help/article/${slug}${suffix}`)
  }

  const renderSectionCards = (sectionKey: 'getting_started' | 'module_guide' | 'tutorial' | 'faq') => {
    const list = articlesBySection[sectionKey] || []
    const label = SECTION_LABELS[sectionKey]
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{label}</h2>
            <p className="text-xs text-slate-500">
              {list.length} verified customer guide{list.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/help')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Help Home</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((art) => (
            <button
              key={art.slug}
              type="button"
              onClick={() => openArticleSlug(art.slug)}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm p-5 transition-all flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                    {art.module_key || sectionKey.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-400">v{art.doc_version}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">
                  {art.title}
                </h3>
                {art.summary && (
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">
                    {art.summary}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 pt-2 border-t border-slate-100">
                <span>Read Guide</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Top Unified Header & Search Gateway */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>PrathamOne EduOS Official Help &amp; About Centre</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              How can we help your institution today?
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Browse module manuals, operational workflows, FAQs, product details, legal disclosures, or contact technical support.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="w-full lg:w-[440px] space-y-2">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search guides, tutorials, FAQs, fees, company info..."
                aria-label="Search Help & About Centre"
                className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-20 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span>Popular:</span>
              {searchSuggestions.slice(0, 5).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setSearchInput(sug)
                    if (isArticleRoute) navigate(`/help?q=${encodeURIComponent(sug)}`)
                    executeSearch(sug)
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Section Navigation Strip */}
        <nav
          aria-label="Help & About Sections"
          className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100"
        >
          {visibleTabs.map((tab) => {
            const isActive = !isArticleRoute && searchResults === null && activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  clearSearch()
                  navigate(tab.path)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Unified Search Results View */}
      {searchResults !== null ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Search Results for &ldquo;{searchQuery}&rdquo; ({searchResults.length})
              </h2>
              <p className="text-xs text-slate-500">
                Unified across User Guides, Tutorials, FAQs, Product &amp; Company Information, Legal Docs, and Support.
              </p>
            </div>
            <button
              type="button"
              onClick={clearSearch}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Search
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-slate-600">
                No exact documentation matches were found for &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  clearSearch()
                  navigate('/help/support')
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Ask Support Centre</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((res) => (
                <button
                  key={`${res.type}-${res.slug}`}
                  type="button"
                  onClick={() => {
                    clearSearch()
                    navigate(res.route)
                  }}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                      {SECTION_LABELS[res.section] || res.section}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">{res.title}</div>
                  {res.summary && <div className="text-xs text-slate-600 line-clamp-2">{res.summary}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : isArticleRoute ? (
        loadingArticle ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading documentation article...
          </div>
        ) : articleDetail ? (
          <HelpArticleView
            article={articleDetail}
            fromRoute={fromRoute}
            onSelectSlug={(slug) => openArticleSlug(slug, articleDetail.section)}
            onBackToList={() => {
              const sec = articleDetail.section
              if (sec === 'legal') navigate('/help/legal')
              else navigate(`/help?section=${sec}`)
            }}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <p className="text-sm text-slate-600">Article could not be found.</p>
            <button
              type="button"
              onClick={() => navigate('/help')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Return to Help Home
            </button>
          </div>
        )
      ) : activeTab === 'getting_started' ? (
        renderSectionCards('getting_started')
      ) : activeTab === 'module_guide' ? (
        renderSectionCards('module_guide')
      ) : activeTab === 'tutorial' ? (
        renderSectionCards('tutorial')
      ) : activeTab === 'faq' ? (
        renderSectionCards('faq')
      ) : activeTab === 'support' ? (
        <HelpSupportCentre productInfo={productInfo} />
      ) : activeTab === 'about_product' ? (
        <AboutProductSection data={productInfo} />
      ) : activeTab === 'about_company' ? (
        <AboutCompanySection data={productInfo} />
      ) : activeTab === 'version' ? (
        <ProductVersionSection data={productInfo} />
      ) : activeTab === 'legal' || isLegalRoute ? (
        <LegalComplianceSection
          legalArticles={articlesBySection.legal || []}
          selectedSlug={routeSlug}
        />
      ) : activeTab === 'system_info' ? (
        <SystemInfoSection />
      ) : activeTab === 'governance' ? (
        <HelpGovernanceSection
          categories={categories}
          productInfo={productInfo}
          onRefreshAll={loadBaseData}
        />
      ) : (
        /* Overview Home */
        <div className="space-y-6">
          {loadingBase ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              Loading Help &amp; About Centre catalog...
            </div>
          ) : (
            <>
              {/* 5 Main Help Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Getting Started',
                    count: `${articlesBySection.getting_started.length} Guides`,
                    desc: 'First-time login, institute profile, academic year, divisions, users, and go-live checklist.',
                    icon: Compass,
                    color: 'bg-indigo-50 text-indigo-600',
                    path: '/help?section=getting_started',
                  },
                  {
                    title: 'Module User Guides',
                    count: `${articlesBySection.module_guide.length} Modules`,
                    desc: 'Step-by-step manuals, permissions, and troubleshooting for every module in PrathamOne EduOS.',
                    icon: BookOpen,
                    color: 'bg-emerald-50 text-emerald-600',
                    path: '/help?section=module_guide',
                  },
                  {
                    title: 'Tutorials & Workflows',
                    count: `${articlesBySection.tutorial.length} Workflows`,
                    desc: 'Practical daily operations: admissions, fee collection, receipts, concessions, attendance & report cards.',
                    icon: PlayCircle,
                    color: 'bg-blue-50 text-blue-600',
                    path: '/help?section=tutorial',
                  },
                  {
                    title: 'FAQ & Troubleshooting',
                    count: `${articlesBySection.faq.length} Topics`,
                    desc: 'Categorized solutions for login issues, View Mode, fee math, printing layouts, and error IDs.',
                    icon: HelpCircle,
                    color: 'bg-amber-50 text-amber-600',
                    path: '/help?section=faq',
                  },
                  {
                    title: 'Customer Support Centre',
                    count: 'Ticketing & Contact',
                    desc: 'Submit support requests, report issues, suggest features, track responses, or reach technical support.',
                    icon: Headphones,
                    color: 'bg-purple-50 text-purple-600',
                    path: '/help/support',
                  },
                  {
                    title: 'Product, Company & Legal',
                    count: 'Identity & Version',
                    desc: 'About PrathamOne EduOS, SMRITI Systems & AITDL, Version details, and Legal & Compliance documents.',
                    icon: Info,
                    color: 'bg-slate-100 text-slate-700',
                    path: '/help/about-product',
                  },
                ].map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => navigate(card.path)}
                    className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm p-5 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                          <card.icon className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {card.count}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-700">
                        {card.title}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{card.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                      <span>Explore Section</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Product, Company, Legal & Admin Quick Links */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 mb-3">
                  Product Information, Governance &amp; Compliance Quick Links
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/help/about-product')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <div className="text-xs font-bold text-slate-900">About PrathamOne EduOS</div>
                    <div className="text-[11px] text-slate-500">Capabilities &amp; modules</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/help/about-company')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1"
                  >
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <div className="text-xs font-bold text-slate-900">About SMRITI Systems</div>
                    <div className="text-[11px] text-slate-500">Developer &amp; contacts</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/help/version')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1"
                  >
                    <PackageCheck className="w-4 h-4 text-indigo-600" />
                    <div className="text-xs font-bold text-slate-900">Product &amp; Version Info</div>
                    <div className="text-[11px] text-slate-500">
                      v{productInfo?.version_info?.version_number || '1.76.0'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/help/legal')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1"
                  >
                    <Scale className="w-4 h-4 text-indigo-600" />
                    <div className="text-xs font-bold text-slate-900">Legal &amp; Compliance</div>
                    <div className="text-[11px] text-slate-500">Policies &amp; licensing</div>
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => navigate('/help/system-info')}
                      className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1"
                    >
                      <ServerCog className="w-4 h-4 text-emerald-600" />
                      <div className="text-xs font-bold text-slate-900">System Information</div>
                      <div className="text-[11px] text-slate-500">Health, DB &amp; backups</div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/help/support')}
                      className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left space-y-1"
                    >
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <div className="text-xs font-bold text-slate-900">Track My Requests</div>
                      <div className="text-[11px] text-slate-500">Support ticket portal</div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
