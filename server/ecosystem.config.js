module.exports = {
  apps: [{
    name: 'ecoloop-server',
    script: 'server.js',
    cwd: __dirname,
    watch: false,
    autorestart: true,
    max_restarts: 20,
    restart_delay: 2000,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5003,
    },
  }],
};
