import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const getCurrentUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { navigate('/login'); return; }
    setCurrentUser(user);
  }, [navigate]);

  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from('conversations').select('*, product:products(id, title, price, images:product_images(image_url)), buyer:profiles!buyer_id(id, full_name, avatar_url), seller:profiles!seller_id(id, full_name, avatar_url), messages(id, content, created_at, sender_id)').or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`).order('created_at', { ascending: false });
      if (error) throw error;
      setConversations((data || []).map((conv) => ({ ...conv, latestMessage: [...(conv.messages || [])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0], otherUser: currentUser.id === conv.buyer_id ? conv.seller : conv.buyer })));
    } catch (error) { console.error('Error fetching conversations:', error.message); }
    finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { getCurrentUser(); }, [getCurrentUser]);
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    fetchConversations();
    const channel = supabase.channel(`conversations-updates-${currentUser.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchConversations).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, fetchConversations]);

  const deleteConversation = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;
    try { await supabase.from('messages').delete().eq('conversation_id', id); const { error } = await supabase.from('conversations').delete().eq('id', id); if (error) throw error; setConversations((prev) => prev.filter((c) => c.id !== id)); alert('Conversation deleted'); }
    catch (error) { alert('Error deleting conversation: ' + error.message); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 font-black text-uniBlue">Loading conversations...</div>;

  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-5xl"><Card className="mb-6 p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-uniGold">UniConnect Messages</p><h1 className="text-3xl font-black text-uniBlue">My Conversations</h1><p className="mt-1 text-slate-500">Continue marketplace discussions with verified CSE members.</p></div><Button variant="navy" onClick={() => navigate('/marketplace')}>← Back to Marketplace</Button></div></Card>
    {conversations.length === 0 ? <Card className="p-12 text-center"><div className="text-5xl">💬</div><h2 className="mt-3 text-2xl font-black text-uniBlue">No conversations yet</h2><p className="mt-2 text-slate-500">Browse marketplace items and start chatting with sellers.</p><Button className="mt-6" onClick={() => navigate('/marketplace')}>Browse Marketplace</Button></Card> : <div className="space-y-4">{conversations.map((conv) => <Card key={conv.id} className="flex cursor-pointer items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-2xl" onClick={() => navigate(`/chat/${conv.id}`)}><div className="flex min-w-0 flex-1 gap-4">{conv.product?.images?.[0] ? <img className="h-20 w-20 rounded-2xl object-cover" src={conv.product.images[0].image_url} alt={conv.product?.title || 'Product'} /> : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-blue-50 text-3xl">📦</div>}<div className="min-w-0 flex-1"><h3 className="font-black text-uniBlue">{conv.otherUser?.full_name || 'Unknown User'}</h3><p className="text-sm font-semibold text-slate-600">{conv.product?.title || 'Marketplace Item'}{conv.product?.price ? ` — ৳${conv.product.price}` : ''}</p><p className="truncate text-sm text-slate-500">{conv.latestMessage?.content || 'No messages yet'}</p></div><span className="hidden text-xs text-slate-400 md:block">{conv.latestMessage?.created_at ? new Date(conv.latestMessage.created_at).toLocaleDateString() : ''}</span></div><button onClick={(e)=>{e.stopPropagation();deleteConversation(conv.id);}} className="grid h-9 w-9 place-items-center rounded-full bg-red-50 font-black text-red-600 hover:bg-red-100">×</button></Card>)}</div>}
  </div></main>;
}
