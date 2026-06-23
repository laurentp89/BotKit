module.exports = {
  apps: [
    {
      name: 'TestBotKit',
      script: './app.js',
      interpreter: '/home/ubuntu/.nvm/versions/node/v24.15.0/bin/node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
