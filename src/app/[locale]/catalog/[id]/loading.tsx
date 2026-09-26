const Skeleton = ({ className = '' }: { className?: string }) => (
  <span className={`skeleton-block ${className}`} aria-hidden="true" />
);

export default function ProductLoading() {
  return (
    <main id="main" className="detail-page detail-skeleton container" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="skeleton-breadcrumbs" aria-hidden="true">
        <Skeleton className="skeleton-crumb" />
        <Skeleton className="skeleton-crumb skeleton-crumb-short" />
        <Skeleton className="skeleton-crumb skeleton-crumb-long" />
      </div>
      <Skeleton className="skeleton-back" />

      <div className="detail-top">
        <section className="product-gallery" aria-hidden="true">
          <Skeleton className="skeleton-gallery-main" />
          <div className="gallery-thumbnails">
            <Skeleton className="skeleton-thumbnail" />
            <Skeleton className="skeleton-thumbnail" />
          </div>
        </section>

        <section className="product-summary skeleton-summary" aria-hidden="true">
          <Skeleton className="skeleton-eyebrow" />
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-title skeleton-title-short" />
          <Skeleton className="skeleton-code" />
          <div className="skeleton-copy">
            <Skeleton />
            <Skeleton />
            <Skeleton className="skeleton-line-short" />
          </div>
          <Skeleton className="skeleton-badge" />
          <Skeleton className="skeleton-label" />
          <Skeleton className="skeleton-control" />
          <Skeleton className="skeleton-price" />
          <div className="purchase-inputs">
            <div><Skeleton className="skeleton-label" /><Skeleton className="skeleton-control" /></div>
            <div><Skeleton className="skeleton-label" /><Skeleton className="skeleton-control" /></div>
          </div>
          <div className="skeleton-total"><Skeleton /><Skeleton /></div>
          <Skeleton className="skeleton-button" />
          <Skeleton className="skeleton-note" />
        </section>
      </div>

      <div className="detail-bottom" aria-hidden="true">
        <section>
          <Skeleton className="skeleton-section-title" />
          <div className="skeleton-description">
            <Skeleton /><Skeleton /><Skeleton /><Skeleton className="skeleton-line-short" />
          </div>
          <Skeleton className="skeleton-section-title" />
          <div className="skeleton-specs"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
        </section>
        <section>
          <Skeleton className="skeleton-section-title" />
          <Skeleton className="skeleton-table" />
        </section>
      </div>
    </main>
  );
}
