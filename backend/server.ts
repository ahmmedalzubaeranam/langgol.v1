const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());

app.get('/test', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;