import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateCertificatesWithNode() {
  const certsDir = path.join(process.cwd(), 'certs');
  
  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('✓ Created certs directory');
  }

  const keyPath = path.join(certsDir, 'localhost-key.pem');
  const certPath = path.join(certsDir, 'localhost-cert.pem');

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✓ Certificates already exist!');
    console.log(`  Key: ${keyPath}`);
    console.log(`  Certificate: ${certPath}`);
    return;
  }

  try {
    console.log('Installing selfsigned package...');
    await execAsync('npm install selfsigned --no-save');
    
    console.log('Generating self-signed certificates for localhost...');
    
    // Use selfsigned package to generate certificates
    const { default: selfsigned } = await import('selfsigned');
    
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, {
      keySize: 2048,
      days: 365,
      algorithm: 'sha256',
      extensions: [
        {
          name: 'basicConstraints',
          cA: true
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          codeSigning: true,
          timeStamping: true
        },
        {
          name: 'subjectAltName',
          altNames: [
            {
              type: 2, // DNS
              value: 'localhost'
            },
            {
              type: 7, // IP
              ip: '127.0.0.1'
            },
            {
              type: 7, // IP
              ip: '0.0.0.0'
            }
          ]
        }
      ]
    });

    // Write the certificate and key files
    fs.writeFileSync(keyPath, pems.private);
    fs.writeFileSync(certPath, pems.cert);
    
    console.log('✓ Self-signed certificates generated successfully!');
    console.log(`  Key: ${keyPath}`);
    console.log(`  Certificate: ${certPath}`);
    console.log('\n⚠️  Note: These are self-signed certificates for development only.');
    console.log('Your browser will show a security warning - this is expected.');
    console.log('You can safely proceed by accepting the certificate in your browser.');
    console.log('\n🔧 To trust the certificate in your browser:');
    console.log('  Chrome/Edge: Click "Advanced" → "Proceed to localhost (unsafe)"');
    console.log('  Firefox: Click "Advanced" → "Accept the Risk and Continue"');
  } catch (error) {
    console.error('❌ Error generating certificates:', error.message);
  }
}

generateCertificatesWithNode();
