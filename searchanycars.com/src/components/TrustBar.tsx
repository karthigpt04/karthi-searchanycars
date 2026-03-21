import { useSiteConfig } from '../context/SiteConfigContext'

export const TrustBar = () => {
  const { config } = useSiteConfig()

  return (
    <section className="trust-bar">
      <div className="container">
        <div className="trust-bar-grid">
          {config.trust_bar.map((item) => (
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
