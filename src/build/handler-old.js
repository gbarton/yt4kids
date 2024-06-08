import express from 'express';

const handler = express.Router();

handler.get('/', (req, res) => {
  res.send('ytKids client goes here');
});

export { handler };