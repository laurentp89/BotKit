module.exports = {
  apps: [
    {
      name: 'botname',
      script: './app.js',
      interpreter: '/home/ubuntu/.nvm/versions/node/v24.14.0/bin/node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
