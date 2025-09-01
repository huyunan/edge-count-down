// 日期工具函数
const TimeUtils = {
    setMidnight: (date) => {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    },
    calculateDays: (targetDate) => {
        const now = TimeUtils.setMidnight(new Date());
        const target = TimeUtils.setMidnight(targetDate);
        return Math.floor((target - now) / (1000 * 60 * 60 * 24));
    }
};

// 通知管理
const notificationManager = {
    create(id, title, message) {
        chrome.notifications.create(id, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title,
            message,
            priority: 2
        });
    }
};

// 事件检查
async function checkEvents() {
    try {
        const result = await chrome.storage.local.get(['events']);
        const events = result.events || [];
        const now = new Date();
        
        // 过滤并排序未来事件
        const futureEvents = events
            .filter(event => new Date(event.date) > now)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 更新徽章
        if (futureEvents.length > 0) {
            const nextEvent = futureEvents[0];
            const days = TimeUtils.calculateDays(nextEvent.date);
            
            // 检查是否需要发送通知（1天内）
            const timeLeft = new Date(nextEvent.date) - now;
            if (timeLeft > 0 && timeLeft <= 24 * 60 * 60 * 1000) {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                notificationManager.create(
                    `event-${nextEvent.id}`,
                    '倒计时提醒',
                    `${nextEvent.name} 还剩 ${hours} 小时！`
                );
            }
            
            // 检查是否需要发送一周提醒
            if (days <= 7 && days > 0) {
                notificationManager.create(
                    `week-${nextEvent.id}`,
                    '事件倒计时提醒',
                    `${nextEvent.name} 将在 ${days} 天后到来`
                );
            }
        }
    } catch (error) {
        console.error('检查事件时出错:', error);
    }
}

// 初始化扩展
async function initializeExtension() {
    // 立即检查一次事件
    await checkEvents();
    
    // 设置定时检查（每小时）
    chrome.alarms.create('checkEvents', {
        periodInMinutes: 60
    });
    
    // 设置更频繁的检查（每5分钟）用于保持服务工作进程活跃
    chrome.alarms.create('keepAlive', {
        periodInMinutes: 5
    });
}

// 监听浏览器启动
chrome.runtime.onStartup.addListener(initializeExtension);

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(initializeExtension);

// 监听定时器
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkEvents') {
        checkEvents();
    } else if (alarm.name === 'keepAlive') {
        // 保持服务工作进程活跃
        chrome.storage.local.get(['events'], () => {});
    }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.events) {
        checkEvents();
    }
});

// 监听扩展图标点击
chrome.action.onClicked.addListener(() => {
    checkEvents();
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.events) {
    }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_BADGE') {
    }
});

// 定期检查并更新徽章
chrome.alarms.create('updateBadge', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateBadge') {
    }
});

// 初始化
initializeExtension(); 