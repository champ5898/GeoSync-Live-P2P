
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Users, Info, Sparkles, Share2, LogOut, Navigation, Wifi, WifiOff } from 'lucide-react';
import { UserLocation } from './types';
import { getRoomNode } from './services/gunService';
import { getGeminiInsights } from './services/geminiService';
import Map from './components/Map';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const STORAGE_KEY_USERS = 'geosync_cached_users';
const STORAGE_KEY_PROFILE = 'geosync_user_profile';

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
  const [currentUser, setCurrentUser] = useState<UserLocation | null>(null);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const userColorRef = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const userIdRef = useRef(Math.random().toString(36).substring(7));

  // Persistence: Save users whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  // Online/Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger a manual sync of current user location if joined
      if (isJoined && currentUser) {
        getRoomNode(roomId).get(userIdRef.current).put(currentUser);
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

  // Initialize Room ID from Hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) setRoomId(hash);
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Gun.js Subscription
  useEffect(() => {
    if (!roomId || !isJoined) return;

    const roomNode = getRoomNode(roomId);
    
    roomNode.map().on((data: any, id: string) => {
      if (!data) {
        setUsers(prev => prev.filter(u => u.id !== id));
        return;
      }
      
      // Filter out stale peers (older than 10 minutes)
      if (Date.now() - data.lastUpdated > 10 * 60 * 1000) {
        roomNode.get(id).put(null);
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

    return () => {
      roomNode.off();
    };
  }, [roomId, isJoined]);

  // Geolocation Watcher
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
        // Only push to network if online, but state updates locally regardless
        if (roomId && navigator.onLine) {
          getRoomNode(roomId).get(userIdRef.current).put(locationData);
        }
      },
      (err) => {
        setError("Location access denied. Please enable GPS.");
        console.error(err);
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
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (roomId && isOnline) {
      getRoomNode(roomId).get(userIdRef.current).put(null);
    }
    setIsJoined(false);
    setUsers([]);
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_USERS);
  };

  const handleGetInsights = async () => {
    if (users.length === 0 || !isOnline) return;
    setLoadingInsights(true);
    setShowInsights(true);
    const result = await getGeminiInsights(users);
    setInsights(result);
    setLoadingInsights(false);
  };

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Invite link copied to clipboard!");
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <Navigation className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">GeoSync</h1>
            <p className="text-gray-400 text-center mt-2">Decentralized Live Location Sharing</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
              <input
                type="text"
                required
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
              Start Sharing
              <MapPin className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex items-start gap-3 text-sm text-gray-400">
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
              <p>Your location is synced peer-to-peer. Offline support is active; your last known data will be cached locally.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden flex flex-col md:flex-row">
      <div className="absolute top-4 left-4 z-10 w-full max-w-[calc(100%-2rem)] md:w-80 flex flex-col gap-4 pointer-events-none">
        
        {/* Connection Panel */}
        <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-2xl p-4 shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Peers ({users.length})
            </h2>
            <div className="flex items-center gap-2">
               {isOnline ? (
                 <Wifi className="w-4 h-4 text-green-500" />
               ) : (
                 <WifiOff className="w-4 h-4 text-amber-500" />
               )}
              <button 
                onClick={handleLeave}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Leave Room"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {users.length === 0 && <p className="text-gray-500 text-sm italic">No active peers...</p>}
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-xl border border-gray-700/50">
                <div 
                  className={`w-3 h-3 rounded-full ${isOnline ? 'animate-pulse' : ''}`} 
                  style={{ backgroundColor: user.color }} 
                />
                <span className="text-sm font-medium truncate flex-1">{user.name}</span>
                <span className="text-[10px] text-gray-500">
                  {Math.floor((Date.now() - user.lastUpdated) / 1000)}s ago
                </span>
              </div>
            ))}
          </div>

          {!isOnline && (
            <div className="mt-3 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg text-[10px] text-amber-400 text-center font-bold">
              OFFLINE MODE - VIEWING CACHED DATA
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button 
              onClick={copyInviteLink}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold py-2 rounded-lg border border-gray-600 flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="w-4 h-4" />
              Invite
            </button>
            <button 
              onClick={handleGetInsights}
              disabled={!isOnline}
              className={`flex-1 text-white text-xs font-semibold py-2 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isOnline ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-gray-700 cursor-not-allowed grayscale opacity-50'}`}
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* AI Insight Panel */}
        {showInsights && (
          <div className="bg-gray-900/95 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 shadow-2xl pointer-events-auto animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Smart Insight
              </h3>
              <button onClick={() => setShowInsights(false)} className="text-gray-500 hover:text-white">&times;</button>
            </div>
            
            {loadingInsights ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Analyzing patterns...</p>
              </div>
            ) : (
              <div className="text-xs text-gray-300 leading-relaxed max-h-60 overflow-y-auto">
                <div className="prose prose-invert prose-xs">
                  {insights.split('\n').map((line, i) => (
                    <p key={i} className="mb-2">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/90 border border-red-500 text-white text-xs p-3 rounded-xl shadow-lg pointer-events-auto">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 h-full w-full relative">
        <Map users={users} currentUser={currentUser} />
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-300">
              {isOnline ? 'Live Peer-to-Peer Sync' : 'Offline State Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
