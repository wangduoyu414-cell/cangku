/**
 * AMD 专项诊断脚本
 *
 * 诊断为什么 AMD 网站突然不能访问
 */

import { chromium } from 'playwright';

async function diagnoseAMD() {
  console.log('🔍 AMD 网站专项诊断\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });

  const urls = [
    'https://www.amd.com',
    'https://www.amd.com/en.html',
    'https://www.amd.com/en.html#products',
  ];

  for (const url of urls) {
    console.log(`\n═══════════════════════════════════════`);
    console.log(`Testing: ${url}`);
    console.log(`═══════════════════════════════════════`);

    const context = await browser.newContext({
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // 监听网络请求
    page.on('request', request => {
      if (request.url().includes('amd.com')) {
        console.log(`  ➡️  ${request.method()} ${request.url().substring(0, 80)}...`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('amd.com')) {
        console.log(`  ⬅️  ${response.status()} ${response.url().substring(0, 60)}...`);
      }
    });

    page.on('requestfailed', request => {
      console.log(`  ❌ FAILED: ${request.url().substring(0, 80)}`);
      console.log(`     Error: ${request.failure()?.errorText}`);
    });

    try {
      console.log(`\n  Attempting navigation (60s timeout)...`);
      const response = await page.goto(url, {
        timeout: 60000,
        waitUntil: 'domcontentloaded',
      });

      console.log(`\n  ✅ Initial response received:`);
      console.log(`     Status: ${response?.status()}`);
      console.log(`     Final URL: ${page.url()}`);

      // 等待一小段时间看是否有 JS 重定向
      await page.waitForTimeout(2000);

      const finalUrl = page.url();
      if (finalUrl !== url) {
        console.log(`\n  🔄 Redirected to: ${finalUrl}`);
      }

      const html = await page.content();
      console.log(`\n  HTML length: ${html.length} bytes`);

      // 检查页面内容
      if (html.includes('403') || html.includes('Forbidden')) {
        console.log(`  ⚠️  Page contains 403/Forbidden text`);
      }
      if (html.includes('Access Denied')) {
        console.log(`  ⚠️  Page contains "Access Denied"`);
      }
      if (html.includes('challenge')) {
        console.log(`  ⚠️  Page contains "challenge"`);
      }

      // 截图
      const screenshot = await page.screenshot({ path: `./amd-test-${Date.now()}.png`, fullPage: false });
      console.log(`\n  📸 Screenshot saved`);

    } catch (err) {
      console.log(`\n  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await context.close();
    }
  }

  // 测试使用不同配置
  console.log(`\n\n═══════════════════════════════════════`);
  console.log(`Testing with different configurations`);
  console.log(`═══════════════════════════════════════`);

  // 测试1: 不使用任何自定义配置
  console.log(`\n[Test 1] Bare browser (no custom config):`);
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  try {
    const response = await page1.goto('https://www.amd.com', { timeout: 30000, waitUntil: 'domcontentloaded' });
    console.log(`     Status: ${response?.status()}`);
    console.log(`     Final URL: ${page1.url()}`);
  } catch (err) {
    console.log(`     ❌ ${err instanceof Error ? err.message : String(err)}`);
  }
  await context1.close();

  // 测试2: 使用代理
  console.log(`\n[Test 2] With proxy (if available):`);
  // 跳过，因为没有可用代理

  // 测试3: 使用真实 Chrome channel
  console.log(`\n[Test 3] Real Chrome browser:`);
  const context3 = await browser.newContext({
    channel: 'chrome',  // 使用真实安装的 Chrome
  });
  const page3 = await context3.newPage();
  try {
    const response = await page3.goto('https://www.amd.com', { timeout: 30000, waitUntil: 'domcontentloaded' });
    console.log(`     Status: ${response?.status()}`);
    console.log(`     Final URL: ${page3.url()}`);
  } catch (err) {
    console.log(`     ❌ ${err instanceof Error ? err.message : String(err)}`);
  }
  await context3.close();

  await browser.close();
}

diagnoseAMD().catch(console.error);
