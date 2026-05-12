export default function PortalLoading() {
  return (
    <div className="space-y-8">
      <div className="h-32 bg-white border rounded-lg animate-pulse" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border rounded-lg animate-pulse" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-96 bg-white border rounded-lg animate-pulse" />
        <div className="h-96 bg-white border rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
