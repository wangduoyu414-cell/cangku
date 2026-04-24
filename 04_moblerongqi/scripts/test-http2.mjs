/**
 * AMD HTTP2 连接测试
 */

import https from 'node:https';
import http2 from 'node:http2';

// 测试 1: 使用标准 HTTPS (HTTP/1.1)
console.log('═══════════════════════════════════════');
console.log('Test 1: HTTPS (HTTP/1.1)');
console.log('═══════════════════════════════════════\n');

https.get('https://www.amd.com', (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`HTTP Version: ${res.httpVersion}`);

  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`Body length: ${body.length} bytes`);
    console.log('\n✅ HTTPS (HTTP/1.1) connection successful\n');

    // 测试 2: 使用 HTTP/2
    console.log('═══════════════════════════════════════');
    console.log('Test 2: HTTP/2 direct');
    console.log('═══════════════════════════════════════\n');

    try {
      const client = http2.connect('https://www.amd.com', {
        rejectUnauthorized: false,
      });

      client.on('connect', () => {
        console.log('❌ HTTP/2 connected unexpectedly');
        client.close();
      });

      client.on('error', (err) => {
        console.log(`❌ HTTP/2 Error: ${err.message}`);
      });

      // 超时处理
      setTimeout(() => {
        if (!client.destroyed) {
          console.log('⏱️  HTTP/2 connection timeout');
          client.destroy();
        }
      }, 5000);
    } catch (err) {
      console.log(`❌ HTTP/2 Exception: ${err}`);
    }
  });
}).on('error', (err) => {
  console.log(`❌ HTTPS Error: ${err.message}`);
});
