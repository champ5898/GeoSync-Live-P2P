
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  MapPin, Users, Info, Sparkles, Share2, LogOut, 
  Navigation, Wifi, WifiOff, MessageSquare, Send, X 
} from 'lucide-react';
import { UserLocation, ChatMessage } from './types';
import { getRoomNode } from './services/gunService';
import { getGeminiInsights } from './services/geminiService';
import Map from './components/Map';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const STORAGE_KEY_USERS = 'geosync_cached_users';
const STORAGE_KEY_PROFILE = 'geosync_user_profile';
const STORAGE_KEY_CHAT = 'geosync_cached_chat';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; 
  return d;
};

const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string>(() => window.location.hash.slice(1) || '');
  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    return saved ? JSON.parse(saved).name : '';
  });
  const [isJoined, setIsJoined] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [users, setUsers] = useState<UserLocation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CHAT);
    return saved ? JSON.parse(saved) : [];
  });
  const [currentUser, setCurrentUser] = useState<UserLocation | null>(null);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const userColorRef = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const userIdRef = useRef(Math.random().toString(36).substring(7));
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(chatMessages.slice(-50)));
  }, [chatMessages]);

  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showChat]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isJoined && currentUser) {
        getRoomNode(roomId).get('locations').get(userIdRef.current).put(currentUser);
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isJoined, currentUser, roomId]);

  useEffect(() => {
    if (!roomId || !isJoined) return;

    const roomNode = getRoomNode(roomId);
    
    // Listen for peer locations
    roomNode.get('locations').map().on((data: any, id: string) => {
      if (!data) {
        setUsers(prev => prev.filter(u => u.id !== id));
        return;
      }
      if (Date.now() - data.lastUpdated > 10 * 60 * 1000) {
        roomNode.get('locations').get(id).put(null);
        return;
      }
      setUsers(prev => {
        const index = prev.findIndex(u => u.id === id);
        const newUser = { ...data, id };
        if (index > -1) {
          const newArr = [...prev];
          newArr[index] = newUser;
          return newArr;
        }
        return [...prev, newUser];
      });
    });

    // Listen for chat messages
    roomNode.get('chat').map().on((data: any, id: string) => {
      if (!data || !data.text) return;
      setChatMessages(prev => {
        if (prev.some(m => m.id === id)) return prev;
        const newMsg = { ...data, id };
        if (!showChat) setUnreadCount(c => c + 1);
        return [...prev, newMsg].sort((a, b) => a.timestamp - b.timestamp);
      });
    });

    return () => {
      roomNode.get('locations').off();
      roomNode.get('chat').off();
    };
  }, [roomId, isJoined, showChat]);

  // Fix: Added missing copyInviteLink function
  const copyInviteLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Invite link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link: ', err);
    });
  }, []);

  // Fix: Added handleFetchInsights to trigger Gemini API insights
  const handleFetchInsights = useCallback(async () => {
    setShowInsights(true);
    if (users.length === 0 || loadingInsights) return;
    
    setLoadingInsights(true);
    try {
      const result = await getGeminiInsights(users);
      setInsights(result);
    } catch (e) {
      setInsights("Unable to fetch group insights at this time.");
    } finally {
      setLoadingInsights(false);
    }
  }, [users, loadingInsights]);

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const locationData: UserLocation = {
          id: userIdRef.current,
          name: userName,
          lat: latitude,
          lng: longitude,
          lastUpdated: Date.now(),
          color: userColorRef.current
        };

        setCurrentUser(locationData);
        if (roomId && navigator.onLine) {
          getRoomNode(roomId).get('locations').get(userIdRef.current).put(locationData);
        }
      },
      (err) => {
        setError("Location access denied. Please enable GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [userName, roomId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    const id = roomId || Math.random().toString(36).substring(7);
    setRoomId(id);
    window.location.hash = id;
    setIsJoined(true);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify({ name: userName }));
    startSharing();
  };

  const handleLeave = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (roomId && isOnline) getRoomNode(roomId).get('locations').get(userIdRef.current).put(null);
    setIsJoined(false);
    setUsers([]);
    setChatMessages([]);
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_CHAT);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId) return;

    const message: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      senderId: userIdRef.current,
      senderName: userName,
      text: chatInput,
      timestamp: Date.now(),
      color: userColorRef.current
    };

    getRoomNode(roomId).get('chat').get(message.id).put(message);
    setChatInput('');
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (!currentUser) return 0;
      const dA = calculateDistance(currentUser.lat, currentUser.lng, a.lat, a.lng);
      const dB = calculateDistance(currentUser.lat, currentUser.lng, b.lat, b.lng);
      return dA - dB;
    });
  }, [users, currentUser]);

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <Navigation className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">GeoSync</h1>
            <p className="text-gray-400 text-center mt-2 font-medium">Hyper-Local P2P Social Network</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
              <input
                type="text" required
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="Enter your name..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Room (Optional)</label>
              <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="Leave blank for new room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group"
            >
              Start Syncing
              <MapPin className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-700 text-[11px] text-gray-500 text-center uppercase tracking-widest font-bold">
            Real-time • Decentralized • Encrypted-at-Rest
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 z-20 w-full max-w-[calc(100%-2rem)] md:w-80 flex flex-col gap-4 pointer-events-none">
        
        {/* Peer Connectivity Panel */}
        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-4 shadow-2xl pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Proximity
            </h2>
            <div className="flex items-center gap-2">
               {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-amber-500" />}
              <button onClick={handleLeave} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {sortedUsers.length === 0 && <p className="text-gray-500 text-sm italic py-2">No peers nearby...</p>}
            {sortedUsers.map((user) => {
              const dist = currentUser ? calculateDistance(currentUser.lat, currentUser.lng, user.lat, user.lng) : 0;
              return (
                <div key={user.id} className="flex items-center gap-3 bg-gray-800/40 p-2.5 rounded-xl border border-white/5 group hover:bg-gray-800/60 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: user.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-gray-200">{user.name} {user.id === userIdRef.current && '(You)'}</div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-2">
                      {dist > 0 ? (dist < 1 ? `${(dist * 1000).toFixed(0)}m away` : `${dist.toFixed(1)}km away`) : 'Locating...'}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono">
                    {Math.max(0, Math.floor((Date.now() - user.lastUpdated) / 1000))}s
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={copyInviteLink} className="bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-bold py-2.5 rounded-xl border border-gray-600 flex items-center justify-center gap-2 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Invite
            </button>
            <button 
              onClick={handleFetchInsights} 
              disabled={!isOnline || loadingInsights} 
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
            >
              {loadingInsights ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )} 
              AI Scout
            </button>
          </div>
        </div>

        {/* AI Insight Overlay */}
        {showInsights && (
          <div className="bg-gray-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 shadow-2xl pointer-events-auto animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Group Intel
              </h3>
              <button onClick={() => setShowInsights(false)} className="p-1 hover:bg-white/5 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs text-gray-300 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
              <div className="prose prose-invert prose-xs">
                {loadingInsights ? (
                  <div className="flex flex-col gap-2 animate-pulse">
                    <div className="h-2 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-700 rounded w-full"></div>
                    <div className="h-2 bg-gray-700 rounded w-5/6"></div>
                  </div>
                ) : (
                  insights || "Tap AI Scout to generate insights based on current positions."
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Map View */}
      <div className="flex-1 h-full w-full relative z-10">
        <Map users={users} currentUser={currentUser} />
      </div>

      {/* Chat Component */}
      <div className={`fixed inset-y-0 right-0 z-30 w-full md:w-96 transform transition-transform duration-300 ease-in-out ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full bg-gray-900/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gray-800/30">
            <h3 className="font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Group Chat
            </h3>
            <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2 opacity-50">
                <MessageSquare className="w-12 h-12 mb-2" />
                <p>Start the conversation</p>
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.senderId === userIdRef.current ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{msg.senderName}</span>
                  <span className="text-[9px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div 
                  className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-lg ${msg.senderId === userIdRef.current ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-white/5'}`}
                  style={msg.senderId !== userIdRef.current ? { borderLeft: `3px solid ${msg.color}` } : {}}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 bg-gray-800/30 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message friends..."
                className="flex-1 bg-gray-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button type="submit" disabled={!chatInput.trim()} className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Chat Trigger */}
      <button 
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 z-20 w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:scale-110 transition-transform active:scale-95 border border-white/20"
      >
        <MessageSquare className="w-6 h-6 text-white" />
        {unreadCount > 0 && !showChat && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900 animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Status Indicators */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-300">
            {isOnline ? 'Network Live' : 'Offline Buffer'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
