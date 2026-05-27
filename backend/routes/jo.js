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

function resolveStoragePath(proofFile) {
  if (!proofFile) return null;

  const rawValue = String(proofFile).trim();
  if (!rawValue) return null;

  if (rawValue.startsWith('proofs/')) {
    return rawValue;
  }

  const bucketMarker = '/signed-jo-proofs/';
  const bucketIndex = rawValue.indexOf(bucketMarker);
  if (bucketIndex >= 0) {
    return rawValue.slice(bucketIndex + bucketMarker.length).split('?')[0].split('#')[0];
  }

  return null;
}

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

router.get('/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('jo_number_sequences')
      .select('year, last_value')
      .eq('year', year)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to load next JO number' });
    }

    const nextValue = Number(data?.last_value || 0) + 1;
    const jo_number = `JO-${year}-${String(nextValue).padStart(4, '0')}`;

    return res.json({ jo_number, year, last_value: Number(data?.last_value || 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load next JO number' });
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
  const jobOrderId = req.body?.jobOrderId || 'unknown-job-order';
  const previousProofFile = req.body?.previousProofFile || req.body?.proofFile || req.body?.proof_url || null;
  const fileExt = String(req.file.originalname || '').split('.').pop() || 'bin';
  // Use a unique path per upload so a re-upload always produces a fresh public URL.
  const filePath = `proofs/${jobOrderId}-${Date.now()}.${fileExt}`;
  try {
    const previousPath = resolveStoragePath(previousProofFile);
    if (previousPath) {
      const { error: removeError } = await supabase.storage.from(bucket).remove([previousPath]);
      if (removeError) {
        console.warn('Failed to remove previous proof file before re-upload', removeError);
      }
    }

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, req.file.buffer, {
        cacheControl: '3600',
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage error:', uploadError);
      return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return res.json({ path: data.path, publicURL: publicData.publicUrl, originalName: req.file.originalname });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
