param(
    [switch]$Recheck,
    [switch]$LowContext
)

if ($Recheck) {
    @"
版本结论:

已解决的问题:

仍未解决的问题:

新增副作用:

当前等级变化:

下一轮修改重点:
"@
    exit 0
}

if ($LowContext) {
    @"
当前判断状态:

已观察到的结构风险:

仍缺少的关键信息:

下一步建议:
"@
    exit 0
}

@"
总体结论:

主问题层级:

关键缺陷:

影响解释:

修正优先级:

修改方向:
"@
