import { io } from 'socket.io-client';

const socket = io(window.location.origin, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export default socket;
