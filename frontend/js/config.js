const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const CONFIG = {
  API_URL: isLocalHost ? 'http://localhost:5000/api' : 'https://hospital-queue-eeko.onrender.com/api',
  SOCKET_URL: isLocalHost ? 'http://localhost:5000' : 'https://hospital-queue-eeko.onrender.com',
};