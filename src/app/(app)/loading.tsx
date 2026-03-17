export default function Loading() {
  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="h-8 w-48 bg-surface-subtle rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-64 bg-surface-subtle rounded animate-pulse mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-surface-subtle border border-surface-border animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-subtle border border-surface-border animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-subtle border border-surface-border animate-pulse" />
    </div>
  )
}
