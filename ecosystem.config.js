module.exports = {
  apps: [
    {
      name: 'nordsecure',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/nordsecure',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
    },
  ],
}
