import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button } from './ui/Button';

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [product, setProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const getCurrentUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { navigate('/login'); return null; }
    setCurrentUser(user); return user;
  }, [navigate]);

  const fetchConversation = useCallback(async (user) => {
    if (!conversationId || !user?.id) return;
    try {
      setLoading(true);
      const { data: conv, error } = await supabase.from('conversations').select('*, product:products(id, title, price, location, images:product_images(image_url))').eq('id', conversationId).single();
      if (error) throw error;
      if (conv.buyer_id !== user.id && conv.seller_id !== user.id) throw new Error('You are not allowed to view this conversation');
      setConversation(conv); setProduct(conv.product);
      const otherUserId = user.id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
      const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', otherUserId).maybeSingle();
      setOtherUser(profile || { id: otherUserId, full_name: 'User' });
    } catch (error) { alert('Error loading conversation: ' + error.message); navigate('/marketplace'); }
    finally { setLoading(false); }
  }, [conversationId, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (!error) setMessages(data || []);
  }, [conversationId]);

  useEffect(() => { let mounted = true; (async () => { const user = await getCurrentUser(); if (mounted && user) await fetchConversation(user); })(); return () => { mounted = false; }; }, [getCurrentUser, fetchConversation]);
  useEffect(() => {
    if (!conversationId || !conversation?.id) return undefined;
    fetchMessages();
    const channel = supabase.channel(`messages-updates-${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => setMessages((prev) => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, conversation, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser?.id || !conversationId) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert([{ conversation_id: conversationId, sender_id: currentUser.id, content: newMessage.trim() }]);
      if (error) throw error; setNewMessage('');
    } catch (error) { alert('Error sending message: ' + error.message); }
    finally { setSending(false); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 font-black text-uniBlue">Loading chat...</div>;
  if (!conversation) return <div className="grid min-h-screen place-items-center bg-slate-50 font-black text-uniBlue">Conversation not found</div>;

  return <div className="flex h-screen flex-col bg-slate-50">
    <header className="flex items-center gap-4 border-b border-blue-100 bg-white px-6 py-4 shadow-sm">
      <Button variant="navy" onClick={() => navigate('/conversations')}>← Back</Button>
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-uniGold font-black text-uniBlue">{(otherUser?.full_name || 'U').charAt(0).toUpperCase()}</div><div><h2 className="text-xl font-black text-uniBlue">{otherUser?.full_name || 'Unknown User'}</h2>{product && <p className="text-sm text-slate-500">About: <b>{product.title}</b> — ৳{product.price}</p>}</div></div>
        {product?.images?.[0] && <img className="h-14 w-14 rounded-2xl border-2 border-uniGold object-cover" src={product.images[0].image_url} alt={product.title || 'Product'} />}
      </div>
    </header>
    <main className="flex-1 overflow-y-auto p-6">
      {messages.length === 0 ? <div className="grid h-full place-items-center text-center text-slate-500"><p>💬<br/>No messages yet. Start the conversation!</p></div> : messages.map((msg) => { const mine = msg.sender_id === currentUser?.id; return <div key={msg.id} className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] rounded-3xl px-5 py-3 shadow ${mine ? 'rounded-br-md bg-uniBlue text-white' : 'rounded-bl-md border border-blue-100 bg-white text-slate-900'}`}><p className="break-words text-sm leading-6">{msg.content}</p><span className={`text-[11px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span></div></div>; })}<div ref={messagesEndRef}/>
    </main>
    <footer className="flex gap-3 border-t border-blue-100 bg-white p-4"><input className="flex-1 rounded-full border border-blue-100 px-5 py-3 outline-none focus:border-uniGold focus:ring-4 focus:ring-yellow-100" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Type a message..." disabled={sending}/><Button disabled={sending || !newMessage.trim()} onClick={sendMessage}>{sending ? '...' : 'Send'}</Button></footer>
  </div>;
}
