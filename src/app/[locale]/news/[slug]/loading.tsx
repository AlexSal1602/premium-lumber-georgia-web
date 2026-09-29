export default function NewsArticleLoading() {
  return <main id="main" className="container news-page news-article news-article-loading" aria-busy="true" aria-label="Loading article">
    <span className="skeleton skeleton-back" />
    <span className="skeleton skeleton-title" />
    <span className="skeleton skeleton-title skeleton-title-short" />
    <span className="skeleton skeleton-date" />
    <span className="skeleton skeleton-hero" />
    <span className="skeleton skeleton-copy skeleton-copy-lead" />
    <div className="skeleton-paragraph">
      <span className="skeleton skeleton-copy" />
      <span className="skeleton skeleton-copy" />
      <span className="skeleton skeleton-copy skeleton-copy-short" />
    </div>
  </main>;
}
