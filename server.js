const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.use('/api/calculate-rewards', require('./server/routes/api/rewards'));
app.use('/api/users', require('./server/routes/api/users'));
app.use('/api/auth', require('./server/routes/api/auth'));
app.use('/api/profile', require('./server/routes/api/profile'));
app.use('/api/posts', require('./server/routes/api/posts'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

if (process.env.NODE_ENV === 'production') {
  const build = path.join(__dirname, 'build');
  app.use(express.static(build));
  app.get('*', (req, res) => res.sendFile(path.join(build, 'index.html')));
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Send valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' });
  }
  console.error(err);
  return res.status(500).json({ message: 'The server could not complete the request.' });
});

if (require.main === module) {
  const port = process.env.PORT || 5025;
  app.listen(port, () => console.log(`Server started on port ${port}`));
}

module.exports = app;
