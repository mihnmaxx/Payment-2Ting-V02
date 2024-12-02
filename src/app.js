require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { router, initNgrok } = require('./webhookHandler');

const app = express();
app.use(bodyParser.json());
app.use('/api', router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    const ngrokUrl = await initNgrok(PORT);
    console.log(`Server is publicly accessible at: ${ngrokUrl}`);
});

const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: 'startup.log' }),
    new winston.transports.Console()
  ]
});
