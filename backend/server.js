require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const joRoutes = require('./routes/jo');
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const personnelRoutes = require('./routes/personnel');
const completionRoutes = require('./routes/completion');
const approvalRoutes = require('./routes/approval');
const logsRoutes = require('./routes/logs');
const jobOrdersRoutes = require('./routes/job-orders');
const usersRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/jo', joRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/completion', completionRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/job-orders', jobOrdersRoutes);
app.use('/api/users', usersRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
