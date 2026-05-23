const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const supabase = require('../lib/supabase');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleMiddleware');
const router = express.Router();

const SEQ_FILE = path.join(__dirname, '..', 'jo-sequence.json');
const upload = multer({ storage: multer.memoryStorage() });

async function generateJoNumberViaRpc() {
  // Try calling a Postgres function 'generate_jo_number' if the project has one.
  try {
    const { data, error } = await supabase.rpc('generate_jo_number');
    if (error) throw error;
    // Accept text return, object return, or row-array return.
    return data;
  } catch (err) {
    // Not available or failed
    return null;
  }
}

function normalizeRpcJoNumber(rpcResult) {
  if (!rpcResult) return null;
  if (typeof rpcResult === 'string') return rpcResult;
  if (Array.isArray(rpcResult) && rpcResult.length > 0) {
    const first = rpcResult[0];
    if (typeof first === 'string') return first;
    if (first && typeof first.jo_number === 'string') return first.jo_number;
  }
  if (rpcResult && typeof rpcResult.jo_number === 'string') return rpcResult.jo_number;
  return null;
}

function generateJoNumberFileBacked() {
  // Simple file-backed sequence for local development.
  let data = { year: new Date().getFullYear(), last: 0 };
  try {
    if (fs.existsSync(SEQ_FILE)) {
      data = JSON.parse(fs.readFileSync(SEQ_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read sequence file', e);
  }
  const nowYear = new Date().getFullYear();
  if (data.year !== nowYear) {
    data.year = nowYear;
    data.last = 0;
  }
  data.last = (data.last || 0) + 1;
  fs.writeFileSync(SEQ_FILE, JSON.stringify(data, null, 2));
  const seq = String(data.last).padStart(4, '0');
  return `JO-${data.year}-${seq}`;
}

router.post('/generate', async (req, res) => {
  try {
    const rpcResult = await generateJoNumberViaRpc();
    const rpcJoNumber = normalizeRpcJoNumber(rpcResult);
    if (rpcJoNumber) {
      return res.json({ jo_number: rpcJoNumber });
    }
    const joNumber = generateJoNumberFileBacked();
    return res.json({ jo_number: joNumber });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate JO number' });
  }
});

router.post('/upload-proof', authMiddleware, requireAnyRole(['admin', 'technician']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Validate MIME types
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowed.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  const bucket = 'signed-jo-proofs';
  const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
  try {
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) {
      console.error('Supabase upload error', uploadError);
      return res.status(500).json({ error: 'Failed to upload to storage' });
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return res.json({ path: data.path, publicURL: publicData.publicUrl, originalName: req.file.originalname });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
