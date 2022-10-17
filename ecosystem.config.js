module.exports = {
  apps: [
    {
      name: 'My-Homepage',
      script: 'npm start',
      time: true,
      instances: 1,
      autorestart: true,
      max_restarts: 50,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 3000,
        MONGO_PASS: process.env.MONGO_PASS,
        MONGO_USER: process.env.MONGO_USER,
        MONGO_URL: process.env.MONGO_URL
      },
    },
  ],
  deploy: {
    production: {
      user: 'runner',
      host: 'tobiashoelzer.de',
      key: '~/.ssh/id_rsa',
      ssh_options: 'StrictHostKeyChecking=no',
      ref: 'origin/main',
      repo: 'https://github.com/relativityhd/my-homepage',
      path: '/var/www/my-homepage',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
        PORT: 3800,
        MONGO_PASS: process.env.MONGO_PASS,
        MONGO_USER: process.env.MONGO_USER,
        MONGO_URL: process.env.MONGO_URL
      },
    },
  },
}
