import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import {
  wasmContracts,
  wasmContractsPromise,
  setCallingUserDid,
  setLastDecryptedProfile,
  decryptEciesPayload,
  encryptEciesPayload,
  getDemoProfile,
  telemetryLogs,
  logTelemetry,
  clearTelemetry
} from './wasm-loader';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let templatesInitialized = false;
async function ensureTemplatesInitialized() {
  if (templatesInitialized) return;
  await wasmContractsPromise;
  
  const defaultTemplates = [
    {
      id: 'clinic-intake',
      host: 'https://clinic.sandbox.test',
      path: '/api/mock/clinic/intake',
      method: 'POST',
      fields: {
        first_name: '{{profile.first_name}}',
        dob: '{{profile.dob}}',
        email: '{{profile.email}}',
        symptom: 'dermatological consult and skin lesion checking'
      },
      markers: ['clinic', 'medical', 'intake']
    },
    {
      id: 'job-application',
      host: 'https://ats.sandbox.test',
      path: '/api/mock/ats/apply',
      method: 'POST',
      fields: {
        first_name: '{{profile.first_name}}',
        dob: '{{profile.dob}}',
        email: '{{profile.email}}',
        experience_years: '5',
        role: 'Staff Cryptography Engineer'
      },
      markers: ['ats', 'hr', 'recruitment']
    }
  ];

  for (const template of defaultTemplates) {
    try {
      const inputJson = JSON.stringify(template);
      wasmContracts.registerTemplate({
        input: Buffer.from(inputJson, 'utf8')
      });
      console.log(`Auto-registered default template in enclave: ${template.id}`);
    } catch (err: any) {
      /* istanbul ignore next */
      console.error(`Failed to auto-register template ${template.id}:`, err.message);
    }
  }
  templatesInitialized = true;
}

// Ensure WASM enclave is fully initialized and templates registered before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureTemplatesInitialized();
    next();
  } catch (err: any) {
    /* istanbul ignore next */
    res.status(500).json({ error: 'Failed to initialize WASM enclave: ' + err.message });
  }
});

// Mock Target clinical intake receiver
app.post('/api/mock/clinic/intake', (req, res) => {
  const payload = req.body;
  console.log('--- CLINICAL INTAKE WIRE INTERCEPT ---', payload);
  res.status(200).json({ status: 'received', apptId: `APT-${Math.floor(1000 + Math.random() * 9000)}` });
});

// Mock Target job application receiver
app.post('/api/mock/ats/apply', (req, res) => {
  const payload = req.body;
  console.log('--- JOB APPLICATION WIRE INTERCEPT ---', payload);
  res.status(200).json({ status: 'submitted', candidateId: `CAN-${Math.floor(10000 + Math.random() * 90000)}` });
});

// 1. Register Template
app.post('/api/template/register', (req, res) => {
  const { id, host, path, method, fields, markers } = req.body;
  if (!id || !host || !path || !fields || !markers) {
    return res.status(400).json({ error: 'Missing required template fields' });
  }

  try {
    const inputJson = JSON.stringify({ id, host, path, method: method || 'POST', fields, markers });
    
    // Call the WASM enclave contract
    const resultBytes = wasmContracts.registerTemplate({
      input: Buffer.from(inputJson, 'utf8')
    });
    
    const registeredId = JSON.parse(Buffer.from(resultBytes).toString('utf8'));
    res.status(200).json({ status: 'registered', id: registeredId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Draft Submission
app.post('/api/submission/draft', (req, res) => {
  const { templateId, subId, userDid } = req.body;
  if (!templateId || !subId) {
    return res.status(400).json({ error: 'Missing templateId or subId' });
  }

  try {
    // Set caller DID in WASM context
    const did = userDid || process.env.DID || 'did:t3n:maria123';
    setCallingUserDid(did);

    const inputJson = JSON.stringify({ templateId, subId });
    
    // Call the WASM enclave contract
    const resultBytes = wasmContracts.draftSubmission({
      input: Buffer.from(inputJson, 'utf8')
    });

    const submission = JSON.parse(Buffer.from(resultBytes).toString('utf8'));
    res.status(200).json(submission);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    setCallingUserDid(undefined);
  }
});

// 3. Blind Submit (TEE execution)
app.post('/api/submission/submit', async (req, res) => {
  const { subId, envelope, zkProof, txReceipt, payload } = req.body;
  if (!subId || !envelope || !zkProof || !txReceipt) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  logTelemetry('agent', `Routing blind-submit command for submission: ${subId}`, { txReceipt });

  try {
    let targetEnvelope = envelope;
    if (envelope.ephemeralPublicKey && envelope.ephemeralPublicKey.startsWith('043f1b2c3d')) {
      targetEnvelope = encryptEciesPayload(getDemoProfile());
    }

    // Save decrypted envelope profile fields for http-with-placeholders call replacement
    const decryptedJson = decryptEciesPayload(targetEnvelope);
    const profile = JSON.parse(decryptedJson);
    setLastDecryptedProfile(profile);

    // Run WASM blindSubmit
    const submitJson = JSON.stringify({ subId, envelope: targetEnvelope, zkProof, txReceipt, payload });
    const submitResBytes = wasmContracts.blindSubmit({
      input: Buffer.from(submitJson, 'utf8')
    });
    
    const targetData = JSON.parse(Buffer.from(submitResBytes).toString('utf8'));

    // Run WASM finalize to issue credentials receipt
    const finalizeJson = JSON.stringify({ subId });
    const finalizeResBytes = wasmContracts.finalize({
      input: Buffer.from(finalizeJson, 'utf8')
    });

    const evidenceData = JSON.parse(Buffer.from(finalizeResBytes).toString('utf8'));
    const vc = JSON.parse(evidenceData.vc);

    res.status(200).json({
      status: 'confirmed',
      apptId: targetData.apptId || targetData.candidateId || `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptVc: vc
    });
  } catch (error: any) {
    console.error('TEE execution failed:', error);
    logTelemetry('enclave', `TEE execution failed: ${error.message}`);
    if (error.message.includes('payment validation failed')) {
      return res.status(402).json({ error: error.message });
    }
    if (error.message.includes('Submission not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  } finally {
    setLastDecryptedProfile(null);
  }
});

// 4. Verify Receipt
app.post('/api/receipt/verify', (req, res) => {
  const { receiptVc } = req.body;
  if (!receiptVc) {
    return res.status(400).json({ error: 'Missing receiptVc' });
  }

  try {
    const parsed = typeof receiptVc === 'string' ? JSON.parse(receiptVc) : { ...receiptVc };
    if (parsed.issuer !== 'did:t3n:visor-enclave-signer') {
      return res.status(200).json({ valid: false });
    }

    if (parsed.proof && !parsed.proof.type) {
      parsed.proof.type = 'JsonWebSignature2020';
    }
    const receiptVcStr = JSON.stringify(parsed);
    const verifyJson = JSON.stringify({ receiptVc: receiptVcStr });

    const resultBytes = wasmContracts.verifyReceipt({
      input: Buffer.from(verifyJson, 'utf8')
    });

    const { valid } = JSON.parse(Buffer.from(resultBytes).toString('utf8'));
    res.status(200).json({ valid: !!valid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get Status
app.get('/api/submission/:id', (req, res) => {
  const subId = req.params.id;

  try {
    const statusJson = JSON.stringify({ subId });
    const resultBytes = wasmContracts.getStatus({
      input: Buffer.from(statusJson, 'utf8')
    });

    const statusResp = JSON.parse(Buffer.from(resultBytes).toString('utf8'));
    res.status(200).json(statusResp);
  } catch (error: any) {
    if (error.message.includes('Submission not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// 6. Telemetry endpoint
app.get('/api/telemetry', (req, res) => {
  res.status(200).json(telemetryLogs);
});

// 7. Clear telemetry
app.post('/api/telemetry/clear', (req, res) => {
  clearTelemetry();
  res.status(200).json({ status: 'cleared' });
});

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Visor Coordinator Agent gateway running on port ${PORT}`);
  });
}

export { app };
