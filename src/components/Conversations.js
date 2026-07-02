import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [productTitle, setProductTitle] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get('product');

  // --- Inline chat pane state (used only in the product-scoped messenger view) ---
  const [selectedId, setSelectedId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef(null);

  const getCurrentUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { navigate('/login'); return; }
    setCurrentUser(user);
  }, [navigate]);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    try {
      if (!silent) setLoading(true);

      if (productFilter && !silent) {
        const { data: prod } = await supabase.from('products').select('title').eq('id', productFilter).maybeSingle();
        setProductTitle(prod?.title || null);
      }

      // Fetch conversations without FK profile joins (no FK constraint on buyer_id/seller_id)
      let query = supabase
        .from('conversations')
        .select('*, product:products(id, title, price, images:product_images(image_url)), messages(id, content, created_at, sender_id)')
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (productFilter) query = query.eq('product_id', productFilter);

      const { data, error } = await query;
      if (error) throw error;

      const otherIds = [...new Set((data || []).map(c =>
        currentUser.id === c.buyer_id ? c.seller_id : c.buyer_id
      ))].filter(Boolean);

      let profileMap = {};
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, university_email, avatar_url')
          .in('id', otherIds);
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      }

      const resolveName = (p) => p?.full_name || p?.university_email?.split('@')[0] || 'Unknown User';

      setConversations((data || []).map(conv => {
        const otherId = currentUser.id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
        const profile = profileMap[otherId];
        return {
          ...conv,
          latestMessage: [...(conv.messages || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
          otherUser: { id: otherId, full_name: resolveName(profile), avatar_url: profile?.avatar_url },
        };
      }));
    } catch (error) { console.error('Error fetching conversations:', error.message); }
    finally { if (!silent) setLoading(false); }
  }, [currentUser, productFilter]);

  useEffect(() => { getCurrentUser(); }, [getCurrentUser]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    fetchConversations();
    const channel = supabase
      .channel(`conversations-updates-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchConversations(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, fetchConversations]);

  // In the messenger view, auto-select the first buyer thread once loaded.
  useEffect(() => {
    if (productFilter && conversations.length > 0 && !selectedId) {
      setSelectedId(conversations[0].id);
    }
  }, [productFilter, conversations, selectedId]);

  // Load + live-subscribe to the selected thread's messages (messenger view).
  useEffect(() => {
    if (!selectedId) { setChatMessages([]); return undefined; }
    let active = true;
    (async () => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', selectedId).order('created_at', { ascending: true });
      if (active) setChatMessages(data || []);
    })();
    const channel = supabase
      .channel(`pane-messages-${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` },
        (payload) => setChatMessages((prev) => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [selectedId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentUser?.id || !selectedId) return;
    setChatSending(true);
    const content = chatInput.trim();
    setChatInput('');
    try {
      const { data: sent, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: selectedId, sender_id: currentUser.id, content }])
        .select()
        .single();
      if (error) throw error;
      setChatMessages((prev) => prev.some(m => m.id === sent.id) ? prev : [...prev, sent]);
    } catch (error) {
      setChatInput(content);
      alert('Error sending message: ' + error.message);
    } finally { setChatSending(false); }
  };

  const deleteConversation = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await supabase.from('messages').delete().eq('conversation_id', id);
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) throw error;
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
      alert('Conversation deleted');
    } catch (error) { alert('Error deleting conversation: ' + error.message); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 font-black text-uniBlue">Loading conversations...</div>;

  // ============================================================
  // MESSENGER VIEW — product-scoped: buyer list (left) + chat (right)
  // ============================================================
  if (productFilter) {
    const selectedConv = conversations.find((c) => c.id === selectedId) || null;
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Card className="mb-4 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-uniGold">Buyer Messages</p>
                <h1 className="text-2xl font-black text-uniBlue">{productTitle || 'Product'}</h1>
                <p className="mt-1 text-sm text-slate-500">{conversations.length} buyer{conversations.length === 1 ? '' : 's'} messaged you about this item.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="navy" onClick={() => navigate('/conversations')}>All Chats</Button>
                <Button variant="navy" onClick={() => navigate('/marketplace')}>← Marketplace</Button>
              </div>
            </div>
          </Card>

          {conversations.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-5xl">💬</div>
              <h2 className="mt-3 text-2xl font-black text-uniBlue">No buyers yet</h2>
              <p className="mt-2 text-slate-500">No one has messaged you about this product yet.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4 md:h-[70vh] md:flex-row">
              {/* Sidebar: one entry per buyer */}
              <Card className="flex flex-col overflow-hidden p-0 md:w-80">
                <div className="border-b border-blue-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Buyers</div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.map((conv) => {
                    const active = conv.id === selectedId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedId(conv.id)}
                        className={`flex w-full items-center gap-3 border-b border-blue-50 px-4 py-3 text-left transition ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        {conv.otherUser?.avatar_url
                          ? <img className="h-11 w-11 rounded-full object-cover" src={conv.otherUser.avatar_url} alt={conv.otherUser.full_name} />
                          : <div className="grid h-11 w-11 place-items-center rounded-full bg-uniGold font-black text-uniBlue">{(conv.otherUser?.full_name || 'U').charAt(0).toUpperCase()}</div>
                        }
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-uniBlue">{conv.otherUser?.full_name || 'Unknown User'}</p>
                          <p className="truncate text-xs text-slate-500">{conv.latestMessage?.content || 'No messages yet'}</p>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deleteConversation(conv.id); } }}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-50 text-sm font-black text-red-600 hover:bg-red-100"
                        >×</span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Chat panel for the selected buyer */}
              <Card className="flex min-h-[50vh] flex-1 flex-col overflow-hidden p-0">
                {selectedConv ? (
                  <>
                    <div className="flex items-center gap-3 border-b border-blue-100 bg-white px-5 py-3">
                      {selectedConv.otherUser?.avatar_url
                        ? <img className="h-10 w-10 rounded-full object-cover" src={selectedConv.otherUser.avatar_url} alt={selectedConv.otherUser.full_name} />
                        : <div className="grid h-10 w-10 place-items-center rounded-full bg-uniGold font-black text-uniBlue">{(selectedConv.otherUser?.full_name || 'U').charAt(0).toUpperCase()}</div>
                      }
                      <h2 className="text-lg font-black text-uniBlue">{selectedConv.otherUser?.full_name || 'Unknown User'}</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
                      {chatMessages.length === 0 ? (
                        <div className="grid h-full place-items-center text-center text-slate-500"><p>💬<br />No messages yet.</p></div>
                      ) : chatMessages.map((msg) => {
                        const mine = msg.sender_id === currentUser?.id;
                        return (
                          <div key={msg.id} className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-3xl px-4 py-2 shadow ${mine ? 'rounded-br-md bg-uniBlue text-white' : 'rounded-bl-md border border-blue-100 bg-white text-slate-900'}`}>
                              <p className="break-words text-sm leading-6">{msg.content}</p>
                              <span className={`text-[11px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="flex gap-3 border-t border-blue-100 bg-white p-3">
                      <input
                        className="flex-1 rounded-full border border-blue-100 px-5 py-3 outline-none focus:border-uniGold focus:ring-4 focus:ring-yellow-100"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                        placeholder={`Reply to ${selectedConv.otherUser?.full_name || 'buyer'}...`}
                        disabled={chatSending}
                      />
                      <Button disabled={chatSending || !chatInput.trim()} onClick={sendChatMessage}>{chatSending ? '...' : 'Send'}</Button>
                    </div>
                  </>
                ) : (
                  <div className="grid h-full place-items-center text-slate-500">Select a buyer to view the chat.</div>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ============================================================
  // GLOBAL INBOX — all conversations across products (list view)
  // ============================================================
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Card className="mb-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-uniGold">UniConnect Messages</p>
              <h1 className="text-3xl font-black text-uniBlue">My Conversations</h1>
              <p className="mt-1 text-slate-500">Continue marketplace discussions with verified CSE members.</p>
            </div>
            <Button variant="navy" onClick={() => navigate('/marketplace')}>← Back to Marketplace</Button>
          </div>
        </Card>

        {conversations.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-5xl">💬</div>
            <h2 className="mt-3 text-2xl font-black text-uniBlue">No conversations yet</h2>
            <p className="mt-2 text-slate-500">Browse marketplace items and start chatting with sellers.</p>
            <Button className="mt-6" onClick={() => navigate('/marketplace')}>Browse Marketplace</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className="flex cursor-pointer items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-2xl"
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  {conv.product?.images?.[0]
                    ? <img className="h-20 w-20 rounded-2xl object-cover" src={conv.product.images[0].image_url} alt={conv.product?.title || 'Product'} />
                    : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-blue-50 text-3xl">📦</div>
                  }
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-uniBlue">{conv.otherUser?.full_name || 'Unknown User'}</h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {conv.product?.title || 'Marketplace Item'}{conv.product?.price ? ` — ৳${conv.product.price}` : ''}
                    </p>
                    <p className="truncate text-sm text-slate-500">{conv.latestMessage?.content || 'No messages yet'}</p>
                  </div>
                  <span className="hidden text-xs text-slate-400 md:block">
                    {conv.latestMessage?.created_at ? new Date(conv.latestMessage.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="grid h-9 w-9 place-items-center rounded-full bg-red-50 font-black text-red-600 hover:bg-red-100"
                >×</button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
