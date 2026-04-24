/**
 * AMD HTTP2 连接测试
 */

const https = require('https');
const http2 = require('http2');

// 测试 1: 使用标准 HTTPS (HTTP/1.1)
console.log('═══════════════════════════════════════');
console.log('Test 1: HTTPS (HTTP/1.1)');
console.log('═══════════════════════════════════════\n');

https.get('https://www.amd.com', (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`HTTP Version: ${res.httpVersion}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2).substring(0, 500)}`);
  res.on('data', () => {}); // 消耗数据
  res.on('end', () => {
    console.log('\n✅ HTTPS connection successful\n');

    // 测试 2: 使用 HTTP/2
    console.log('═══════════════════════════════════════');
    console.log('Test 2: HTTP/2');
    console.log('═══════════════════════════════════════\n');

    const client = http2.connect('https://www.amd.com', {
      rejectUnauthorized: false,
    });

    client.on('connect', () => {
      console.log('❌ HTTP/2 connection failed - no event received');
      client.close();
    });

    client.on('error', (err) => {
      console.log(`❌ HTTP/2 Error: ${err.message}`);
    });

    client.on('socketError', (err) => {
      console.log(`❌ Socket Error: ${err.message}`);
    });

    // 超时处理
    setTimeout(() => {
      if (client.destroyed === false) {
        console.log('⏱️  HTTP/2 connection timeout (no response)');
        client.destroy();
      }
    }, 10000);
  });
}).on('error', (err) => {
  console.log(`❌ HTTPS Error: ${err.message}`);
});
