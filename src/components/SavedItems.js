import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

export default function SavedItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const navigate = useNavigate();

  const fetchSavedItems = useCallback(async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select(`
          id,
          product_id,
          created_at,
          product:products(
            id, title, price, condition, description, status,
            category:categories(name),
            images:product_images(image_url)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data?.filter((r) => r.product) || []);
    } catch (err) {
      alert('Error loading saved items: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setCurrentUser(user);
      fetchSavedItems(user.id);
    };
    init();
  }, [navigate, fetchSavedItems]);

  const removeFromSaved = async (e, savedItemId, productId) => {
    e.stopPropagation();
    setRemovingId(productId);
    try {
      const { error } = await supabase.from('saved_items').delete().eq('id', savedItemId);
      if (error) throw error;
      setItems((prev) => prev.filter((r) => r.id !== savedItemId));
    } catch (err) {
      alert('Error removing item: ' + err.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Your wishlist"
        title="Saved Items"
        subtitle="Items you've saved from the marketplace. Check back to see if they're still available."
        actions={<><button className="uc-btn uc-btn-outline" onClick={() => navigate('/marketplace')}>← Marketplace</button></>}
      />
      <main className="uc-content">
        {loading ? (
          <div className="uc-card uc-card-pad">Loading saved items...</div>
        ) : items.length === 0 ? (
          <div className="uc-card uc-card-pad" style={{ textAlign: 'center' }}>
            <h2>No saved items yet</h2>
            <p>Browse the marketplace and click ♡ on any item to save it here.</p>
            <button className="uc-btn uc-btn-gold" onClick={() => navigate('/marketplace')}>Browse Marketplace</button>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: 16, color: '#555' }}>{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
            <section className="uc-grid-4">
              {items.map((row) => {
                const p = row.product;
                const isSold = p.status === 'sold';
                return (
                  <article
                    key={row.id}
                    className="uc-card"
                    onClick={() => navigate(`/product/${p.id}`)}
                    style={{ cursor: 'pointer', position: 'relative', opacity: isSold ? 0.65 : 1 }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        className="uc-product-img"
                        src={p.images?.[0]?.image_url || 'https://via.placeholder.com/400x260?text=UniConnect'}
                        alt={p.title || 'Saved item'}
                      />
                      {isSold && (
                        <span style={{
                          position: 'absolute', top: 10, left: 10,
                          background: '#ef4444', color: '#fff',
                          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 6,
                        }}>SOLD</span>
                      )}
                      <button
                        onClick={(e) => removeFromSaved(e, row.id, p.id)}
                        disabled={removingId === p.id}
                        title="Remove from saved"
                        style={{
                          position: 'absolute', top: 10, right: 10,
                          background: '#F6B800',
                          border: 'none', borderRadius: '50%',
                          width: 36, height: 36, cursor: 'pointer',
                          fontSize: 18, lineHeight: '36px', textAlign: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)', padding: 0,
                          color: '#18004d',
                        }}
                      >
                        ♥
                      </button>
                    </div>
                    <div className="uc-product-info">
                      <span className="uc-badge uc-badge-blue">{p.category?.name || 'Marketplace'}</span>
                      <h3 style={{ marginTop: 12 }}>{p.title}</h3>
                      <p className="uc-price">৳{Number(p.price || 0).toLocaleString()}</p>
                      <p><strong>Condition:</strong> {p.condition || 'Good'}</p>
                      <p>{p.description?.substring(0, 88)}{p.description?.length > 88 ? '...' : ''}</p>
                      <div className="uc-card-actions">
                        <button className="uc-btn uc-btn-blue" disabled={isSold}>
                          {isSold ? 'Item Sold' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </main>
    </>
  );
}
