import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PageHero } from './UniLayout';

const fallbackCategories = [
  { id: 1, name: 'Hardware' },
  { id: 2, name: 'Academic Books' },
  { id: 3, name: 'Software Licenses' },
  { id: 4, name: 'Others' },
];

const fallbackProducts = [
  { id: 'demo-1', title: 'Arduino Starter Kit', price: 1800, condition: 'Like New', description: 'Complete CSE lab-friendly hardware kit.', category_id: 1, category: { name: 'Hardware' }, images: [{ image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80' }] },
  { id: 'demo-2', title: 'Data Structures Textbook', price: 650, condition: 'Good', description: 'Clean academic book for CSE students.', category_id: 2, category: { name: 'Academic Books' }, images: [{ image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80' }] },
  { id: 'demo-3', title: 'Used Scientific Calculator', price: 900, condition: 'Fair', description: 'Useful calculator for engineering courses.', category_id: 4, category: { name: 'Others' }, images: [{ image_url: 'https://images.unsplash.com/photo-1617791160536-598cf32026fb?auto=format&fit=crop&w=900&q=80' }] },
  { id: 'demo-4', title: 'Student Laptop - Core i5', price: 28500, condition: 'Good', description: 'Budget laptop for programming and assignments.', category_id: 1, category: { name: 'Hardware' }, images: [{ image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80' }] },
];

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: '', minPrice: '', maxPrice: '', condition: '' });
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data?.length ? data : fallbackCategories);
  }

  async function fetchProducts(sortOption = 'newest') {
    let query = supabase
      .from('products')
      .select(`*, category:categories(name), images:product_images(image_url)`)
      .eq('status', 'available');

    if (sortOption === 'newest') query = query.order('created_at', { ascending: false });
    if (sortOption === 'oldest') query = query.order('created_at', { ascending: true });
    if (sortOption === 'price-low') query = query.order('price', { ascending: true });
    if (sortOption === 'price-high') query = query.order('price', { ascending: false });

    const { data } = await query;
    setProducts(data?.length ? data : fallbackProducts);
  }

  const filteredProducts = products.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = p.title?.toLowerCase().includes(searchLower) || (p.description?.toLowerCase() || '').includes(searchLower);
    const matchesCategory = !filters.category || p.category_id === parseInt(filters.category, 10) || p.category?.name === filters.category;
    const matchesMinPrice = !filters.minPrice || Number(p.price) >= parseFloat(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || Number(p.price) <= parseFloat(filters.maxPrice);
    const matchesCondition = !filters.condition || p.condition === filters.condition;
    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesCondition;
  });

  const handleFilterChange = (e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const resetFilters = () => { setSearchTerm(''); setFilters({ category: '', minPrice: '', maxPrice: '', condition: '' }); };

  return (
    <>
      <PageHero
        eyebrow="Dorm-to-dorm marketplace"
        title="Student Marketplace"
        subtitle="Buy and sell CSE-specific hardware, books, software licenses and academic items with verified seller profiles and in-app chat."
        actions={<><button className="uc-btn uc-btn-gold" onClick={() => navigate('/my-listings')}>My Listings</button><button className="uc-btn uc-btn-gold" onClick={() => navigate('/sell')}>Sell an Item</button></>}
      />
      <main className="uc-content">
        <section className="uc-filter-panel">
          <div className="uc-form-grid">
            <div>
              <label className="uc-label">Search items</label>
              <input className="uc-input" placeholder="Search laptop, Arduino, textbook..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div>
              <label className="uc-label">Category</label>
              <select className="uc-select" name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="uc-label">Condition</label>
              <select className="uc-select" name="condition" value={filters.condition} onChange={handleFilterChange}>
                <option value="">All Conditions</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option>
              </select>
            </div>
            <div>
              <label className="uc-label">Sort By</label>
              <select className="uc-select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); fetchProducts(e.target.value); }}>
                <option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
          <div className="uc-form-grid" style={{ marginTop: 14 }}>
            <div><label className="uc-label">Min Price</label><input className="uc-input" type="number" name="minPrice" placeholder="৳ 0" value={filters.minPrice} onChange={handleFilterChange} /></div>
            <div><label className="uc-label">Max Price</label><input className="uc-input" type="number" name="maxPrice" placeholder="৳ 99999" value={filters.maxPrice} onChange={handleFilterChange} /></div>
            <div style={{ display: 'flex', alignItems: 'end' }}><button className="uc-btn uc-btn-outline" onClick={resetFilters}>Reset Filters</button></div>
            <div style={{ display: 'flex', alignItems: 'end' }}><span className="uc-badge">Showing {filteredProducts.length} of {products.length} items</span></div>
          </div>
        </section>

        <div className="uc-tabs">
          {['All Items', 'Hardware', 'Academic Books', 'Software Licenses', 'Others'].map((x, i) => <button key={x} className={i === 0 ? 'uc-tab active' : 'uc-tab'}>{x}</button>)}
        </div>

        {filteredProducts.length === 0 ? (
          <section className="uc-card uc-card-pad" style={{ textAlign: 'center' }}>
            <h2>No items found</h2>
            <p>Try changing search text or filters.</p>
            <button className="uc-btn uc-btn-gold" onClick={resetFilters}>Clear Filters</button>
          </section>
        ) : (
          <section className="uc-grid-4">
            {filteredProducts.map((p) => (
              <article key={p.id} className="uc-card" onClick={() => String(p.id).startsWith('demo') ? null : navigate(`/product/${p.id}`)} style={{ cursor: 'pointer' }}>
                <img className="uc-product-img" src={p.images?.[0]?.image_url || 'https://via.placeholder.com/400x260?text=UniConnect'} alt={p.title || 'Marketplace item'} />
                <div className="uc-product-info">
                  <span className="uc-badge uc-badge-blue">{p.category?.name || 'Marketplace'}</span>
                  <h3 style={{ marginTop: 12 }}>{p.title}</h3>
                  <p className="uc-price">৳{Number(p.price || 0).toLocaleString()}</p>
                  <p><strong>Condition:</strong> {p.condition || 'Good'}</p>
                  <p>{p.description?.substring(0, 88)}{p.description?.length > 88 ? '...' : ''}</p>
                  <div className="uc-card-actions"><button className="uc-btn uc-btn-blue">View Details</button><button className="uc-btn uc-btn-outline">Chat</button></div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
