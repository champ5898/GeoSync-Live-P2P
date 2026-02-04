
export interface UserLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastUpdated: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  color: string;
}

export interface RoomState {
  id: string;
  users: Record<string, UserLocation>;
}

export interface AIInsight {
  summary: string;
  suggestions: string[];
}
