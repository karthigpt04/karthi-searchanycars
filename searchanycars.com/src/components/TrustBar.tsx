export const TrustBar = () => {
  const items = [
    { icon: '🔍', label: '200+ Point Inspection', iconClass: 'trust-icon-blue' },
    { icon: '🔄', label: '7-Day Money Back', iconClass: 'trust-icon-green' },
    { icon: '🛡️', label: '1-Year Warranty', iconClass: 'trust-icon-blue' },
    { icon: '💰', label: 'Fixed Price — No Haggling', iconClass: 'trust-icon-orange' },
    { icon: '📋', label: 'Free RC Transfer', iconClass: 'trust-icon-green' },
  ]

  return (
    <section className="trust-bar">
      <div className="container">
        <div className="trust-bar-grid">
          {items.map((item) => (
            <div key={item.label} className="trust-item">
              <span className={`trust-icon ${item.iconClass}`}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
