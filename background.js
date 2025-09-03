// 时间工具函数
const TimeUtils = {
    getMilliseconds: (hours, minutes, seconds) => {
        minutes += hours * 60
        seconds += minutes * 60
        return seconds * 1000
    },
    parseMilliseconds: (milliseconds) => {
        const SECOND = 1000
        const MINUTE = 60 * SECOND
        const HOUR = 60 * MINUTE
        const hours = padZero(Math.floor(milliseconds/ HOUR))
        const minutes = padZero(Math.floor((milliseconds % HOUR) / MINUTE))
        const seconds = padZero(Math.floor((milliseconds % MINUTE) / SECOND))
        return `${hours}:${minutes}:${seconds}`
    },
};

// 补0，如1 -> 01
function padZero(num, targetLength = 2) {
    let str = `${num}`
    while (str.length < targetLength) {
        str = `0${str}`
    }
    return str
}

// UI 工具函数
function showNotification(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '事件倒计时提醒',
        message
    });
}

// 事件检查
async function checkEvents() {
}

// 初始化扩展
async function initializeExtension() {
    // 立即检查一次事件
    await checkEvents();
    
    // 设置定时检查（每小时）
    // chrome.alarms.create('checkEvents', {
    //     periodInMinutes: 60
    // });
    
    // // 设置更频繁的检查（每5分钟）用于保持服务工作进程活跃
    // chrome.alarms.create('keepAlive', {
    //     periodInMinutes: 5
    // });
}

// 监听浏览器启动
chrome.runtime.onStartup.addListener(initializeExtension);

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(initializeExtension);

// 监听定时器
chrome.alarms.onAlarm.addListener((alarm) => {
    // if (alarm.name === 'checkEvents') {
    //     checkEvents();
    // } else if (alarm.name === 'keepAlive') {
    //     // 保持服务工作进程活跃
    //     chrome.storage.local.get(['events'], () => {});
    // }
});

// 监听扩展图标点击
chrome.action.onClicked.addListener(() => {
    checkEvents();
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'TIME_START') {
        await timeManager.start(message.id)
    } else if (message.type === 'TIME_PAUSE') {
        await timeManager.pause(message.id)
    } else if (message.type === 'ADD_EVENT') {
        await timeManager.addEvent(message.name, message.date)
        chrome.runtime.sendMessage({ type: 'ADD_SUCCESS' });
    } else if (message.type === 'DELETE_EVENT') {
        await timeManager.deleteEvent(message.id)
    }
});

// 初始化
initializeExtension();

// 事件管理
const timeManager = {
    async getEvents() {
        const result = await chrome.storage.local.get(['events']);
        return result.events || [];
    },
    
    async getNextEvent() {
        const result = await chrome.storage.local.get(['nextEvent']);
        return result.nextEvent;
    },
    
    async getEndTime() {
        const result = await chrome.storage.local.get(['endTime']);
        return result.endTime || 0;
    },
    
    async getTimer() {
        const result = await chrome.storage.local.get(['timer']);
        return result.timer;
    },
    
    async saveEvents(events) {
        await chrome.storage.local.set({ events });
    },
    
    async saveNextEvent(nextEvent) {
        await chrome.storage.local.set({ nextEvent });
    },
    
    async saveEndTime(endTime) {
        await chrome.storage.local.set({ endTime });
    },
    
    async saveTimer(timer) {
        await chrome.storage.local.set({ timer });
    },
    
    async addEvent(name, date) {
        if (!name) {
            alert('请填写定时事件名称！');
            return;
        }

        if (!date || date === '00:00:00') {
            alert('请填写定时事件时间！');
            return;
        }
        
        const milliseconds = TimeUtils.getMilliseconds(...date.split(':').map(Number))
        const events = await this.getEvents();
        const newEvent = {
            id: Date.now() + 'event',
            name,
            milliseconds,
            downTime: date,
            show: false,
            open: false,
            defaultDate: date
        };
        
        // 最多只能保存3个事件
        if (events.length > 2) {
            const head = events.shift()
            const nextEvent = await this.getNextEvent();
            if (nextEvent && nextEvent.id === head.id) {
                await this.saveNextEvent(null);
            }
        }
        events.push(newEvent);
        await this.saveEvents(events)
    },
    
    async deleteEvent(id) {
        const events = await this.getEvents();
        const filteredEvents = events.filter(event => event.id !== id);
        const nextEvent = await this.getNextEvent();
        if (nextEvent && nextEvent.id === id) {
            await this.clearTimeout()
            await this.saveNextEvent(null);
        }
        await this.saveEvents(filteredEvents)
        // showNotification('事件已删除');
    },
    
    async clearTimeout() {
        const timer = await this.getTimer()
        clearTimeout(timer)
        await this.saveTimer(null)
    },
    
    // 开始倒计时
    async start(id) {
        await this.clearTimeout()
        const events = await this.getEvents();
        const filteredEvent = events.filter(event => event.id === id)[0];
        if (!filteredEvent) return
        // nextEvent 存在，但是肯定点击开始的不是 nextEvent，需要把 前nextEvent 时间重置
        let nextEvent = await this.getNextEvent();
        if (nextEvent && nextEvent.id !== id) {
            const filteredNextEvent = events.filter(event => event.id === nextEvent.id)[0];
            if (!filteredNextEvent) return
            const mills = TimeUtils.getMilliseconds(...filteredNextEvent.defaultDate.split(':').map(Number))
            filteredNextEvent.milliseconds = mills
            filteredNextEvent.downTime = TimeUtils.parseMilliseconds(mills);
        }
        nextEvent = filteredEvent
        await this.saveNextEvent(nextEvent);
        if (nextEvent.milliseconds === 0) {
            const milliseconds = TimeUtils.getMilliseconds(...nextEvent.defaultDate.split(':').map(Number))
            nextEvent.milliseconds = milliseconds
            nextEvent.downTime = nextEvent.defaultDate
            await this.saveNextEvent(nextEvent);
        }
        for(let i = 0;i < events.length;i++) {
            if (events[i].id === id) {
                events[i].show = true
                events[i].open = true
            } else {
                events[i].show = false
                events[i].open = false
            }
        }
        await this.saveEvents(events)
        await this.saveNextEvent(nextEvent);
        // 结束时间戳 = 此刻时间戳 + 剩余的时间
        const endTime = Date.now() + nextEvent.milliseconds
        await this.saveEndTime(endTime)
        await this.macroTick()
    },
    
    // 暂停倒计时
    async pause(id) {
        await this.clearTimeout()
        const nextEvent = await this.getNextEvent();
        if (nextEvent && nextEvent.milliseconds < 1000) {
            await this.end()
            return
        }
        const events = await this.getEvents();
        const index = events.findIndex(event => event.id === id);
        if (index !== -1) {
            nextEvent.open = false
            await this.saveNextEvent(nextEvent);
            events[index] = nextEvent
            await this.saveEvents(events)
        }
    },
    
    // 定时器
    async macroTick() {
        // 每隔一定时间，更新一遍定时器的值
        const timer = setTimeout(async () => {
            // 获取剩余时间
            const remain = await this.getRemainTime()
            // 如果时间已到，停止倒计时
            if (remain === 0) {
                await this.end()
            // 重设剩余时间
            } else {
                const nextEvent = await this.getNextEvent();
                if (nextEvent && !this.isSameSecond(remain, nextEvent.milliseconds)) {
                    nextEvent.milliseconds = remain
                    nextEvent.downTime = TimeUtils.parseMilliseconds(remain);
                    await this.saveNextEvent(nextEvent);
                    chrome.runtime.sendMessage({ type: 'UPDATE_NEXT' });
                }
                await this.macroTick()
            }
        }, 30)
        await this.saveTimer(timer)
    },
    // 获取剩余的时间
    isSameSecond(time1, time2) {
        return Math.floor(time1 / 1000) === Math.floor(time2 / 1000)
    },
    // 获取剩余的时间
    async getRemainTime() {
        const endTime = await this.getEndTime()
        // 取最大值，防止出现小于0的剩余时间值
        return Math.max(endTime - Date.now(), 0)
    },
    // 结束第一轮倒计时
    async end() {
        await this.clearTimeout()
        const events = await this.getEvents();
        const filteredEvent = events.filter(event => event.open)[0];
        if (!filteredEvent) return
        // 暂停
        // filteredEvent.open = false
        filteredEvent.milliseconds = 0
        filteredEvent.downTime = '00:00:00'
        await this.saveEvents(events)
        showNotification(filteredEvent.name);
        this.start(filteredEvent.id)
    },
};