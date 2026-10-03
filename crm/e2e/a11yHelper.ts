import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface A11yScanResult {
  route: string;
  theme: string;
  violationsCount: number;
  violationsByRule: Record<string, number>;
  seriousAndCriticalCount: number;
}

export async function scanPageA11y(
  page: Page,
  route: string,
  theme: 'light' | 'dark' = 'light'
): Promise<A11yScanResult> {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const violationsByRule: Record<string, number> = {};
  let seriousAndCriticalCount = 0;

  for (const v of accessibilityScanResults.violations) {
    violationsByRule[v.id] = (violationsByRule[v.id] || 0) + v.nodes.length;
    if (v.impact === 'serious' || v.impact === 'critical') {
      seriousAndCriticalCount += v.nodes.length;
    }
  }

  return {
    route,
    theme,
    violationsCount: accessibilityScanResults.violations.length,
    violationsByRule,
    seriousAndCriticalCount,
  };
}

export async function expectNoA11yViolations(
  page: Page,
  options: { tags?: string[] } = { tags: ['wcag2a', 'wcag2aa'] }
) {
  const scan = await new AxeBuilder({ page })
    .withTags(options.tags || ['wcag2a', 'wcag2aa'])
    .analyze();

  expect(scan.violations).toEqual([]);
}
