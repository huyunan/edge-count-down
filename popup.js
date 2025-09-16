// 当前 tab 页
let tabPage = "page1";

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === "local" && changes["page_event_page1"]) {
    eventManager.displayEvents("page1", changes["page_event_page1"].newValue);
    eventManager.updatePageEvent("page1", changes["page_event_page1"].newValue);
  } else if (namespace === "local" && changes["page_event_page2"]) {
    eventManager.displayEvents("page2", changes["page_event_page2"].newValue);
    eventManager.updatePageEvent("page2", changes["page_event_page2"].newValue);
  } else if (namespace === "local" && changes["page_event_page3"]) {
    eventManager.displayEvents("page3", changes["page_event_page3"].newValue);
    eventManager.updatePageEvent("page3", changes["page_event_page3"].newValue);
  }
});

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "UPDATE_NEXT") {
    if (message.page !== tabPage) return;
    const pageEvent = await eventManager.getPageEvent(message.page);
    eventManager.updatePageEvent(message.page, pageEvent);
    return true;
  } else if (message.type === "ADD_SUCCESS") {
    const eventTime = document.getElementById("eventTime").value;
    await chrome.storage.sync.set({ defaultDate: eventTime });
    // 保存用户习惯设置定时时间
    if (message.page !== tabPage) return;
    const pageEvent = await eventManager.getPageEvent(message.page);
    eventManager.displayEvents(message.page, pageEvent);
    eventManager.updatePageEvent(message.page, pageEvent);
    document.getElementById("addEventForm").classList.add("hidden");
    document.getElementById("addEventBtn").classList.remove("hidden");
    clearForm();
    return true;
  }
});
// 事件管理
const eventManager = {
  async getTabPage() {
    const result = await chrome.storage.local.get(["tabPage"]);
    return result.tabPage || "page1";
  },

  async getPageEvent(page) {
    const result = await chrome.storage.local.get([`page_event_${page}`]);
    return result[`page_event_${page}`];
  },

  async saveTabPage(tabPage) {
    await chrome.storage.local.set({ tabPage });
  },

  displayEvents(page, pageEvent) {
    if (page !== tabPage) return;
    const eventsList = document.getElementById("eventsList");
    eventsList.innerHTML = "";
    if (!pageEvent) return;
    const eventElement = document.createElement("div");
    eventElement.className = "event-item";
    let toggle = `<button class="start-btn">开始</button>`;
    if (pageEvent.open) {
      toggle = `<button class="pause-btn">暂停</button>`;
    }
    eventElement.innerHTML = `
            <div class="event-name">${pageEvent.name}</div>
            <div class="event-countdown">${pageEvent.defaultDate}</div>
            <div class="event-btn">
            ${toggle}
            <button class="delete-btn" title="删除">×</button>
            </div>
        `;
    eventsList.appendChild(eventElement);
  },

  async updatePageEvent(page, pageEvent) {
    if (page !== tabPage) return;
    const pageEventName = document.getElementById("pageEventName");
    const pageEventCountdown = document.getElementById("pageEventCountdown");

    if (pageEvent) {
      pageEventName.textContent = pageEvent.name;
      pageEventCountdown.textContent = pageEvent.downTime;
    } else {
      pageEventName.textContent = "暂无事件";
      pageEventCountdown.textContent = "--";
    }
  },
};

function clearForm() {
  document.getElementById("eventName").value = "";
  document.getElementById("eventTime").value = "";
}

// 初始化
document.addEventListener("DOMContentLoaded", async () => {
  // 加载事件
  tabPage = await eventManager.getTabPage();
  const pageEvent = await eventManager.getPageEvent(tabPage);
  eventManager.displayEvents(tabPage, pageEvent);
  eventManager.updatePageEvent(tabPage, pageEvent);

  // 设置事件监听
  document.getElementById("addEventBtn").addEventListener("click", async () => {
    document.getElementById("addEventForm").classList.remove("hidden");
    document.getElementById("addEventBtn").classList.add("hidden");
    const result = await chrome.storage.sync.get(["defaultDate"]);
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

  document.getElementById("cancelAdd").addEventListener("click", () => {
    document.getElementById("addEventForm").classList.add("hidden");
    document.getElementById("addEventBtn").classList.remove("hidden");
    clearForm();
  });

  document.getElementById("confirmAdd").addEventListener("click", async () => {
    const eventName = document.getElementById("eventName").value;
    const eventTime = document.getElementById("eventTime").value;
    await chrome.runtime.sendMessage({
      type: "ADD_EVENT",
      name: eventName,
      date: eventTime,
      page: tabPage,
    });
  });

  document.getElementById("eventsList").addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn")) {
      await chrome.runtime.sendMessage({ type: "DELETE_EVENT", page: tabPage });
    } else if (e.target.classList.contains("start-btn")) {
      await chrome.runtime.sendMessage({ type: "TIME_START", page: tabPage });
    } else if (e.target.classList.contains("pause-btn")) {
      await chrome.runtime.sendMessage({ type: "TIME_PAUSE", page: tabPage });
    }
  });

  // tab 页切换
  document.getElementById("page1").addEventListener("click", async () => {
    await switchTab("page1");
  });
  // tab 页切换
  document.getElementById("page2").addEventListener("click", async () => {
    await switchTab("page2");
  });
  // tab 页切换
  document.getElementById("page3").addEventListener("click", async () => {
    await switchTab("page3");
  });
});

async function switchTab(page) {
  tabPage = page;
  await eventManager.saveTabPage(page);
  const pageEvent = await eventManager.getPageEvent(page);
  eventManager
    .updatePageEvent(page, pageEvent)
    [("page1", "page2", "page3")].forEach((pp) => {
      if (page === pp) {
        document.getElementById(pp).classList.add("aside-item-select");
      } else {
        document.getElementById(pp).classList.remove("aside-item-select");
      }
    });
}
