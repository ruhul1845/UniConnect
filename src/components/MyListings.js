import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

export default function MyListings() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [categories, setCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const navigate = useNavigate();

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return null;
    }
    setCurrentUser(user);
    return user;
  }, [navigate]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
  }, []);

  const fetchUserProducts = useCallback(async () => {
    try {
      setLoading(true);
      const user = currentUser || await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(name), images:product_images(image_url)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      alert('Error fetching your listings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, getCurrentUser]);

  useEffect(() => {
    getCurrentUser();
    fetchCategories();
  }, [getCurrentUser, fetchCategories]);

  useEffect(() => {
    if (currentUser) fetchUserProducts();
  }, [currentUser, fetchUserProducts]);

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await supabase.from('product_images').delete().eq('product_id', productId);
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      alert('Listing deleted successfully!');
    } catch (error) {
      alert('Error deleting listing: ' + error.message);
    }
  };

  const handleEditStart = (product) => {
    setEditingId(product.id);
    setEditForm({ title: product.title || '', description: product.description || '', price: product.price || '', category_id: product.category_id || '', condition: product.condition || 'Good', location: product.location || '' });
  };

  const handleEditSave = async (productId) => {
    try {
      const { error } = await supabase.from('products').update({ title: editForm.title, description: editForm.description, price: Number(editForm.price), category_id: editForm.category_id, condition: editForm.condition, location: editForm.location }).eq('id', productId);
      if (error) throw error;
      setEditingId(null);
      setEditForm({});
      await fetchUserProducts();
      alert('Listing updated successfully!');
    } catch (error) {
      alert('Error updating listing: ' + error.message);
    }
  };

  const updateProductStatus = async (productId, newStatus) => {
    setUpdatingStatus(productId);
    try {
      const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', productId);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p)));
    } catch (error) {
      alert('Error updating status: ' + error.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openProductConversations = async (productId) => {
    if (!currentUser) return navigate('/login');
    try {
      const { data: convs, error } = await supabase.from('conversations').select('id').eq('product_id', productId).eq('seller_id', currentUser.id);
      if (error) throw error;
      if (!convs?.length) return alert('No conversations yet for this product.');
      navigate(convs.length === 1 ? `/chat/${convs[0].id}` : '/conversations');
    } catch (error) {
      alert('Error opening messages: ' + error.message);
    }
  };

  return (
    <>
      <PageHero eyebrow="Seller workspace" title="My Listings" subtitle="Manage your marketplace items, update price/status, edit details, and open buyer conversations." actions={<button className="uc-btn uc-btn-gold" onClick={() => navigate('/sell')}>+ Sell New Item</button>} />
      <main className="uc-content">
        {loading ? <div className="uc-card uc-card-pad">Loading your listings...</div> : products.length === 0 ? (
          <div className="uc-card uc-card-pad" style={{ textAlign: 'center' }}><h2>No listings yet</h2><p>Create your first marketplace listing for verified CSE students.</p><button className="uc-btn uc-btn-gold" onClick={() => navigate('/sell')}>Create Listing</button></div>
        ) : (
          <section className="uc-grid-3">
            {products.map((product) => (
              <article key={product.id} className="uc-card uc-listing-card">
                <img className="uc-product-img" src={product.images?.[0]?.image_url || 'https://via.placeholder.com/600x400?text=UniConnect+Item'} alt={product.title || 'Product'} />
                <div className="uc-product-info">
                  {editingId === product.id ? (
                    <div className="uc-edit-stack">
                      <input className="uc-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
                      <textarea className="uc-textarea" rows="3" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" />
                      <input className="uc-input" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price" />
                      <select className="uc-select" value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      <select className="uc-select" value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select>
                      <input className="uc-input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Pickup location" />
                      <div className="uc-card-actions"><button className="uc-btn uc-btn-gold" onClick={() => handleEditSave(product.id)}>Save</button><button className="uc-btn uc-btn-outline" onClick={() => setEditingId(null)}>Cancel</button></div>
                    </div>
                  ) : (
                    <>
                      <span className="uc-badge uc-badge-blue">{product.category?.name || 'Marketplace'}</span>
                      <h3 style={{ marginTop: 12 }}>{product.title}</h3>
                      <p className="uc-price">৳{Number(product.price || 0).toLocaleString()}</p>
                      <p><strong>Condition:</strong> {product.condition || 'Good'}</p>
                      <p><strong>Pickup:</strong> {product.location || 'Not specified'}</p>
                      <p>{product.description}</p>
                      <span className="uc-badge" style={{ marginTop: 12 }}>Status: {product.status || 'available'}</span>
                      <div className="uc-card-actions">
                        <button className="uc-btn uc-btn-blue" onClick={() => navigate(`/product/${product.id}`)}>View</button>
                        <button className="uc-btn uc-btn-outline" onClick={() => handleEditStart(product)}>Edit</button>
                        <button className="uc-btn uc-btn-outline" onClick={() => openProductConversations(product.id)}>Messages</button>
                      </div>
                      <div className="uc-card-actions">
                        {['available', 'reserved', 'sold'].map((s) => <button key={s} className={product.status === s ? 'uc-btn uc-btn-gold' : 'uc-btn uc-btn-outline'} disabled={updatingStatus === product.id} onClick={() => updateProductStatus(product.id, s)}>{s}</button>)}
                        <button className="uc-btn uc-btn-danger" onClick={() => handleDelete(product.id)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
