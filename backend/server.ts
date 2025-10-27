const express = require('express');
const cors = require('cors');
import { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());

app.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Hello from the backend!' });
});

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;
