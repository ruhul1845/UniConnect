import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      // A "purchase" = an offer the seller accepted from this buyer.
      const { data: offers, error } = await supabase
        .from('offers')
        .select('*')
        .eq('buyer_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const productIds = [...new Set((offers || []).map(o => o.product_id))].filter(Boolean);
      const sellerIds = [...new Set((offers || []).map(o => o.seller_id))].filter(Boolean);

      let productMap = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, title, price, condition, status, category:categories(name), images:product_images(image_url)')
          .in('id', productIds);
        productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
      }

      let sellerMap = {};
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, full_name, university_email, avatar_url')
          .in('id', sellerIds);
        sellerMap = Object.fromEntries((sellers || []).map(s => [s.id, s]));
      }

      const sellerName = (s) => s?.full_name || s?.university_email?.split('@')[0] || 'Seller';

      setPurchases((offers || []).map(o => ({
        ...o,
        product: productMap[o.product_id] || null,
        sellerName: sellerName(sellerMap[o.seller_id]),
      })));
    } catch (error) {
      alert('Error loading purchase history: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  return (
    <>
      <PageHero
        eyebrow="Your buys"
        title="Purchase History"
        subtitle="Items you've bought — offers that sellers accepted from you."
        actions={<button className="uc-btn uc-btn-outline" onClick={() => navigate('/marketplace')}>← Marketplace</button>}
      />
      <main className="uc-content">
        {loading ? (
          <div className="uc-card uc-card-pad">Loading purchase history...</div>
        ) : purchases.length === 0 ? (
          <div className="uc-card uc-card-pad" style={{ textAlign: 'center' }}>
            <h2>No purchases yet</h2>
            <p>When a seller accepts one of your offers, it will appear here.</p>
            <button className="uc-btn uc-btn-gold" style={{ marginTop: 16 }} onClick={() => navigate('/marketplace')}>Browse Marketplace</button>
          </div>
        ) : (
          <section className="uc-grid-4">
            {purchases.map((purchase) => {
              const p = purchase.product;
              return (
                <article
                  key={purchase.id}
                  className="uc-card"
                  style={{ position: 'relative', cursor: p ? 'pointer' : 'default' }}
                  onClick={() => p && navigate(`/product/${p.id}`)}
                >
                  <div style={{ position: 'relative' }}>
                    <img className="uc-product-img" src={p?.images?.[0]?.image_url || 'https://via.placeholder.com/400x260?text=UniConnect'} alt={p?.title || 'Purchased item'} />
                    {p?.status === 'sold' && (
                      <div style={{ position: 'absolute', top: 10, left: 10, background: '#22c55e', color: 'white', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>SOLD TO YOU</div>
                    )}
                  </div>
                  <div className="uc-product-info">
                    <span className="uc-badge uc-badge-blue">{p?.category?.name || 'Marketplace'}</span>
                    <h3 style={{ marginTop: 12 }}>{p?.title || 'Item no longer listed'}</h3>
                    <p className="uc-price">৳{Number(purchase.offer_price || 0).toLocaleString()}</p>
                    {p?.price && Number(p.price) !== Number(purchase.offer_price) && (
                      <p style={{ fontSize: 13, color: '#888' }}>Asking price: ৳{Number(p.price).toLocaleString()}</p>
                    )}
                    <p><strong>Seller:</strong> {purchase.sellerName}</p>
                    <p style={{ fontSize: 12, color: '#888' }}>
                      Accepted {new Date(purchase.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {p && (
                      <div className="uc-card-actions">
                        <button className="uc-btn uc-btn-blue" onClick={(e) => { e.stopPropagation(); navigate(`/product/${p.id}`); }}>View Item</button>
                      </div>
                    )}
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
