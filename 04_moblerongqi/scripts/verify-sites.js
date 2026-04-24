/**
 * 站点验证脚本
 *
 * 使用 Playwright 测试各个站点的可访问性，分析反爬情况
 *
 * 运行: npx tsx scripts/verify-sites.ts
 */
import { chromium } from 'playwright';
import { deviceProfiles, buildInitScript } from '../packages/core/src/index.js';
// 测试站点列表
const TEST_SITES = [
    // 硬件厂商 (已知有反爬)
    { name: 'MSI', url: 'https://www.msi.com/Motherboard/all-series', expected: 'akamai' },
    { name: '技嘉', url: 'https://www.gigabyte.com/Motherboard/All-products', expected: 'akamai' },
    { name: '海盗船', url: 'https://www.corsair.com/us/en/cases', expected: 'akamai' },
    { name: '索泰', url: 'https://www.zotac.com/us/mini-pcs/products', expected: 'cloudflare' },
    { name: '金士顿', url: 'https://www.kingston.com/ssd', expected: 'cloudflare' },
    // 对照组 (无反爬或轻反爬)
    { name: 'Intel', url: 'https://www.intel.com', expected: 'none' },
    { name: 'AMD', url: 'https://www.amd.com', expected: 'none' },
    { name: '希捷', url: 'https://www.seagate.com', expected: 'none' },
    { name: 'Steam', url: 'https://store.steampowered.com', expected: 'light' },
    // 中国平台
    { name: '抖音', url: 'https://www.douyin.com', expected: 'strict' },
    { name: '小红书', url: 'https://www.xiaohongshu.com', expected: 'strict' },
    { name: 'Bilibili', url: 'https://www.bilibili.com', expected: 'light' },
];
// 检测反爬特征
const BLOCK_PATTERNS = {
    akamai: [
        /Reference\s*#\s*[\d]+\.[0-9a-f]+\.\d+\.[0-9a-f]+/i,
        /Pardon\s+Our\s+Interruption/i,
    ],
    cloudflare: [
        /<span\s+class="cf-error-code">\d{4}<\/span>/i,
        /Checking\s+your\s+browser/i,
        /<title>\s*Just\s+a\s+Moment/i,
        /\/cdn-cgi\/challenge-platform\//i,
    ],
    perimeterx: [
        /window\._pxAppId\s*=/i,
        /captcha\.px-cdn\.net/i,
    ],
    imperva: [
        /_Incapsula_Resource/i,
        /Incapsula\s+incident\s+ID/i,
    ],
    datadome: [
        /captcha-delivery\.com/i,
    ],
};
async function testSite(browser, site) {
    const startTime = Date.now();
    const result = {
        site: site.name,
        url: site.url,
        status: 'error',
        statusCode: 0,
        htmlLength: 0,
        blockedBy: [],
        duration: 0,
    };
    let context = null;
    let page = null;
    try {
        // 使用桌面 Windows Chrome 配置
        const profile = deviceProfiles.desktop_win10_chrome;
        const initScript = buildInitScript(profile);
        context = await browser.newContext({
            locale: profile.language,
            timezoneId: profile.timezone,
            viewport: { width: profile.viewport.width, height: profile.viewport.height },
            userAgent: profile.userAgent,
        });
        // 注入指纹脚本
        await context.addInitScript(initScript);
        page = await context.newPage();
        // 导航
        const response = await page.goto(site.url, {
            timeout: 60000,
            waitUntil: 'networkidle',
        });
        result.duration = Date.now() - startTime;
        result.statusCode = response?.status() ?? 0;
        // 获取 HTML
        const html = await page.content();
        result.htmlLength = html.length;
        // 检测反爬
        for (const [blocker, patterns] of Object.entries(BLOCK_PATTERNS)) {
            for (const pattern of patterns) {
                if (pattern.test(html)) {
                    result.blockedBy.push(blocker);
                    result.status = 'blocked';
                    break;
                }
            }
            if (result.blockedBy.length > 0)
                break;
        }
        if (result.status !== 'blocked') {
            result.status = 'success';
        }
        // 截图
        if (result.status !== 'success') {
            result.screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 50 });
        }
    }
    catch (err) {
        result.duration = Date.now() - startTime;
        result.error = err instanceof Error ? err.message : String(err);
        result.status = 'error';
        if (page) {
            try {
                result.screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 50 });
            }
            catch { }
        }
    }
    finally {
        if (page)
            await page.close();
        if (context)
            await context.close();
    }
    return result;
}
async function main() {
    console.log('🚀 开始站点验证测试...\n');
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
    });
    const results = [];
    for (const site of TEST_SITES) {
        console.log(`Testing: ${site.name} (${site.url})`);
        const result = await testSite(browser, site);
        results.push(result);
        // 打印结果
        const icon = result.status === 'success' ? '✅' : result.status === 'blocked' ? '❌' : '⚠️';
        console.log(`  ${icon} Status: ${result.status}, Code: ${result.statusCode}, HTML: ${result.htmlLength} bytes, Time: ${result.duration}ms`);
        if (result.blockedBy.length > 0) {
            console.log(`     Blocked by: ${result.blockedBy.join(', ')}`);
        }
        if (result.error) {
            console.log(`     Error: ${result.error}`);
        }
        console.log('');
        // 每个站点间隔 2 秒
        await new Promise(r => setTimeout(r, 2000));
    }
    await browser.close();
    // 汇总
    console.log('\n═══════════════════════════════════════════════');
    console.log('                    测试汇总');
    console.log('═══════════════════════════════════════════════\n');
    const success = results.filter(r => r.status === 'success');
    const blocked = results.filter(r => r.status === 'blocked');
    const errors = results.filter(r => r.status === 'error');
    console.log(`总计: ${results.length} 个站点`);
    console.log(`✅ 成功: ${success.length}`);
    console.log(`❌ 被拦截: ${blocked.length}`);
    console.log(`⚠️ 错误: ${errors.length}\n`);
    if (blocked.length > 0) {
        console.log('被拦截的站点:');
        for (const r of blocked) {
            console.log(`  - ${r.site} (${r.url})`);
            console.log(`    拦截类型: ${r.blockedBy.join(', ')}`);
        }
        console.log('');
    }
    if (errors.length > 0) {
        console.log('错误的站点:');
        for (const r of errors) {
            console.log(`  - ${r.site}: ${r.error}`);
        }
        console.log('');
    }
    // 按反爬类型分组
    console.log('═══════════════════════════════════════════════');
    console.log('                 按反爬类型分组');
    console.log('═══════════════════════════════════════════════\n');
    const groups = {};
    for (const r of results) {
        const group = r.blockedBy[0] || (r.status === 'success' ? 'success' : 'error');
        if (!groups[group])
            groups[group] = [];
        groups[group].push(r);
    }
    for (const [group, items] of Object.entries(groups)) {
        console.log(`【${group.toUpperCase()}】 ${items.length} 个站点`);
        for (const item of items) {
            console.log(`  - ${item.site}: ${item.statusCode} (${item.htmlLength} bytes)`);
        }
        console.log('');
    }
    // 保存详细结果
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: results.length,
            success: success.length,
            blocked: blocked.length,
            error: errors.length,
        },
        results,
    };
    console.log('详细结果已保存到: site-verification-report.json');
}
main().catch(console.error);
//# sourceMappingURL=verify-sites.js.map