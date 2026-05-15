import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

const fallbackCategories = [
  { id: 1, name: 'Hardware' },
  { id: 2, name: 'Academic Books' },
  { id: 3, name: 'Software Licenses' },
  { id: 4, name: 'Furniture' },
  { id: 5, name: 'Others' },
];

const MAX_IMAGES = 5;

export default function SellItem() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', price: '', category_id: '', condition: 'Good', location: '' });

  useEffect(() => {
    const getCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      setCategories(error || !data?.length ? fallbackCategories : data);
    };
    getCategories();
  }, []);

  const handleImageChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const combined = [...imageFiles, ...selected].slice(0, MAX_IMAGES);
    setImageFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setImageFiles(newFiles);
  };

  const handleUpload = async (file, productId) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const buckets = ['product-images', 'products', 'marketplace-images'];
    let lastError = null;

    for (const bucket of buckets) {
      const { error } = await supabase.storage.from(bucket).upload(filePath, file);
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
      }
      lastError = error;
    }
    throw lastError || new Error('Image upload failed. Create a Supabase Storage bucket named product-images.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please login first.');

      const { data: product, error: pError } = await supabase
        .from('products')
        .insert([{ seller_id: user.id, title: formData.title, description: formData.description, price: Number(formData.price), category_id: formData.category_id, condition: formData.condition, location: formData.location, status: 'available' }])
        .select()
        .single();
      if (pError) throw pError;

      for (let i = 0; i < imageFiles.length; i++) {
        const publicUrl = await handleUpload(imageFiles[i], product.id);
        const { error: imgError } = await supabase
          .from('product_images')
          .insert([{ product_id: product.id, image_url: publicUrl, is_primary: i === 0 }]);
        if (imgError) throw imgError;
      }

      alert('Item listed successfully!');
      navigate('/my-listings');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHero eyebrow="Student marketplace" title="Sell an Item" subtitle="Create a verified CSE marketplace listing with item images, price, category and pickup location." />
      <main className="uc-content">
        <form onSubmit={handleSubmit} className="uc-card uc-card-pad uc-wide-form">
          <div className="uc-section-head compact">
            <div>
              <p className="uc-eyebrow-dark">New Listing</p>
              <h2>Item Information</h2>
              <p className="uc-section-sub">Keep your listing clear so buyers can understand the item condition before chatting.</p>
            </div>
            <button type="button" className="uc-btn uc-btn-outline" onClick={() => navigate('/marketplace')}>Cancel</button>
          </div>

          <div className="uc-form-grid uc-form-grid-2">
            <div><label className="uc-label">Product Title</label><input className="uc-input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="Study table, Arduino kit, textbook..." /></div>
            <div><label className="uc-label">Price (৳)</label><input className="uc-input" type="number" min="1" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required /></div>
            <div><label className="uc-label">Category</label><select className="uc-select" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} required><option value="">Select Category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="uc-label">Condition</label><select className="uc-select" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })}><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select></div>
            <div><label className="uc-label">Pickup Location</label><input className="uc-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Hall, campus gate, department lobby" /></div>
            <div>
              <label className="uc-label">
                Upload Images
                <span style={{ fontWeight: 400, color: '#666', marginLeft: 8 }}>
                  ({imageFiles.length}/{MAX_IMAGES} selected)
                </span>
              </label>
              <input
                className="uc-input"
                type="file"
                accept="image/*"
                multiple
                disabled={imageFiles.length >= MAX_IMAGES}
                onChange={handleImageChange}
              />
            </div>
          </div>

          {previews.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label className="uc-label">Image Previews</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                {previews.map((src, index) => (
                  <div key={index} style={{ position: 'relative', width: 100, height: 100 }}>
                    <img
                      src={src}
                      alt={`Preview ${index + 1}`}
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: index === 0 ? '2px solid #F6B800' : '2px solid #e2e8f0' }}
                    />
                    {index === 0 && (
                      <span style={{ position: 'absolute', bottom: 4, left: 4, background: '#F6B800', color: '#18004d', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6 }}>
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, lineHeight: '22px', textAlign: 'center', padding: 0 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>First image is used as the cover photo.</p>
            </div>
          )}

          <label className="uc-label" style={{ marginTop: 16 }}>Description</label>
          <textarea className="uc-textarea" rows="5" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mention usage history, damages, accessories, warranty, etc." />

          <div className="uc-card-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="uc-btn uc-btn-outline" onClick={() => navigate('/my-listings')}>My Listings</button>
            <button type="submit" className="uc-btn uc-btn-gold" disabled={uploading}>{uploading ? 'Posting...' : 'Post Listing'}</button>
          </div>
        </form>
      </main>
    </>
  );
}
