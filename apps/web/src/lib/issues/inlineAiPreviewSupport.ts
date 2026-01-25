/**
 * ISSUE-FIX-KIND-CLARITY-1 FIXUP-4: Inline AI Preview Support
 *
 * Single source of truth for which issue types support inline AI preview
 * in the Issues Engine. Prevents drift between the derivation logic
 * (issueFixActionKind.ts) and the actual UI (page.tsx).
 *
 * If this list changes, both the CTA labels AND the preview UI will update together.
 */

/**
 * Issue types that support inline AI preview in the Issues Engine.
 *
 * Requirements for inline preview support:
 * 1. Issue must have a single-product scope (primaryProductId)
 * 2. Issue must have fixType='aiFix' and fixReady=true
 * 3. Issue type must be in this allowlist
 *
 * Currently supported:
 * - missing_seo_title: AI generates SEO title suggestion
 * - missing_seo_description: AI generates SEO description suggestion
 */
const INLINE_AI_PREVIEW_SUPPORTED_ISSUE_TYPES: ReadonlySet<string> = new Set([
  'missing_seo_title',
  'missing_seo_description',
]);

/**
 * Checks if an issue type supports inline AI preview.
 *
 * @param issueType - The issue type string (from issue.type or issue.id)
 * @returns true if inline AI preview is supported for this issue type
 */
export function isInlineAiPreviewSupportedIssueType(
  issueType: string | null | undefined
): boolean {
  if (!issueType) return false;
  return INLINE_AI_PREVIEW_SUPPORTED_ISSUE_TYPES.has(issueType);
}

/**
 * Checks if an issue supports inline AI preview based on its type.
 * Convenience wrapper that derives issueType from issue object.
 *
 * @param issue - Issue object with type and id properties
 * @returns true if inline AI preview is supported for this issue
 */
export function isInlineAiPreviewSupportedIssue(issue: {
  type?: string;
  id: string;
}): boolean {
  const issueType = (issue.type as string | undefined) ?? issue.id;
  return isInlineAiPreviewSupportedIssueType(issueType);
}

/**
 * Export the set for dev-time inspection/debugging.
 * Do NOT modify at runtime.
 */
export const SUPPORTED_INLINE_PREVIEW_TYPES = INLINE_AI_PREVIEW_SUPPORTED_ISSUE_TYPES;
