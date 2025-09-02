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

// 事件管理
const eventManager = {
    // 当前显示的事件
    nextEvent: null,

    async getEvents() {
        const result = await chrome.storage.local.get(['events']);
        return result.events || [];
    },
    
    async saveEvents(events) {
        await chrome.storage.local.set({ events });
        this.updateUI(events);
        
        // 通知后台脚本更新徽章
        // chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', events });
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
        
        const events = await this.getEvents();
        const milliseconds = TimeUtils.getMilliseconds(...date.split(':').map(Number))
        const newEvent = {
            id: Date.now() + 'event',
            name,
            milliseconds,
            show: true,
            open: false,
            defaultDate: date
        };
        
        for(let i = 0;i < events.length;i++) {
            events[i].show = false
            events[i].open = false
        }
        events.push(newEvent);
        this.nextEvent = newEvent
        // 最多只能保存3个事件
        if (events.length > 3) {
            const head = events.shift()
            if (this.nextEvent && this.nextEvent.id === head.id) {
                this.nextEvent = null
            }
        }
        await this.saveEvents(events);
        return true;
    },
    
    async deleteEvent(id) {
        const events = await this.getEvents();
        const filteredEvents = events.filter(event => event.id !== id);
        if (this.nextEvent && this.nextEvent.id === id) {
            this.nextEvent = null
            this.clearTimeout()
        }
        await this.saveEvents(filteredEvents);
        // showNotification('事件已删除');
    },
    
    updateUI(events) {
        this.displayEvents(events);
        this.updateNextEvent();
    },
    
    displayEvents(events) {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        
        events.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'event-item';
                let toggle = `<button class="start-btn" data-id="${event.id}">开始</button>`
                if (event.open) {
                    toggle = `<button class="pause-btn" data-id="${event.id}">暂停</button>`
                }
                eventElement.innerHTML = `
                    <div class="event-name">${event.name}</div>
                    <div class="event-countdown">${event.defaultDate}</div>
                    <div class="event-btn">
                    ${toggle}
                    <button class="delete-btn" title="删除" data-id="${event.id}">×</button>
                    </div>
                `;
                    // <button class="delete-btn" data-id="${event.id}">删除</button>
                eventsList.appendChild(eventElement);
            });
    },
    
    updateNextEvent() {
        const nextEventName = document.getElementById('nextEventName');
        const nextEventCountdown = document.getElementById('nextEventCountdown');
        
        if (this.nextEvent) {
            const downTime = TimeUtils.parseMilliseconds(this.nextEvent.milliseconds);
            nextEventName.textContent = this.nextEvent.name;
            nextEventCountdown.textContent = downTime;
        } else {
            nextEventName.textContent = '暂无事件';
            nextEventCountdown.textContent = '--';
        }
    },
    
    timer: null,
    endTime: 0, // 结束的毫秒时间戳
    
    clearTimeout() {
        clearTimeout(this.timer)
        this.timer = null
    },
    
    // 开始倒计时
    async start(id) {
        this.clearTimeout()
        const events = await this.getEvents();
        const filteredEvent = events.filter(event => event.id === id)[0];
        if (!filteredEvent) return
        // nextEvent 存在，但是肯定点击开始的不是 nextEvent，需要把 nextEvent 时间重置
        if (this.nextEvent && this.nextEvent.id !== id) {
            const filteredNextEvent = events.filter(event => event.id === this.nextEvent.id)[0];
            if (!filteredNextEvent) return
            const mills = TimeUtils.getMilliseconds(...filteredNextEvent.defaultDate.split(':').map(Number))
            filteredNextEvent.milliseconds = mills
        }
        this.nextEvent = filteredEvent
        if (this.nextEvent.milliseconds === 0) {
            const milliseconds = TimeUtils.getMilliseconds(...this.nextEvent.defaultDate.split(':').map(Number))
            this.nextEvent.milliseconds = milliseconds
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
        await this.saveEvents(events);
        // 结束时间戳 = 此刻时间戳 + 剩余的时间
        this.endTime = Date.now() + this.nextEvent.milliseconds
        await this.macroTick()
    },
    
    // 暂停倒计时
    async pause(id) {
        this.clearTimeout()
        const events = await this.getEvents();
        const index = events.findIndex(event => event.id === id);
        if (index !== -1) {
            this.nextEvent.show = true
            this.nextEvent.open = false
            events[index] = this.nextEvent
            await this.saveEvents(events);
        }
    },
    
    // 定时器
    async macroTick() {
        // 每隔一定时间，更新一遍定时器的值
        this.timer = setTimeout(async () => {
            // 获取剩余时间
            const remain = this.getRemainTime()
            // 如果时间已到，停止倒计时
            if (remain === 0) {
                this.nextEvent.milliseconds = 0
                await this.end()
            // 重设剩余时间
            } else {
                if (!this.isSameSecond(remain, this.nextEvent.milliseconds)) {
                    this.nextEvent.milliseconds = remain
                    this.updateNextEvent();
                }
                await this.macroTick()
            }
        }, 30)
    },
    // 获取剩余的时间
    isSameSecond(time1, time2) {
        return Math.floor(time1 / 1000) === Math.floor(time2 / 1000)
    },
    // 获取剩余的时间
    getRemainTime() {
        // 取最大值，防止出现小于0的剩余时间值
        return Math.max(this.endTime - Date.now(), 0)
    },
    // 暂停倒计时
    async end() {
        const events = await this.getEvents();
        const filteredEvent = events.filter(event => event.id = this.nextEvent.id)[0];
        if (!filteredEvent) return
        // 暂停
        filteredEvent.open = false
        filteredEvent.milliseconds = this.nextEvent.milliseconds
        await this.saveEvents(events);
        showNotification(filteredEvent.name);
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

function clearForm() {
    document.getElementById('eventName').value = '';
    document.getElementById('eventTime').value = '';
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {    
    // 加载事件
    const events = await eventManager.getEvents();
    eventManager.updateUI(events);
    
    // 设置事件监听
    document.getElementById('addEventBtn').addEventListener('click', async () => {
        document.getElementById('addEventForm').classList.remove('hidden');
        document.getElementById('addEventBtn').classList.add('hidden');
        const result = await chrome.storage.sync.get(['defaultDate']);
        const defaultDate = result.defaultDate || "00:01:00";
        flatpickr("#eventTime", {
            enableTime: true,
            enableSeconds: true,
            noCalendar: true,
            dateFormat: "H:i:S",
            time_24hr: true,
            defaultDate,
        });
    });
    
    document.getElementById('cancelAdd').addEventListener('click', () => {
        document.getElementById('addEventForm').classList.add('hidden');
        document.getElementById('addEventBtn').classList.remove('hidden');
        clearForm();
    });
    
    document.getElementById('confirmAdd').addEventListener('click', async () => {
        const eventName = document.getElementById('eventName').value
        const eventTime = document.getElementById('eventTime').value
        const success = await eventManager.addEvent(eventName, eventTime);
        
        if (success) {
            // 保存用户习惯设置定时时间
            await chrome.storage.sync.set({ defaultDate: eventTime });
            document.getElementById('addEventForm').classList.add('hidden');
            document.getElementById('addEventBtn').classList.remove('hidden');
            clearForm();
            // showNotification('事件已添加');
        }
    });
    
    document.getElementById('eventsList').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            await eventManager.deleteEvent(e.target.dataset.id);
        } else if (e.target.classList.contains('start-btn')) {
            await eventManager.start(e.target.dataset.id);
        } else if (e.target.classList.contains('pause-btn')) {
            await eventManager.pause(e.target.dataset.id);
        }
    });
});