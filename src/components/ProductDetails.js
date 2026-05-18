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

  useEffect(() => {
    getCurrentUser();
    fetchProductDetails();
  }, [getCurrentUser, fetchProductDetails]);

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
                </div>
              ) : (
                <div className="uc-card-actions">
                  <button className="uc-btn uc-btn-outline" disabled={updating} onClick={() => updateStatus('reserved')}>Mark Reserved</button>
                  <button className="uc-btn uc-btn-gold" disabled={updating} onClick={() => updateStatus('sold')}>Mark Sold</button>
                </div>
              )}
            </div>

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
