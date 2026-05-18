import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [existingOffer, setExistingOffer] = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user || null);
    return user || null;
  }, []);

  const fetchProductDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, category:categories(name), images:product_images(image_url)')
        .eq('id', id)
        .single();
      if (productError) throw productError;

      setProduct(productData);
      setImages(productData?.images || []);
      setSelectedImageIndex(0);

      if (productData?.seller_id) {
        const { data: sellerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', productData.seller_id)
          .maybeSingle();
        setSeller(sellerData || { id: productData.seller_id, full_name: 'Seller' });
      }
    } catch (error) {
      alert('Error loading product: ' + error.message);
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchSavedStatus = useCallback(async (userId) => {
    if (!userId || !id) return;
    const { data } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', id)
      .maybeSingle();
    setIsSaved(!!data);
  }, [id]);

  const fetchExistingOffer = useCallback(async (userId) => {
    if (!userId || !id) return;
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('product_id', id)
      .eq('buyer_id', userId)
      .neq('status', 'withdrawn')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingOffer(data || null);
  }, [id]);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      await fetchProductDetails();
      if (user) {
        fetchSavedStatus(user.id);
        fetchExistingOffer(user.id);
      }
    };
    init();
  }, [getCurrentUser, fetchProductDetails, fetchSavedStatus, fetchExistingOffer]);

  const isSellerView = useMemo(() => Boolean(currentUser?.id && product?.seller_id && currentUser.id === product.seller_id), [currentUser, product]);
  const mainImage = images[selectedImageIndex]?.image_url || 'https://via.placeholder.com/900x650?text=UniConnect+Item';

  const updateStatus = async (status) => {
    if (!product?.id) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('products').update({ status }).eq('id', product.id);
      if (error) throw error;
      setProduct((prev) => ({ ...prev, status }));
    } catch (error) {
      alert('Error updating status: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const toggleSave = async () => {
    if (!currentUser) { alert('Please login to save items.'); navigate('/login'); return; }
    setSavingItem(true);
    try {
      if (isSaved) {
        await supabase.from('saved_items').delete().eq('user_id', currentUser.id).eq('product_id', id);
        setIsSaved(false);
      } else {
        await supabase.from('saved_items').insert([{ user_id: currentUser.id, product_id: id }]);
        setIsSaved(true);
      }
    } catch (error) {
      alert('Error saving item: ' + error.message);
    } finally {
      setSavingItem(false);
    }
  };

  const startConversation = async () => {
    if (!currentUser?.id) {
      alert('Please login to message the seller.');
      navigate('/login');
      return;
    }
    if (!product?.id || !product?.seller_id) return alert('Product or seller information is missing.');
    if (currentUser.id === product.seller_id) return alert('You cannot message yourself.');
    if (product.status === 'sold') return alert('This item is already sold.');

    setStartingChat(true);
    try {
      const { data: existingChat, error: existingError } = await supabase
        .from('conversations')
        .select('id')
        .eq('product_id', product.id)
        .eq('buyer_id', currentUser.id)
        .eq('seller_id', product.seller_id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingChat?.id) return navigate(`/chat/${existingChat.id}`);

      const { data: newChat, error: createError } = await supabase
        .from('conversations')
        .insert([{ product_id: product.id, buyer_id: currentUser.id, seller_id: product.seller_id }])
        .select('id')
        .single();
      if (createError) throw createError;
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      alert('Error starting conversation: ' + error.message);
    } finally {
      setStartingChat(false);
    }
  };

  const submitOffer = async () => {
    if (!currentUser?.id) { alert('Please login to make an offer.'); navigate('/login'); return; }
    const price = Number(offerPrice);
    if (!price || price <= 0) return alert('Please enter a valid offer price.');
    setSubmittingOffer(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert([{
          product_id: id,
          buyer_id: currentUser.id,
          seller_id: product.seller_id,
          offer_price: price,
          buyer_message: offerMessage.trim() || null,
        }])
        .select()
        .single();
      if (error) throw error;
      setExistingOffer(data);
      setShowOfferForm(false);
      setOfferPrice('');
      setOfferMessage('');

      // Find or create a conversation so the seller is notified via chat
      let conversationId;
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('product_id', id)
        .eq('buyer_id', currentUser.id)
        .eq('seller_id', product.seller_id)
        .maybeSingle();

      if (existingConv?.id) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert([{ product_id: id, buyer_id: currentUser.id, seller_id: product.seller_id }])
          .select('id')
          .single();
        if (convError) throw convError;
        conversationId = newConv.id;
      }

      const msgText = offerMessage.trim()
        ? `Offer: ৳${Number(price).toLocaleString()} — "${offerMessage.trim()}"`
        : `Offer: ৳${Number(price).toLocaleString()}`;
      await supabase.from('messages').insert([{ conversation_id: conversationId, sender_id: currentUser.id, content: msgText }]);
    } catch (error) {
      alert('Error sending offer: ' + error.message);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const withdrawOffer = async () => {
    if (!existingOffer?.id || !window.confirm('Withdraw your offer?')) return;
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status: 'withdrawn' })
        .eq('id', existingOffer.id);
      if (error) throw error;
      setExistingOffer(null);
    } catch (error) {
      alert('Error withdrawing offer: ' + error.message);
    }
  };

  if (loading) return <><div className="uc-content"><div className="uc-card uc-card-pad">Loading product details...</div></div></>;
  if (!product) return <><div className="uc-content"><div className="uc-card uc-card-pad">Product not found.</div></div></>;

  return (
    <>
      <PageHero
        eyebrow="UniConnect Marketplace"
        title={product.title || 'Product Details'}
        subtitle="Buy safely from verified CSE students with built-in chat and campus pickup."
        actions={<><button className="uc-btn uc-btn-outline" onClick={() => navigate('/marketplace')}>← Marketplace</button><button className="uc-btn uc-btn-gold" onClick={() => navigate('/conversations')}>My Messages</button></>}
      />

      <main className="uc-content">
        <section className="uc-product-detail-layout">
          <div className="uc-card uc-card-pad">
            <div className="uc-detail-image-wrap">
              <img src={mainImage} alt={product.title || 'Product'} className="uc-detail-image" />
            </div>
            {images.length > 1 && (
              <div className="uc-thumb-row">
                {images.map((img, index) => (
                  <button key={`${img.image_url}-${index}`} className={index === selectedImageIndex ? 'uc-thumb active' : 'uc-thumb'} onClick={() => setSelectedImageIndex(index)}>
                    <img src={img.image_url} alt={`${product.title || 'Product'} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="uc-card uc-card-pad">
            <div className="uc-card-actions" style={{ marginTop: 0 }}>
              <span className="uc-badge uc-badge-blue">{product.category?.name || 'Marketplace'}</span>
              <span className="uc-badge">Condition: {product.condition || 'Good'}</span>
              <span className="uc-badge">{product.status || 'available'}</span>
            </div>
            <p className="uc-price">৳{Number(product.price || 0).toLocaleString()}</p>

            <div className="uc-section-card">
              <h3>Description</h3>
              <p>{product.description || 'No description provided.'}</p>
            </div>

            <div className="uc-section-card">
              <h3>Seller Information</h3>
              <div className="uc-seller-row">
                {seller?.avatar_url ? <img src={seller.avatar_url} alt={seller.full_name || 'Seller'} className="uc-avatar" /> : <div className="uc-avatar-fallback">{(seller?.full_name || 'S').charAt(0).toUpperCase()}</div>}
                <div>
                  <strong>{seller?.full_name || 'Seller'}</strong>
                  <p>Verified CSE marketplace seller</p>
                </div>
              </div>
              <p><strong>Pickup:</strong> {product.location || seller?.dorm_name || 'Not specified'}</p>
              <p><strong>Email:</strong> {seller?.university_email || seller?.email || 'Not specified'}</p>
              <p><strong>Phone:</strong> {seller?.phone_number || 'Not provided'}</p>

              {!isSellerView ? (
                <div className="uc-card-actions">
                  <button className="uc-btn uc-btn-gold" onClick={startConversation} disabled={startingChat || product.status === 'sold'}>{startingChat ? 'Starting...' : 'Chat with Seller'}</button>
                  {(seller?.university_email || seller?.email) && <a className="uc-btn uc-btn-outline" href={`mailto:${seller.university_email || seller.email}?subject=Interested in ${product.title}`}>Email</a>}
                  <button
                    className="uc-btn uc-btn-outline"
                    onClick={toggleSave}
                    disabled={savingItem}
                    title={isSaved ? 'Remove from saved items' : 'Save to wishlist'}
                    style={{ minWidth: 44 }}
                  >
                    {savingItem ? '...' : isSaved ? '♥ Saved' : '♡ Save'}
                  </button>
                </div>
              ) : (
                <div className="uc-card-actions">
                  <button className="uc-btn uc-btn-outline" disabled={updating} onClick={() => updateStatus('reserved')}>Mark Reserved</button>
                  <button className="uc-btn uc-btn-gold" disabled={updating} onClick={() => updateStatus('sold')}>Mark Sold</button>
                </div>
              )}
            </div>

            {!isSellerView && product.status !== 'sold' && (
              <div className="uc-section-card">
                <h3>Price Negotiation</h3>
                {existingOffer ? (
                  <>
                    <p style={{ marginBottom: 8 }}>
                      Your offer: <strong>৳{Number(existingOffer.offer_price).toLocaleString()}</strong>
                      {existingOffer.buyer_message && (
                        <em style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#666' }}>"{existingOffer.buyer_message}"</em>
                      )}
                    </p>
                    {existingOffer.status === 'pending' && (
                      <>
                        <span className="uc-badge" style={{ background: '#f6b800', color: '#18004d' }}>Pending seller response</span>
                        <div className="uc-card-actions" style={{ marginTop: 12 }}>
                          <button className="uc-btn uc-btn-danger" onClick={withdrawOffer}>Withdraw Offer</button>
                        </div>
                      </>
                    )}
                    {existingOffer.status === 'accepted' && (
                      <>
                        <span className="uc-badge" style={{ background: '#22c55e', color: 'white' }}>Offer Accepted!</span>
                        <p style={{ marginTop: 8, fontSize: 14 }}>Coordinate pickup with the seller via chat or email above.</p>
                      </>
                    )}
                    {existingOffer.status === 'rejected' && (
                      <>
                        <span className="uc-badge" style={{ background: '#ef4444', color: 'white' }}>Offer Rejected</span>
                        <div className="uc-card-actions" style={{ marginTop: 12 }}>
                          <button className="uc-btn uc-btn-outline" onClick={() => setExistingOffer(null)}>Make New Offer</button>
                        </div>
                      </>
                    )}
                  </>
                ) : showOfferForm ? (
                  <div className="uc-edit-stack">
                    <label style={{ fontWeight: 600, marginBottom: 4 }}>Your Offer Price (৳)</label>
                    <input
                      className="uc-input"
                      type="number"
                      min="1"
                      value={offerPrice}
                      onChange={e => setOfferPrice(e.target.value)}
                      placeholder={`Asking ৳${Number(product.price || 0).toLocaleString()}`}
                    />
                    <textarea
                      className="uc-textarea"
                      rows="2"
                      value={offerMessage}
                      onChange={e => setOfferMessage(e.target.value)}
                      placeholder="Optional message to seller..."
                    />
                    <div className="uc-card-actions">
                      <button className="uc-btn uc-btn-gold" onClick={submitOffer} disabled={submittingOffer}>
                        {submittingOffer ? 'Sending...' : 'Send Offer'}
                      </button>
                      <button className="uc-btn uc-btn-outline" onClick={() => setShowOfferForm(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="uc-card-actions">
                    <button className="uc-btn uc-btn-blue" onClick={() => setShowOfferForm(true)}>Make an Offer</button>
                  </div>
                )}
              </div>
            )}

            <div className="uc-alert info">
              <strong>Meet-up Safety Tips</strong><br />
              Meet in public campus areas, inspect item before payment, and confirm pickup time through UniConnect chat.
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
