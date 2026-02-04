
import Gun from 'gun/gun';

// We use public Gun relays for peer connectivity
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun'
  ]
});

export const getRoomNode = (roomId: string) => {
  return gun.get('geosync-rooms').get(roomId);
};

export default gun;
