// 时间工具函数
const TimeUtils = {
  getMilliseconds: (hours, minutes, seconds) => {
    minutes += hours * 60;
    seconds += minutes * 60;
    return seconds * 1000;
  },
  parseMilliseconds: (milliseconds) => {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const hours = padZero(Math.floor(milliseconds / HOUR));
    const minutes = padZero(Math.floor((milliseconds % HOUR) / MINUTE));
    const seconds = padZero(Math.floor((milliseconds % MINUTE) / SECOND));
    return `${hours}:${minutes}:${seconds}`;
  },
};

// 补0，如1 -> 01
function padZero(num, targetLength = 2) {
  let str = `${num}`;
  while (str.length < targetLength) {
    str = `0${str}`;
  }
  return str;
}

// UI 工具函数
function showNotification(message, page) {
  chrome.notifications.clear("定时提醒Event" + page);
  // 以后在设置页设置这些
  // eventTime 与通知关联的时间戳 Date.now() + n
  // requireInteraction 通知应一直显示在屏幕上，直到用户激活或关闭通知
  // silent 静音 目前不好使，不能出声音，可能和电脑配置有关
  chrome.notifications.create("定时提醒Event" + page, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    requireInteraction: true,
    title: message,
    message: "",
  });
}

// 事件检查
async function checkNextEvent(page) {
  const pageEvent = await timeManager.getPageEvent(page);
  if (pageEvent && pageEvent.open) {
    await timeManager.startForPageEvent(pageEvent, page);
  }
}

// 初始化扩展
let flag = true;
async function initializeExtension() {
  if (flag) {
    flag = false;
    await checkNextEvent("page1");
    await checkNextEvent("page2");
    await checkNextEvent("page3");
    setTimeout(() => {
      flag = true;
    }, 1000 * 30);
  }
}

// 监听浏览器启动
chrome.runtime.onStartup.addListener(initializeExtension);

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(initializeExtension);

chrome.windows.onCreated.addListener(initializeExtension);
// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "TIME_START") {
    await timeManager.start(message.page);
    return true;
  } else if (message.type === "TIME_PAUSE") {
    await timeManager.pause(message.page);
    return true;
  } else if (message.type === "ADD_EVENT") {
    await timeManager.addEvent(message.name, message.date, message.page);
    chrome.runtime.sendMessage({ type: "ADD_SUCCESS", page: message.page });
    return true;
  } else if (message.type === "DELETE_EVENT") {
    await timeManager.deleteEvent(message.page);
    return true;
  }
});
// 事件管理
const timeManager = {
  async getTabPage() {
    const result = await chrome.storage.local.get(["tabPage"]);
    return result.tabPage || "page1";
  },

  async getPageEvent(page) {
    const result = await chrome.storage.local.get([`page_event_${page}`]);
    return result[`page_event_${page}`];
  },

  async savePageEvent(pageEvent, page) {
    await chrome.storage.local.set({ [`page_event_${page}`]: pageEvent });
  },

  async addEvent(name, date, page) {
    if (!name) {
      alert("请填写定时事件名称！");
      return;
    }

    if (!date || date === "00:00:00") {
      alert("请填写定时事件时间！");
      return;
    }

    const milliseconds = TimeUtils.getMilliseconds(
      ...date.split(":").map(Number)
    );

    const pageEvent = {
      name,
      milliseconds,
      downTime: date,
      timer: null,
      endTime: Date().now,
      open: false,
      defaultDate: date,
    };
    await this.savePageEvent(pageEvent, page);
  },

  async deleteEvent(page) {
    await this.clearTimeout(page);
    await this.savePageEvent(null, page);
  },

  async clearTimeout(page) {
    const pageEvent = await this.getPageEvent(page);
    clearTimeout(pageEvent.timer);
    pageEvent.timer = null;
    await this.savePageEvent(pageEvent, page);
  },

  // 开始倒计时
  async start(page) {
    await this.clearTimeout(page);
    const pageEvent = await this.getPageEvent(page);
    if (!pageEvent) return;
    if (pageEvent.milliseconds === 0) {
      const milliseconds = TimeUtils.getMilliseconds(
        ...pageEvent.defaultDate.split(":").map(Number)
      );
      pageEvent.milliseconds = milliseconds;
      pageEvent.downTime = pageEvent.defaultDate;
    }
    pageEvent.open = true;
    // 结束时间戳 = 此刻时间戳 + 剩余的时间
    pageEvent.endTime = Date.now() + pageEvent.milliseconds + 900;
    await this.savePageEvent(pageEvent, page);
    await this.macroTick(page);
  },

  async startForPageEvent(pageEvent, page) {
    await this.clearTimeout(page);
    if (pageEvent.milliseconds === 0) {
      const milliseconds = TimeUtils.getMilliseconds(
        ...pageEvent.defaultDate.split(":").map(Number)
      );
      pageEvent.milliseconds = milliseconds;
      pageEvent.downTime = pageEvent.defaultDate;
      // 结束时间戳 = 此刻时间戳 + 剩余的时间
      const endTime = Date.now() + pageEvent.milliseconds + 900;
      pageEvent.endTime = endTime;
      await this.savePageEvent(pageEvent, page);
    }
    await this.savePageEvent(pageEvent, page);
    await this.macroTick(page);
  },

  // 暂停倒计时
  async pause(page) {
    await this.clearTimeout(page);
    const pageEvent = await this.getPageEvent(page);
    if (pageEvent && pageEvent.milliseconds < 1000) {
      await this.end(page);
      return;
    }
    if (pageEvent) {
      pageEvent.open = false;
      await this.savePageEvent(pageEvent, page);
    }
  },

  // 定时器
  async macroTick(page) {
    // 每隔一定时间，更新一遍定时器的值
    const timer = setTimeout(async () => {
      // 获取剩余时间
      const remain = await this.getRemainTime(page);
      // 如果时间已到，停止倒计时
      if (remain === 0) {
        await this.end(page);
        // 重设剩余时间
      } else {
        const pageEvent = await this.getPageEvent(page);
        if (pageEvent && !this.isSameSecond(remain, pageEvent.milliseconds)) {
          pageEvent.milliseconds = remain;
          pageEvent.downTime = TimeUtils.parseMilliseconds(remain);
          await this.savePageEvent(pageEvent, page);
          chrome.runtime.sendMessage({ type: "UPDATE_NEXT", page });
        }
        await this.macroTick(page);
      }
    }, 30);
    const pageEvent = await this.getPageEvent(page);
    pageEvent.timer = timer;
    await this.savePageEvent(pageEvent, page);
  },
  // 获取剩余的时间
  isSameSecond(time1, time2) {
    return Math.floor(time1 / 1000) === Math.floor(time2 / 1000);
  },
  // 获取剩余的时间
  async getRemainTime(page) {
    const pageEvent = await this.getPageEvent(page);
    const endTime = pageEvent.endTime;
    // 取最大值，防止出现小于0的剩余时间值
    return Math.max(endTime - Date.now(), 0);
  },
  // 结束第一轮倒计时
  async end(page) {
    await this.clearTimeout(page);
    const pageEvent = await this.getPageEvent(page);
    if (!pageEvent) return;
    // 暂停
    // filteredEvent.open = false
    pageEvent.milliseconds = 0;
    pageEvent.downTime = "00:00:00";
    await this.savePageEvent(pageEvent, page);
    showNotification(pageEvent.name, page);
    this.startForPageEvent(pageEvent, page);
  },
};
