/**
 * 测试 Playwright 禁用 HTTP/2 后能否访问 AMD
 */

import { chromium } from 'playwright';

async function testWithoutHTTP2() {
  console.log('🔍 Testing AMD without HTTP/2\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      // 禁用 HTTP/2，强制使用 HTTP/1.1
      '--disable-http2',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('Attempting to load AMD with HTTP/2 disabled...');
    const response = await page.goto('https://www.amd.com', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    console.log(`\n✅ Success!`);
    console.log(`   Status: ${response?.status()}`);
    console.log(`   Final URL: ${page.url()}`);

    const html = await page.content();
    console.log(`   HTML length: ${html.length} bytes`);

    // 截图
    await page.screenshot({ path: './amd-no-http2.png', fullPage: false });
    console.log('   Screenshot saved: amd-no-http2.png');

  } catch (err) {
    console.log(`\n❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
}

// 同时测试使用 HTTP/1.1 代理（如 curl）
async function testWithCurlLike() {
  console.log('\n\n🔍 Testing AMD with HTTP/1.1 only\n');

  // 创建一个使用 HTTP/1.1 的请求
  const response = await fetch('https://www.amd.com', {
    // Node.js fetch 默认使用 HTTP/1.1 或 HTTP/2
  });

  console.log(`Fetch response status: ${response.status}`);
  console.log(`Fetch response URL: ${response.url}`);
}

testWithoutHTTP2().then(testWithCurlLike).catch(console.error);
