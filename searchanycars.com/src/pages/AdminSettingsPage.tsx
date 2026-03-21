import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useSiteConfig } from '../context/SiteConfigContext'
import type { SiteConfig } from '../config/defaults'

type TabKey = 'hero' | 'trust_bar' | 'cities' | 'reviews' | 'body_types' | 'fuel_types' | 'budget_brackets' | 'nav_items' | 'footer' | 'sell_cta' | 'splus_banner' | 'spn_banner' | 'contact_info' | 'site_name'

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hero', label: 'Hero Section', icon: '🏠' },
  { key: 'trust_bar', label: 'Trust Bar', icon: '🛡️' },
  { key: 'cities', label: 'Cities', icon: '🏙️' },
  { key: 'reviews', label: 'Reviews', icon: '⭐' },
  { key: 'body_types', label: 'Body Types', icon: '🚗' },
  { key: 'fuel_types', label: 'Fuel Types', icon: '⛽' },
  { key: 'budget_brackets', label: 'Budgets', icon: '💰' },
  { key: 'nav_items', label: 'Navigation', icon: '🧭' },
  { key: 'footer', label: 'Footer', icon: '📋' },
  { key: 'sell_cta', label: 'Sell CTA', icon: '📢' },
  { key: 'splus_banner', label: 'S-Plus Banner', icon: '✨' },
  { key: 'spn_banner', label: 'S-Plus New Banner', icon: '🆕' },
  { key: 'contact_info', label: 'Contact Info', icon: '📞' },
  { key: 'site_name', label: 'Site Name', icon: '🏷️' },
]

export const AdminSettingsPage = () => {
  const { config, refreshConfig } = useSiteConfig()
  const [activeTab, setActiveTab] = useState<TabKey>('hero')
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    setFormData({ ...config })
  }, [config])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3000)
  }

  const saveKey = async (key: TabKey) => {
    setSaving(true)
    try {
      await api.updateSiteConfig(key, formData[key])
      refreshConfig()
      showToast(`${tabs.find(t => t.key === key)?.label} saved!`)
    } catch {
      showToast('Failed to save. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Helper for nested object updates
  const updateNested = (configKey: string, field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [configKey]: { ...(prev[configKey] as Record<string, unknown>), [field]: value }
    }))
  }

  // Helper for array item updates
  const updateArrayItem = (configKey: string, index: number, field: string, value: unknown) => {
    setFormData(prev => {
      const arr = [...(prev[configKey] as Array<Record<string, unknown>>)]
      arr[index] = { ...arr[index], [field]: value }
      return { ...prev, [configKey]: arr }
    })
  }

  const addArrayItem = (configKey: string, template: Record<string, unknown>) => {
    setFormData(prev => {
      const arr = [...(prev[configKey] as Array<Record<string, unknown>> || []), template]
      return { ...prev, [configKey]: arr }
    })
  }

  const removeArrayItem = (configKey: string, index: number) => {
    setFormData(prev => {
      const arr = (prev[configKey] as Array<unknown>).filter((_, i) => i !== index)
      return { ...prev, [configKey]: arr }
    })
  }

  const moveArrayItem = (configKey: string, from: number, to: number) => {
    setFormData(prev => {
      const arr = [...(prev[configKey] as Array<unknown>)]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return { ...prev, [configKey]: arr }
    })
  }

  const data = formData as SiteConfig

  const renderTab = () => {
    switch (activeTab) {
      case 'site_name':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Site Name</h3>
            <div className="adm-s-field">
              <label>Site Name</label>
              <input className="adm-input" value={String(data.site_name || '')} onChange={e => updateField('site_name', e.target.value)} />
            </div>
          </div>
        )

      case 'hero':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Hero Section</h3>
            <div className="adm-s-field">
              <label>Title</label>
              <input className="adm-input" value={data.hero?.title || ''} onChange={e => updateNested('hero', 'title', e.target.value)} />
            </div>
            <div className="adm-s-field">
              <label>Subtitle</label>
              <textarea className="adm-input" rows={3} value={data.hero?.subtitle || ''} onChange={e => updateNested('hero', 'subtitle', e.target.value)} />
            </div>
          </div>
        )

      case 'trust_bar':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Trust Bar Items</h3>
            {(data.trust_bar || []).map((item, i) => (
              <div key={i} className="adm-s-repeater-item">
                <div className="adm-s-row-3">
                  <div className="adm-s-field"><label>Icon</label><input className="adm-input" value={item.icon} onChange={e => updateArrayItem('trust_bar', i, 'icon', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Label</label><input className="adm-input" value={item.label} onChange={e => updateArrayItem('trust_bar', i, 'label', e.target.value)} /></div>
                  <div className="adm-s-field"><label>CSS Class</label>
                    <select className="adm-input" value={item.iconClass} onChange={e => updateArrayItem('trust_bar', i, 'iconClass', e.target.value)}>
                      <option value="trust-icon-blue">Blue</option><option value="trust-icon-green">Green</option><option value="trust-icon-orange">Orange</option>
                    </select>
                  </div>
                </div>
                <div className="adm-s-item-actions">
                  {i > 0 && <button className="btn btn-ghost btn-sm" onClick={() => moveArrayItem('trust_bar', i, i - 1)} type="button">↑</button>}
                  {i < (data.trust_bar?.length || 0) - 1 && <button className="btn btn-ghost btn-sm" onClick={() => moveArrayItem('trust_bar', i, i + 1)} type="button">↓</button>}
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeArrayItem('trust_bar', i)} type="button">Remove</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => addArrayItem('trust_bar', { icon: '⭐', label: 'New Item', iconClass: 'trust-icon-blue' })} type="button">+ Add Item</button>
          </div>
        )

      case 'cities':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Cities ({(data.cities || []).length})</h3>
            {(data.cities || []).map((city, i) => (
              <div key={i} className="adm-s-repeater-item">
                <div className="adm-s-row-2">
                  <div className="adm-s-field"><label>Name</label><input className="adm-input" value={city.name} onChange={e => updateArrayItem('cities', i, 'name', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Slug</label><input className="adm-input" value={city.slug} onChange={e => updateArrayItem('cities', i, 'slug', e.target.value)} /></div>
                </div>
                <div className="adm-s-row-2">
                  <div className="adm-s-field"><label>Car Count</label><input className="adm-input" value={city.count} onChange={e => updateArrayItem('cities', i, 'count', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Image URL</label><input className="adm-input" value={city.image} onChange={e => updateArrayItem('cities', i, 'image', e.target.value)} /></div>
                </div>
                {city.image && <img src={city.image} alt={city.name} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 4 }} />}
                <div className="adm-s-item-actions">
                  {i > 0 && <button className="btn btn-ghost btn-sm" onClick={() => moveArrayItem('cities', i, i - 1)} type="button">↑</button>}
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeArrayItem('cities', i)} type="button">Remove</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => addArrayItem('cities', { name: '', slug: '', count: '0+', image: '' })} type="button">+ Add City</button>
          </div>
        )

      case 'reviews':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Customer Reviews</h3>
            {(data.reviews || []).map((review, i) => (
              <div key={i} className="adm-s-repeater-item">
                <div className="adm-s-row-3">
                  <div className="adm-s-field"><label>Name</label><input className="adm-input" value={review.name} onChange={e => updateArrayItem('reviews', i, 'name', e.target.value)} /></div>
                  <div className="adm-s-field"><label>City</label><input className="adm-input" value={review.city} onChange={e => updateArrayItem('reviews', i, 'city', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Car</label><input className="adm-input" value={review.car} onChange={e => updateArrayItem('reviews', i, 'car', e.target.value)} /></div>
                </div>
                <div className="adm-s-field"><label>Review Text</label><textarea className="adm-input" rows={2} value={review.text} onChange={e => updateArrayItem('reviews', i, 'text', e.target.value)} /></div>
                <div className="adm-s-field"><label>Rating (1-5)</label><input className="adm-input" type="number" min={1} max={5} value={review.rating} onChange={e => updateArrayItem('reviews', i, 'rating', Number(e.target.value))} /></div>
                <div className="adm-s-item-actions">
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeArrayItem('reviews', i)} type="button">Remove</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => addArrayItem('reviews', { name: '', city: '', car: '', text: '', rating: 5 })} type="button">+ Add Review</button>
          </div>
        )

      case 'body_types':
      case 'fuel_types':
        const arrKey = activeTab
        const items = (data[arrKey] || []) as Array<{ name: string; icon: string; count: string }>
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">{activeTab === 'body_types' ? 'Body Types' : 'Fuel Types'}</h3>
            {items.map((item, i) => (
              <div key={i} className="adm-s-repeater-item">
                <div className="adm-s-row-3">
                  <div className="adm-s-field"><label>Name</label><input className="adm-input" value={item.name} onChange={e => updateArrayItem(arrKey, i, 'name', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Icon (emoji)</label><input className="adm-input" value={item.icon} onChange={e => updateArrayItem(arrKey, i, 'icon', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Count</label><input className="adm-input" value={item.count} onChange={e => updateArrayItem(arrKey, i, 'count', e.target.value)} /></div>
                </div>
                <div className="adm-s-item-actions">
                  {i > 0 && <button className="btn btn-ghost btn-sm" onClick={() => moveArrayItem(arrKey, i, i - 1)} type="button">↑</button>}
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeArrayItem(arrKey, i)} type="button">Remove</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => addArrayItem(arrKey, { name: '', icon: '🚗', count: '0+' })} type="button">+ Add</button>
          </div>
        )

      case 'budget_brackets':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Budget Brackets</h3>
            {(data.budget_brackets || []).map((b, i) => (
              <div key={i} className="adm-s-repeater-item">
                <div className="adm-s-row-3">
                  <div className="adm-s-field"><label>Label</label><input className="adm-input" value={b.label} onChange={e => updateArrayItem('budget_brackets', i, 'label', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Min ₹</label><input className="adm-input" type="number" value={b.min ?? ''} onChange={e => updateArrayItem('budget_brackets', i, 'min', e.target.value ? Number(e.target.value) : undefined)} /></div>
                  <div className="adm-s-field"><label>Max ₹</label><input className="adm-input" type="number" value={b.max ?? ''} onChange={e => updateArrayItem('budget_brackets', i, 'max', e.target.value ? Number(e.target.value) : undefined)} /></div>
                </div>
                <div className="adm-s-item-actions">
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeArrayItem('budget_brackets', i)} type="button">Remove</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => addArrayItem('budget_brackets', { label: '', min: 0, max: 0 })} type="button">+ Add Bracket</button>
          </div>
        )

      case 'nav_items':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Navigation Links</h3>
            {(data.nav_items || []).map((item, i) => (
              <div key={i} className="adm-s-repeater-item">
                <div className="adm-s-row-2">
                  <div className="adm-s-field"><label>Label</label><input className="adm-input" value={item.label} onChange={e => updateArrayItem('nav_items', i, 'label', e.target.value)} /></div>
                  <div className="adm-s-field"><label>Path</label><input className="adm-input" value={item.path} onChange={e => updateArrayItem('nav_items', i, 'path', e.target.value)} /></div>
                </div>
                <div className="adm-s-item-actions">
                  {i > 0 && <button className="btn btn-ghost btn-sm" onClick={() => moveArrayItem('nav_items', i, i - 1)} type="button">↑</button>}
                  {i < (data.nav_items?.length || 0) - 1 && <button className="btn btn-ghost btn-sm" onClick={() => moveArrayItem('nav_items', i, i + 1)} type="button">↓</button>}
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeArrayItem('nav_items', i)} type="button">Remove</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => addArrayItem('nav_items', { label: 'New Link', path: '/' })} type="button">+ Add Link</button>
          </div>
        )

      case 'footer': {
        const footer = data.footer || { brand_text: '', columns: [] }
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Footer</h3>
            <div className="adm-s-field">
              <label>Brand Description</label>
              <textarea className="adm-input" rows={2} value={footer.brand_text} onChange={e => updateField('footer', { ...footer, brand_text: e.target.value })} />
            </div>
            {footer.columns.map((col, ci) => (
              <div key={ci} className="adm-s-repeater-item">
                <div className="adm-s-field"><label>Column Title</label><input className="adm-input" value={col.title} onChange={e => {
                  const cols = [...footer.columns]; cols[ci] = { ...cols[ci], title: e.target.value }; updateField('footer', { ...footer, columns: cols })
                }} /></div>
                {col.links.map((link, li) => (
                  <div key={li} className="adm-s-row-2" style={{ marginBottom: 4 }}>
                    <input className="adm-input" placeholder="Label" value={link.label} onChange={e => {
                      const cols = [...footer.columns]; const links = [...cols[ci].links]; links[li] = { ...links[li], label: e.target.value }; cols[ci] = { ...cols[ci], links }; updateField('footer', { ...footer, columns: cols })
                    }} />
                    <input className="adm-input" placeholder="URL" value={link.to} onChange={e => {
                      const cols = [...footer.columns]; const links = [...cols[ci].links]; links[li] = { ...links[li], to: e.target.value }; cols[ci] = { ...cols[ci], links }; updateField('footer', { ...footer, columns: cols })
                    }} />
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const cols = [...footer.columns]; cols[ci] = { ...cols[ci], links: [...cols[ci].links, { label: '', to: '/' }] }; updateField('footer', { ...footer, columns: cols })
                }} type="button">+ Add Link</button>
              </div>
            ))}
          </div>
        )
      }

      case 'sell_cta':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Sell Your Car CTA</h3>
            <div className="adm-s-field"><label>Title</label><input className="adm-input" value={data.sell_cta?.title || ''} onChange={e => updateNested('sell_cta', 'title', e.target.value)} /></div>
            <div className="adm-s-field"><label>Description</label><textarea className="adm-input" rows={2} value={data.sell_cta?.description || ''} onChange={e => updateNested('sell_cta', 'description', e.target.value)} /></div>
            <div className="adm-s-field"><label>Button Text</label><input className="adm-input" value={data.sell_cta?.button_text || ''} onChange={e => updateNested('sell_cta', 'button_text', e.target.value)} /></div>
          </div>
        )

      case 'splus_banner':
      case 'spn_banner': {
        const bannerKey = activeTab
        const banner = (data[bannerKey] || { badge: '', title: '', description: '', features: [] }) as SiteConfig['splus_banner']
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">{bannerKey === 'splus_banner' ? 'S-Plus' : 'S-Plus New'} Banner</h3>
            <div className="adm-s-field"><label>Badge Text</label><input className="adm-input" value={banner.badge} onChange={e => updateNested(bannerKey, 'badge', e.target.value)} /></div>
            <div className="adm-s-field"><label>Title</label><input className="adm-input" value={banner.title} onChange={e => updateNested(bannerKey, 'title', e.target.value)} /></div>
            <div className="adm-s-field"><label>Description</label><textarea className="adm-input" rows={2} value={banner.description} onChange={e => updateNested(bannerKey, 'description', e.target.value)} /></div>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: '0.75rem 0 0.35rem' }}>Features</p>
            {banner.features.map((f, i) => (
              <div key={i} className="adm-s-row-2" style={{ marginBottom: 4 }}>
                <input className="adm-input" placeholder="Icon" value={f.icon} onChange={e => {
                  const feats = [...banner.features]; feats[i] = { ...feats[i], icon: e.target.value }; updateNested(bannerKey, 'features', feats)
                }} />
                <input className="adm-input" placeholder="Label" value={f.label} onChange={e => {
                  const feats = [...banner.features]; feats[i] = { ...feats[i], label: e.target.value }; updateNested(bannerKey, 'features', feats)
                }} />
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => updateNested(bannerKey, 'features', [...banner.features, { icon: '★', label: '' }])} type="button">+ Add Feature</button>
          </div>
        )
      }

      case 'contact_info':
        return (
          <div className="adm-settings-panel">
            <h3 className="adm-settings-panel-title">Contact Information</h3>
            <div className="adm-s-field"><label>Phone</label><input className="adm-input" value={data.contact_info?.phone || ''} onChange={e => updateNested('contact_info', 'phone', e.target.value)} /></div>
            <div className="adm-s-field"><label>WhatsApp</label><input className="adm-input" value={data.contact_info?.whatsapp || ''} onChange={e => updateNested('contact_info', 'whatsapp', e.target.value)} /></div>
            <div className="adm-s-field"><label>Email</label><input className="adm-input" value={data.contact_info?.email || ''} onChange={e => updateNested('contact_info', 'email', e.target.value)} /></div>
            <div className="adm-s-field"><label>Address</label><textarea className="adm-input" rows={2} value={data.contact_info?.address || ''} onChange={e => updateNested('contact_info', 'address', e.target.value)} /></div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <main className="adm">
      <div className="adm-header">
        <div className="container">
          <div className="adm-header-row">
            <div>
              <Link to="/admin" className="adm-back-link">&larr; Back to Inventory</Link>
              <h1 className="adm-title">Site Settings</h1>
              <p className="adm-subtitle">Control every aspect of your website content</p>
            </div>
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container">
          {toast && <div className={`adm-toast ${toastType === 'error' ? 'adm-toast-error' : ''}`} style={{ marginBottom: '1rem' }}>{toast}</div>}

          <div className="adm-settings-layout">
            <aside className="adm-settings-sidebar">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`adm-settings-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </aside>

            <div className="adm-settings-main">
              {renderTab()}
              <div className="adm-settings-save-bar">
                <button className="btn btn-primary" onClick={() => saveKey(activeTab)} disabled={saving} type="button">
                  {saving ? 'Saving...' : `Save ${tabs.find(t => t.key === activeTab)?.label}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
