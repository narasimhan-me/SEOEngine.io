const rows: { seo: string; deo: string }[] = [
  { seo: 'Keyword-focused', deo: 'Entity & structure-focused' },
  { seo: 'SERP-only', deo: 'Multi-platform discoverability' },
  { seo: 'Optimizes a few pages', deo: 'Optimizes entire site' },
  { seo: 'Manual audits', deo: 'Automated crawling & signals' },
  { seo: 'Human-written metadata', deo: 'AI-suggested metadata' },
  { seo: 'Rank-based', deo: 'Visibility-based' },
];

export function DeoComparisonTable() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          DEO vs SEO
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          SEO focuses on keywords and SERP rankings. DEO re-centers around visibility across all
          discovery systems.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-muted">
          <table className="min-w-full text-left text-xs text-muted-foreground">
            <thead>
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">SEO (Old model)</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">DEO (New model)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.seo} className="border-t border-border">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{row.seo}</td>
                  <td className="px-4 py-2 text-xs text-foreground">{row.deo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
