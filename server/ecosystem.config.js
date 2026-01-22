module.exports = {
  apps: [
    {
      name: "node-auth-backend",
      script: "./src/bin/www.js",
      autorestart: false,
      watch: false,
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
