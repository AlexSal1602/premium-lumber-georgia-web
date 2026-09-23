'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="container" style={{ paddingBlock: 100 }}><h1>გვერდი დროებით მიუწვდომელია</h1><p>გთხოვთ, სცადოთ ხელახლა ცოტა ხანში.</p><button className="primary-button" onClick={reset}>ხელახლა ცდა</button></main>;
}
