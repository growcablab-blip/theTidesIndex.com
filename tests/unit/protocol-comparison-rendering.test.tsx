import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { PractitionerProtocol } from '@/server/public/queries';
import type { LibraryProtocol } from '@/server/public/protocol-library';
import { ProtocolComparison } from '@/components/public/protocol-comparison';
import { CompoundChooser } from '@/components/public/protocol-library';

/**
 * The comparison matrix under the owner's closed decision: "Not specified" does
 * NOT count as a disagreement. Fixture records only — no medical content is
 * asserted, only how the states are drawn.
 */

function protocol(id: string, sourceKey: string, fields: Partial<PractitionerProtocol>): LibraryProtocol {
  return {
    id,
    protocolKey: `PK-${id}`,
    peptideSlug: 'fixture-compound',
    peptideName: 'Fixture compound',
    objectiveContext: 'Fixture objective',
    populationModel: null,
    routeKey: null,
    routeName: null,
    regulatoryContext: null,
    evidenceTypeKey: 'practitioner_reference',
    evidenceTypeLabel: 'Practitioner reference',
    evidenceClass: 'reference' as LibraryProtocol['evidenceClass'],
    hasMonitoringGuidance: false,
    hasSafetyGuidance: false,
    formulation: null,
    amountReported: null,
    amountUnit: null,
    frequencyText: null,
    timingText: null,
    durationText: null,
    cycleText: null,
    combinationsText: null,
    titrationText: null,
    monitoringText: null,
    contraindicationsText: null,
    safetyNotes: null,
    adverseEventsText: null,
    outcomeContext: null,
    sources: [
      {
        sourceId: `s-${sourceKey}`,
        sourceKey,
        sourceTitle: `Title ${sourceKey}`,
        authors: ['Author'],
        year: 2020,
        locatorText: 'p. 1',
      } as unknown as PractitionerProtocol['sources'][number],
    ],
    ...fields,
  };
}

const records = [
  protocol('1', 'SRC-A', {
    objectiveContext: 'Same objective',
    routeName: 'Subcutaneous',
    amountReported: '250 mcg',
    frequencyText: 'Twice daily',
    durationText: 'Not stated by the source',
    populationModel: 'Not specified by the source.',
  }),
  protocol('2', 'SRC-B', {
    objectiveContext: 'Same objective.',
    routeName: 'subcutaneous',
    amountReported: '500 mcg',
    frequencyText: 'Not specified.',
    durationText: '4 weeks',
    populationModel: 'Not specified by the source; a variant for women is described.',
  }),
];

function rowOf(html: string, field: string): string {
  const start = html.indexOf(`data-field="${field}"`);
  expect(start, `no row for ${field}`).toBeGreaterThan(-1);
  const end = html.indexOf('</tr>', start);
  return html.slice(start, end);
}

describe('protocol comparison matrix', () => {
  const html = renderToStaticMarkup(
    createElement(ProtocolComparison, { protocols: records, compoundName: 'Fixture compound' }),
  );

  it('marks a real difference as a difference, with lettered wordings', () => {
    const row = rowOf(html, 'amount');
    expect(row).toContain('data-field-state="difference"');
    expect(row).toContain('Difference between sources');
    expect(row).toMatch(/Wording <\/span>A/);
    expect(row).toMatch(/Wording <\/span>B/);
  });

  it('never counts a not-specified cell as a difference', () => {
    for (const field of ['frequency', 'duration']) {
      const row = rowOf(html, field);
      expect(row, field).toContain('data-field-state="single"');
      expect(row, field).not.toContain('Difference');
      expect(row, field).toContain('Not reported');
      // No wording letter on a field with nothing to compare.
      expect(row, field).not.toContain('Wording </span>');
    }
  });

  it('shows agreement where wording matches after presentation-only normalisation', () => {
    expect(rowOf(html, 'route')).toContain('data-field-state="agreement"');
    expect(rowOf(html, 'objective')).toContain('data-field-state="agreement"');
  });

  it('hides fields no source reports from the matrix, and names them in the summary', () => {
    expect(html).not.toContain('data-field="population"');
    expect(html).toContain('data-summary-state="none"');
    expect(html).toMatch(/Not reported by any source/);
  });

  it('keeps the legend in the owner’s three terms and suggests no dose', () => {
    for (const term of ['Difference', 'Agreement', 'Not reported', 'Reported by one source only']) {
      expect(html).toContain(term);
    }
    expect(html).toContain('No column is recommended');
    for (const forbidden of ['Recommended', 'Best', 'Preferred', 'Consensus', 'Typical dose', 'Average']) {
      expect(html, forbidden).not.toContain(forbidden);
    }
    expect(html).not.toContain('Not stated by this source');
    expect(html).not.toContain('Differs');
  });
});

describe('compound chooser', () => {
  it('counts only real differences on the key fields', () => {
    const html = renderToStaticMarkup(
      createElement(CompoundChooser, { protocols: records, filters: {} }),
    );
    const diff = html.slice(html.indexOf('data-chooser-state="difference"'));
    expect(html).toContain('data-chooser-state="difference"');
    // Amount differs; frequency and duration are reported by one only.
    expect(diff.slice(0, diff.indexOf('</li>'))).toContain('Amount');
    expect(diff.slice(0, diff.indexOf('</li>'))).not.toContain('Frequency');
    const single = html.slice(html.indexOf('data-chooser-state="single"'));
    expect(single.slice(0, single.indexOf('</li>'))).toMatch(/Frequency.*Duration/);
  });

  it('does not report a difference when the only contrast is silence', () => {
    const silent = [
      protocol('1', 'SRC-A', { amountReported: '250 mcg', frequencyText: 'Not stated' }),
      protocol('2', 'SRC-B', { amountReported: 'Not specified.', frequencyText: 'Once daily' }),
    ];
    const html = renderToStaticMarkup(createElement(CompoundChooser, { protocols: silent, filters: {} }));
    expect(html).not.toContain('data-chooser-state="difference"');
    expect(html).toContain('data-chooser-state="no-difference"');
  });
});
