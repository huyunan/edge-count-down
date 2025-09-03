// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.events) {
        eventManager.updateUI(changes.events.newValue);
    }
});

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'UPDATE_NEXT') {
        eventManager.updateNextEvent()
    } else if (message.type === 'ADD_SUCCESS') {
        // 保存用户习惯设置定时时间
        const eventTime = document.getElementById('eventTime').value
        await chrome.storage.sync.set({ defaultDate: eventTime });
        document.getElementById('addEventForm').classList.add('hidden');
        document.getElementById('addEventBtn').classList.remove('hidden');
        clearForm();
    }
});
// 事件管理
const eventManager = {
    async getEvents() {
        const result = await chrome.storage.local.get(['events']);
        return result.events || [];
    },
    
    async getNextEvent() {
        const result = await chrome.storage.local.get(['nextEvent']);
        return result.nextEvent;
    },
    
    updateUI(events) {
        this.displayEvents(events);
        this.updateNextEvent();
    },
    
    displayEvents(events) {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        
        events.forEach(async event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'event-item';
                const nextEvent = await this.getNextEvent()
                if (nextEvent && event.id === nextEvent.id) {
                    eventElement.className += ' event-item-active'
                }
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
                eventsList.appendChild(eventElement);
            });
    },
    
    async updateNextEvent() {
        const nextEventName = document.getElementById('nextEventName');
        const nextEventCountdown = document.getElementById('nextEventCountdown');
        
        const nextEvent = await this.getNextEvent()
        if (nextEvent) {
            nextEventName.textContent = nextEvent.name;
            nextEventCountdown.textContent = nextEvent.downTime;
        } else {
            nextEventName.textContent = '暂无事件';
            nextEventCountdown.textContent = '--';
        }
    },
};

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
        await chrome.runtime.sendMessage({ type: 'ADD_EVENT', name: eventName, date: eventTime });
    });
    
    document.getElementById('eventsList').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            await chrome.runtime.sendMessage({ type: 'DELETE_EVENT', id: e.target.dataset.id });
        } else if (e.target.classList.contains('start-btn')) {
            await chrome.runtime.sendMessage({ type: 'TIME_START', id: e.target.dataset.id });
        } else if (e.target.classList.contains('pause-btn')) {
            await chrome.runtime.sendMessage({ type: 'TIME_PAUSE', id: e.target.dataset.id });
        }
    });
});