import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

export default function SavedItems() {
  const navigate = useNavigate();
  const [savedProducts, setSavedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const fetchSavedItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data, error } = await supabase
        .from('saved_items')
        .select('id, product_id, products(id, title, price, condition, status, description, seller_id, category:categories(name), images:product_images(image_url))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedProducts((data || []).filter(row => row.products));
    } catch (error) {
      alert('Error loading saved items: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchSavedItems(); }, [fetchSavedItems]);

  const unsaveItem = async (savedId, productId) => {
    setRemovingId(productId);
    try {
      const { error } = await supabase.from('saved_items').delete().eq('id', savedId);
      if (error) throw error;
      setSavedProducts(prev => prev.filter(r => r.id !== savedId));
    } catch (error) {
      alert('Error removing saved item: ' + error.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Your wishlist"
        title="Saved Items"
        subtitle="Items you saved while browsing the marketplace."
        actions={<button className="uc-btn uc-btn-outline" onClick={() => navigate('/marketplace')}>← Marketplace</button>}
      />
      <main className="uc-content">
        {loading ? (
          <div className="uc-card uc-card-pad">Loading saved items...</div>
        ) : savedProducts.length === 0 ? (
          <div className="uc-card uc-card-pad" style={{ textAlign: 'center' }}>
            <h2>No saved items yet</h2>
            <p>Browse the marketplace and tap the heart on any item to save it here.</p>
            <button className="uc-btn uc-btn-gold" style={{ marginTop: 16 }} onClick={() => navigate('/marketplace')}>Browse Marketplace</button>
          </div>
        ) : (
          <section className="uc-grid-4">
            {savedProducts.map(({ id: savedId, products: p }) => {
              const isSold = p.status === 'sold';
              return (
                <article key={savedId} className="uc-card" style={{ position: 'relative', cursor: isSold ? 'default' : 'pointer' }} onClick={() => !isSold && navigate(`/product/${p.id}`)}>
                  <div style={{ position: 'relative' }}>
                    <img className="uc-product-img" src={p.images?.[0]?.image_url || 'https://via.placeholder.com/400x260?text=UniConnect'} alt={p.title || 'Item'} />
                    {isSold && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px 12px 0 0' }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>SOLD</span>
                      </div>
                    )}
                  </div>
                  <div className="uc-product-info">
                    <span className="uc-badge uc-badge-blue">{p.category?.name || 'Marketplace'}</span>
                    <h3 style={{ marginTop: 12 }}>{p.title}</h3>
                    <p className="uc-price">৳{Number(p.price || 0).toLocaleString()}</p>
                    <p><strong>Condition:</strong> {p.condition || 'Good'}</p>
                    <p>{p.description?.substring(0, 80)}{p.description?.length > 80 ? '...' : ''}</p>
                    <div className="uc-card-actions">
                      {!isSold && <button className="uc-btn uc-btn-blue" onClick={(e) => { e.stopPropagation(); navigate(`/product/${p.id}`); }}>View</button>}
                      <button
                        className="uc-btn uc-btn-danger"
                        disabled={removingId === p.id}
                        onClick={(e) => { e.stopPropagation(); unsaveItem(savedId, p.id); }}
                      >
                        {removingId === p.id ? '...' : '♥ Unsave'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </>
  );
}
