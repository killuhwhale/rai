// command_center.js
require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const uuid = require('crypto').randomUUID;

const {
  PROJECT_ID,
  ZONE,
  MACHINE_TYPE,
  IMAGE_FAMILY,
  IMAGE_PROJECT,
  SERVICE_ACCOUNT,
  STARTUP_SCRIPT_URL,
  DEV_MODE,
  DOCKER_IMAGE,
} = process.env;

const app = express();
app.use(express.json());

/**
 * Create a new Confidential VM instance on GCP.
 */
function createConfidentialInstance(instanceName) {
  const cmd = [
    'gcloud compute instances create', instanceName,
    `--project=${PROJECT_ID}`,
    `--zone=${ZONE}`,
    `--machine-type=${MACHINE_TYPE}`,
    `--confidential-compute`,
    `--min-cpu-platform="AMD EPYC (TM) Milan"`,
    `--image-family=${IMAGE_FAMILY}`,
    `--image-project=${IMAGE_PROJECT}`,
    `--metadata=startup-script-url=${STARTUP_SCRIPT_URL}`,
    `--service-account=${SERVICE_ACCOUNT}`,
    `--scopes=https://www.googleapis.com/auth/cloud-platform`
  ].join(' ');

  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

/**
 * Spin up a local Docker container (detached).
 */
function createLocalInstance(instanceName) {
  // You can add any -p, -v or ENV flags as needed
  const cmd = `docker run -d --name ${instanceName} ${DOCKER_IMAGE}`;
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(`Container ${instanceName} started: ${stdout.trim()}`);
    });
  });
}

app.post('/provision', async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  const instanceName = `prov-${tenantId}-${uuid().slice(0,8)}`;
  try {
    let details;
    if (DEV_MODE === 'true') {
      details = await createLocalInstance(instanceName);
    } else {
      details = await createConfidentialInstance(instanceName);
    }
    res.json({ instanceName, mode: DEV_MODE === 'true' ? 'local-docker' : 'gcp-vm', details });
  } catch (e) {
    console.error('provision error', e);
    res.status(500).json({ error: e.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Command Center listening on http://localhost:${PORT}`);
  console.log(`DEV_MODE=${DEV_MODE}`);
});
