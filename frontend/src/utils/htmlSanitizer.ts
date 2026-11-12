/**
 * @file        htmlSanitizer.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Shared XSS sanitization and HTML escaping utilities for inline SVG QR codes, dynamic HTML document previews, and isolated print DOM trees.
 */

const UNSAFE_HTML_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'base',
  'meta',
  'link',
  'form',
  'input',
  'textarea',
  'select',
  'button',
  'noscript',
])

const UNSAFE_SVG_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'applet',
  'base',
  'link',
])

const URL_ATTRS = new Set(['href', 'xlink:href', 'src', 'action', 'formaction', 'data', 'poster'])

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
}

/**
 * Escapes plain text before interpolation into HTML markup or <title> strings.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch] || ch)
}

function isSafeUri(rawValue: string, allowDataImageOnly = true): boolean {
  const normalized = rawValue.replace(/[\u0000-\u0020]+/g, '').toLowerCase()
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html')
  ) {
    return false
  }
  if (allowDataImageOnly && normalized.startsWith('data:')) {
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(normalized)
  }
  return true
}

function sanitizeAttributes(el: Element, stripExternalUseRef = false): void {
  const attrs = Array.from(el.attributes)
  for (const attr of attrs) {
    const attrName = attr.name.toLowerCase()
    const attrVal = attr.value || ''

    if (attrName.startsWith('on')) {
      el.removeAttribute(attr.name)
      continue
    }

    if (URL_ATTRS.has(attrName)) {
      if (!isSafeUri(attrVal)) {
        el.removeAttribute(attr.name)
        continue
      }
      if (stripExternalUseRef && el.tagName.toLowerCase() === 'use' && !attrVal.startsWith('#')) {
        el.removeAttribute(attr.name)
        continue
      }
    }

    if (attrName === 'style') {
      const compact = attrVal.replace(/[\u0000-\u0020]+/g, '').toLowerCase()
      if (
        compact.includes('expression(') ||
        compact.includes('javascript:') ||
        compact.includes('vbscript:') ||
        compact.includes('-moz-binding')
      ) {
        el.removeAttribute(attr.name)
      }
    }
  }
}

/**
 * Sanitizes an already parsed Element subtree in-place (used for cloned print DOM trees).
 */
export function sanitizeDomSubtree(root: Element, allowFormElements = true): void {
  const disallowed = allowFormElements
    ? new Set(['script', 'iframe', 'object', 'embed', 'applet', 'base'])
    : UNSAFE_HTML_TAGS

  const elements = [root, ...Array.from(root.querySelectorAll('*'))]
  for (const el of elements) {
    const tag = el.tagName.toLowerCase()
    if (el !== root && disallowed.has(tag)) {
      el.parentNode?.removeChild(el)
      continue
    }
    sanitizeAttributes(el, false)
  }
}

/**
 * Sanitizes raw SVG markup (e.g. backend-generated QR code SVGs), ensuring only a safe <svg> root remains.
 */
export function sanitizeSvgMarkup(rawSvg: string | null | undefined): string {
  if (!rawSvg || typeof rawSvg !== 'string') return ''
  if (typeof DOMParser === 'undefined') {
    return rawSvg.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(rawSvg, 'image/svg+xml')
    let svgEl: Element | null = doc.querySelector('svg')

    if (!svgEl || doc.querySelector('parsererror')) {
      const htmlDoc = parser.parseFromString(rawSvg, 'text/html')
      svgEl = htmlDoc.body.querySelector('svg')
    }
    if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return ''

    const clonedSvg = svgEl.cloneNode(true) as Element
    const allNodes = [clonedSvg, ...Array.from(clonedSvg.querySelectorAll('*'))]
    for (const node of allNodes) {
      const tag = node.tagName.toLowerCase()
      if (UNSAFE_SVG_TAGS.has(tag)) {
        node.parentNode?.removeChild(node)
        continue
      }
      sanitizeAttributes(node, true)
    }
    return clonedSvg.outerHTML
  } catch {
    return ''
  }
}

/**
 * Sanitizes raw HTML strings rendered via dangerouslySetInnerHTML or preview containers.
 */
export function sanitizeRichHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml || typeof rawHtml !== 'string') return ''
  if (typeof DOMParser === 'undefined') {
    return rawHtml.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(rawHtml, 'text/html')
    const nodes = Array.from(doc.body.querySelectorAll('*'))
    for (const node of nodes) {
      const tag = node.tagName.toLowerCase()
      if (UNSAFE_HTML_TAGS.has(tag)) {
        node.parentNode?.removeChild(node)
        continue
      }
      sanitizeAttributes(node, false)
    }
    return doc.body.innerHTML
  } catch {
    return ''
  }
}

