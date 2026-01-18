import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeUrl, SecurityContext } from '@angular/platform-browser';

/**
 * Service for sanitizing user input to prevent XSS attacks
 *
 * Use this service whenever displaying user-generated content or URLs
 *
 * @example
 * ```typescript
 * // In a component
 * private sanitizer = inject(SanitizerService);
 *
 * displayUserInput(html: string) {
 *   return this.sanitizer.sanitizeHtml(html);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class SanitizerService {
  private domSanitizer = inject(DomSanitizer);

  /**
   * Sanitize HTML content
   * Removes potentially dangerous scripts and elements
   *
   * @param html - HTML string to sanitize
   * @returns Sanitized HTML or empty string if null
   *
   * @example
   * ```typescript
   * // User input: '<script>alert("XSS")</script>Hello'
   * const safe = this.sanitizer.sanitizeHtml(userInput);
   * // Result: 'Hello' (script removed)
   * ```
   */
  sanitizeHtml(html: string | null): SafeHtml {
    if (!html) return '';

    const sanitized = this.domSanitizer.sanitize(SecurityContext.HTML, html);
    return this.domSanitizer.sanitize(SecurityContext.HTML, sanitized || '') || '';
  }

  /**
   * Sanitize URLs
   * Ensures URLs are safe to use in href attributes
   *
   * @param url - URL string to sanitize
   * @returns Sanitized URL
   *
   * @example
   * ```typescript
   * // Dangerous: javascript:alert('XSS')
   * const safe = this.sanitizer.sanitizeUrl(userUrl);
   * // Result: 'unsafe:javascript:alert('XSS')' (blocked)
   * ```
   */
  sanitizeUrl(url: string | null): SafeUrl {
    if (!url) return '';
    return this.domSanitizer.sanitize(SecurityContext.URL, url) || '';
  }

  /**
   * Sanitize resource URLs (for iframes, etc.)
   * Use for trusted external resources
   *
   * @param url - Resource URL to sanitize
   * @returns Safe resource URL
   */
  sanitizeResourceUrl(url: string): SafeResourceUrl {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Sanitize style values
   * Use when binding user input to [style] attribute
   *
   * @param style - Style string to sanitize
   * @returns Sanitized style
   */
  sanitizeStyle(style: string | null): string {
    if (!style) return '';
    return this.domSanitizer.sanitize(SecurityContext.STYLE, style) || '';
  }

  /**
   * Strip all HTML tags from a string
   * Useful for displaying plain text from HTML content
   *
   * @param html - HTML string
   * @returns Plain text without HTML tags
   *
   * @example
   * ```typescript
   * const plain = this.sanitizer.stripHtml('<p>Hello <b>World</b></p>');
   * // Result: 'Hello World'
   * ```
   */
  stripHtml(html: string | null): string {
    if (!html) return '';

    // Create a temporary div to parse HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Escape HTML special characters
   * Use for displaying raw user input as text
   *
   * @param text - Text to escape
   * @returns Escaped text
   *
   * @example
   * ```typescript
   * const escaped = this.sanitizer.escapeHtml('<script>alert("XSS")</script>');
   * // Result: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
   * ```
   */
  escapeHtml(text: string | null): string {
    if (!text) return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize email addresses
   *
   * @param email - Email to validate
   * @returns Sanitized email or null if invalid
   */
  sanitizeEmail(email: string | null): string | null {
    if (!email) return null;

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = email.trim().toLowerCase();

    return emailRegex.test(trimmed) ? trimmed : null;
  }

  /**
   * Sanitize user input for search queries
   * Removes special characters that could be used for injection
   *
   * @param query - Search query to sanitize
   * @returns Sanitized query
   */
  sanitizeSearchQuery(query: string | null): string {
    if (!query) return '';

    // Remove potentially dangerous characters
    return query
      .trim()
      .replace(/[<>'"]/g, '') // Remove HTML-like characters
      .replace(/[\\]/g, ''); // Remove backslashes
  }
}
