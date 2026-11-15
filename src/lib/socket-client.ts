'use client';

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    return {} as Socket;
  }

  if (!socketInstance) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to real-time socket:', socketInstance?.id);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket');
    });
  }

  return socketInstance;
}
