export function LoadingSpinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="loading-label">{label}</p>
    </div>
  );
}
