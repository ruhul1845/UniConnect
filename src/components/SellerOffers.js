import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

export default function SellerOffers() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState(null);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    const { data: productData } = await supabase
      .from('products')
      .select('id, title, price, seller_id')
      .eq('id', productId)
      .maybeSingle();

    if (!productData || productData.seller_id !== user.id) {
      alert('Product not found or access denied.');
      navigate('/my-listings');
      return;
    }
    setProduct(productData);

    const { data: offersData, error } = await supabase
      .from('offers')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) { alert('Error loading offers: ' + error.message); setLoading(false); return; }

    const buyerIds = [...new Set((offersData || []).map(o => o.buyer_id))];
    let buyerMap = {};
    if (buyerIds.length > 0) {
      const { data: buyerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, university_email, avatar_url')
        .in('id', buyerIds);
      (buyerProfiles || []).forEach(p => { buyerMap[p.id] = p; });
    }

    setOffers((offersData || []).map(o => ({ ...o, buyer: buyerMap[o.buyer_id] || null })));
    setLoading(false);
  }, [productId, navigate]);

  useEffect(() => { init(); }, [init]);

  const respondToOffer = async (offerId, newStatus) => {
    setRespondingTo(offerId);
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status: newStatus })
        .eq('id', offerId);
      if (error) throw error;

      if (newStatus === 'accepted') {
        await supabase
          .from('offers')
          .update({ status: 'rejected' })
          .eq('product_id', productId)
          .eq('status', 'pending')
          .neq('id', offerId);

        // Auto-reserve the product once an offer is accepted (only if still available).
        await supabase
          .from('products')
          .update({ status: 'reserved' })
          .eq('id', productId)
          .eq('status', 'available');
      }

      setOffers(prev => prev.map(o => {
        if (o.id === offerId) return { ...o, status: newStatus };
        if (newStatus === 'accepted' && o.status === 'pending') return { ...o, status: 'rejected' };
        return o;
      }));
    } catch (error) {
      alert('Error responding to offer: ' + error.message);
    } finally {
      setRespondingTo(null);
    }
  };

  const statusStyle = {
    pending:   { background: '#f6b800', color: '#18004d' },
    accepted:  { background: '#22c55e', color: 'white' },
    rejected:  { background: '#ef4444', color: 'white' },
    withdrawn: { background: '#9ca3af', color: 'white' },
  };

  const pendingCount = offers.filter(o => o.status === 'pending').length;

  if (loading) return <div className="uc-content"><div className="uc-card uc-card-pad">Loading offers...</div></div>;

  return (
    <>
      <PageHero
        eyebrow="Seller Dashboard"
        title={`Offers — ${product?.title || 'Product'}`}
        subtitle={`${pendingCount} pending offer${pendingCount !== 1 ? 's' : ''} • Asking price: ৳${Number(product?.price || 0).toLocaleString()}`}
        actions={
          <>
            <button className="uc-btn uc-btn-outline" onClick={() => navigate('/my-listings')}>← My Listings</button>
            <button className="uc-btn uc-btn-outline" onClick={() => navigate(`/product/${productId}`)}>View Listing</button>
          </>
        }
      />
      <main className="uc-content">
        {offers.length === 0 ? (
          <div className="uc-card uc-card-pad" style={{ textAlign: 'center' }}>
            <h3>No offers yet</h3>
            <p>When buyers make offers on this listing, they will appear here.</p>
            <button className="uc-btn uc-btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/my-listings')}>Back to My Listings</button>
          </div>
        ) : (
          <section className="uc-grid-3">
            {offers.map(offer => (
              <article key={offer.id} className="uc-card uc-card-pad">
                <div className="uc-seller-row" style={{ marginBottom: 12 }}>
                  {offer.buyer?.avatar_url
                    ? <img src={offer.buyer.avatar_url} alt={offer.buyer.full_name || 'Buyer'} className="uc-avatar" />
                    : <div className="uc-avatar-fallback">{(offer.buyer?.full_name || 'B').charAt(0).toUpperCase()}</div>
                  }
                  <div>
                    <strong>{offer.buyer?.full_name || 'Buyer'}</strong>
                    <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{offer.buyer?.university_email || ''}</p>
                  </div>
                </div>

                <p className="uc-price" style={{ marginBottom: 8 }}>৳{Number(offer.offer_price).toLocaleString()}</p>
                <span className="uc-badge" style={statusStyle[offer.status] || {}}>
                  {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                </span>

                {offer.buyer_message && (
                  <p style={{ marginTop: 12, fontStyle: 'italic', color: '#444', fontSize: 14 }}>
                    "{offer.buyer_message}"
                  </p>
                )}

                <p style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                  {new Date(offer.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                {offer.status === 'pending' && (
                  <div className="uc-card-actions" style={{ marginTop: 12 }}>
                    <button
                      className="uc-btn uc-btn-gold"
                      disabled={respondingTo === offer.id}
                      onClick={() => respondToOffer(offer.id, 'accepted')}
                    >
                      {respondingTo === offer.id ? '...' : 'Accept'}
                    </button>
                    <button
                      className="uc-btn uc-btn-danger"
                      disabled={respondingTo === offer.id}
                      onClick={() => respondToOffer(offer.id, 'rejected')}
                    >
                      {respondingTo === offer.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
