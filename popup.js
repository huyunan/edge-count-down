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

        const milliseconds = TimeUtils.getMilliseconds(...date.split(':').map(Number))
        if (milliseconds < 30 * 1000) {
            alert('定时事件时间太短！');
            return;
        }
        
        const events = await this.getEvents();
        const newEvent = {
            id: Date.now() + 'event',
            name,
            milliseconds,
            show: '0',  // '0' 在主栏隐藏，'1' 在主栏显示，'2' 开始，'3' 暂停
            defaultDate: date,
            date: date
        };
        
        for(let i = 0;i < events.length;i++) {
            events[i].show = '0'
        }
        events.push(newEvent);
        await this.saveEvents(events);
        return true;
    },
    
    async deleteEvent(id) {
        const events = await this.getEvents();
        const filteredEvents = events.filter(event => event.id === id);
        await this.saveEvents(filteredEvents);
        // showNotification('事件已删除');
    },
    
    updateUI(events) {
        this.displayEvents(events);
        this.updateNextEvent(events);
    },
    
    displayEvents(events) {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        
        events.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'event-item';
                eventElement.innerHTML = `
                    <div class="event-name">${event.name}</div>
                    <div class="event-countdown">${event.defaultDate}</div>
                    <div class="event-btn">
                    <button class="toggle-btn" data-id="${event.id}">${event.show === '3' ? '暂停' : '开始'}</button>
                    <button class="delete-btn" title="删除" data-id="${event.id}">×</button>
                    </div>
                `;
                    // <button class="delete-btn" data-id="${event.id}">删除</button>
                eventsList.appendChild(eventElement);
            });
    },
    
    updateNextEvent(events) {
        // todo
        const nextEvent = events.filter(evn => evn.show !== '0')[0];
            
        const nextEventName = document.getElementById('nextEventName');
        const nextEventCountdown = document.getElementById('nextEventCountdown');
        
        if (nextEvent) {
            const downTime = TimeUtils.parseMilliseconds(nextEvent.milliseconds);
            nextEventName.textContent = nextEvent.name;
            nextEventCountdown.textContent = downTime;
        } else {
            nextEventName.textContent = '暂无事件';
            nextEventCountdown.textContent = '--';
        }
    },
    
    // 开始倒计时
    async start(id) {
        const events = await this.getEvents();
        const filteredEvent = events.filter(event => event.id === id)[0];
        if (!filteredEvent) return
        // 暂停
        if (filteredEvent.show === '3') {
            filteredEvent.show === '2'
        } else {
            for(let i = 0;i < events.length;i++) {
                if (events[i].id === id) {
                    events[i].show = '3'
                } else {
                    events[i].show = '0'
                }
            }
            await this.saveEvents(events);
        }
        // 结束时间戳 = 此刻时间戳 + 剩余的时间
        // this.endTime = Date.now() + this.remainTime
        // this.toTick()
    }
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
        const defaultDate = result.defaultDate || "01:00:00";
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
        } else if (e.target.classList.contains('toggle-btn')) {
            await eventManager.start(e.target.dataset.id);
        }
    });
});

// 定期更新倒计时显示
// setInterval(async () => {
//     const events = await eventManager.getEvents();
//     eventManager.updateUI(events);
// }, 60000); 