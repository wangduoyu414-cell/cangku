/**
 * 检查你的网络和 IP 信息
 */

import https from 'node:https';

async function checkMyIP() {
  console.log('═══════════════════════════════════════');
  console.log('           网络诊断');
  console.log('═══════════════════════════════════════\n');

  // 检查外部 IP
  console.log('1️⃣  检查你的公网 IP...');
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log(`   你的 IP: ${data.ip}`);

    // 检查 IP 地理位置
    const geoResponse = await fetch(`http://ip-api.com/json/${data.ip}`);
    const geo = await geoResponse.json();
    console.log(`   位置: ${geo.country}, ${geo.city}`);
    console.log(`   ISP: ${geo.isp}`);
    console.log(`   ASN: AS${geo.as}`);

    if (geo.country === 'China') {
      console.log('\n   ⚠️  检测到你在中国大陆！');
      console.log('   AMD 服务器在美国，从中国访问可能被限流或拦截。');
    }
  } catch (err) {
    console.log(`   ❌ 获取 IP 失败: ${err}`);
  }

  console.log('\n2️⃣  测试访问 AMD...');
  try {
    const amdResponse = await fetch('https://www.amd.com', {
      redirect: 'follow'
    });
    console.log(`   AMD 响应: ${amdResponse.status}`);
    console.log(`   最终 URL: ${amdResponse.url}`);
  } catch (err) {
    console.log(`   ❌ AMD 访问失败: ${err}`);
  }

  console.log('\n3️⃣  测试 DNS 解析...');
  try {
    const dns = require('dns').promises;
    const addresses = await dns.resolve4('www.amd.com');
    console.log(`   AMD IP: ${addresses.join(', ')}`);
  } catch (err) {
    console.log(`   ❌ DNS 解析失败: ${err}`);
  }

  console.log('\n4️⃣  测试 traceroute 到 AMD...');
  console.log('   (使用 ping 测试连通性)');

  try {
    const ping = require('child_process');
    const result = ping.spawnSync('ping', ['-n', '3', 'www.amd.com']);
    const output = result.stdout.toString();
    if (output.includes('来自') || output.includes('Reply from')) {
      console.log('   ✅ 可以 ping 通 AMD');
      const match = output.match(/来自.*?=(.+)/g);
      if (match) {
        console.log(`   延迟: ${match[match.length - 1]}`);
      }
    } else {
      console.log('   ⚠️  无法 ping 通 AMD');
    }
  } catch (err) {
    console.log(`   ⚠️  Ping 测试失败: ${err}`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('总结:');
  console.log('═══════════════════════════════════════');
  console.log(`
如果你的 IP 在中国大陆：
- AMD 服务器在美国
- 中国大陆到美国有防火墙限制
- HTTP/2 连接可能被阻断
- 建议使用美国/欧洲的代理服务器

如果你的 IP 不在中国大陆：
- 可能是 Chromium 被 AMD 的反爬系统检测
- 尝试使用住宅代理
`);
}

checkMyIP().catch(console.error);
