// 初始化
document.addEventListener("DOMContentLoaded", async () => {
    // 加载事件
    await this.updateUI('Tab1')
    // 设置事件监听
    document.getElementById("tabSelect").addEventListener("click", async () => {
        tabSelect()
    });
    document.querySelector('#tabSelect .cd-select-tab1').addEventListener("click", async (event) => {
        event.stopPropagation()
        document.querySelector('#tabSelect .t-input__inner').value = 'Tab1'
        await this.updateUI('Tab1')
        tabSelect()
    });
    document.querySelector('#tabSelect .cd-select-tab2').addEventListener("click", async (event) => {
        event.stopPropagation()
        document.querySelector('#tabSelect .t-input__inner').value = 'Tab2'
        await this.updateUI('Tab2')
        tabSelect()
    });
    document.querySelector('#tabSelect .cd-select-tab3').addEventListener("click", async (event) => {
        event.stopPropagation()
        document.querySelector('#tabSelect .t-input__inner').value = 'Tab3'
        await this.updateUI('Tab3')
        tabSelect()
    });
    document.querySelector("#cd-checkbox1").addEventListener("click", async (event) => {
        event.stopPropagation()
        if (event.target.tagName === 'SPAN') return
        document.querySelector('#cd-checkbox1').classList.toggle("t-is-checked");
    }, true);
    document.querySelector("#cd-checkbox2").addEventListener("click", async (event) => {
        event.stopPropagation()
        if (event.target.tagName === 'SPAN') return
        document.querySelector('#cd-checkbox2').classList.toggle("t-is-checked");
    }, true);
    document.querySelector("#cd-checkbox3").addEventListener("click", async (event) => {
        event.stopPropagation()
        if (event.target.tagName === 'SPAN') return
        document.querySelector('#cd-checkbox3').classList.toggle("t-is-checked");
    }, true);
    document.querySelector("#cd-radio1").addEventListener("click", async (event) => {
        event.stopPropagation()
        document.getElementById('cd-radio1').classList.add("t-is-checked");
        document.getElementById('cd-radio2').classList.remove("t-is-checked");
    }, true);
    document.querySelector("#cd-radio2").addEventListener("click", async (event) => {
        event.stopPropagation()
        document.getElementById('cd-radio1').classList.remove("t-is-checked");
        document.getElementById('cd-radio2').classList.add("t-is-checked");
    }, true);
    document.querySelector('#cd-input-time').addEventListener("input", async (event) => {
        if (event.target.validationMessage) {
            const message = event.target.validationMessage
            document.querySelector('#cd-input-time').value = ''
            createMessage(message, 't-is-warning', "M8 15A7 7 0 108 1a7 7 0 000 14zM7.4 4h1.2v1.2H7.4V4zm.1 2.5h1V12h-1V6.5z")
        }
    });
    document.querySelector('#cd-save').addEventListener("click", async (event) => {
        event.stopPropagation()
        const tab = document.querySelector('#tabSelect .t-input__inner').value
        let cdTime = document.querySelector('#cd-input-time').value
        if (!cdTime) cdTime = 10
        let check1 = false
        if (document.querySelector('#cd-checkbox1').classList.contains("t-is-checked")) check1 = true
        let check2 = false
        if (document.querySelector('#cd-checkbox2').classList.contains("t-is-checked")) check2 = true
        let check3 = false
        if (document.querySelector('#cd-checkbox3').classList.contains("t-is-checked")) check3 = true
        let radio1 = false
        if (document.querySelector('#cd-radio1').classList.contains("t-is-checked")) {
            radio1 = true
        }
        const tabData = {
            cdTime,
            check1,
            check2,
            check3,
            radio1
        }
        await this.saveTabData(tabData, tab)
        const message = '配置已保存'
        createMessage(message, 't-is-success', "M8 15A7 7 0 108 1a7 7 0 000 14zM4.5 8.2l.7-.7L7 9.3l3.8-3.8.7.7L7 10.7 4.5 8.2z")
    });
    
    document.querySelector('#cd-reset').addEventListener("click", async (event) => {
        event.stopPropagation()
        const tab = document.querySelector('#tabSelect .t-input__inner').value
        await this.updateUI(tab)
        const message = '配置已重置'
        createMessage(message, 't-is-success', "M8 15A7 7 0 108 1a7 7 0 000 14zM4.5 8.2l.7-.7L7 9.3l3.8-3.8.7.7L7 10.7 4.5 8.2z")
    });
})

async function getTabData(tab) {
    const result = await chrome.storage.local.get([`${tab}_data`]);
    return result[`${tab}_data`] || {
        cdTime: 10,
        check1: true,
        check2: true,
        check3: false,
        radio1: true
    };
}

async function saveTabData(tabData, tab) {
    await chrome.storage.local.set({ [`${tab}_data`]: tabData });
}

async function updateUI(tab) {
    const tabData = await this.getTabData(tab)
    document.querySelector('#cd-input-time').value = tabData.cdTime
    if (tabData.check1) {
        document.querySelector('#cd-checkbox1').classList.add("t-is-checked")
    } else {
        document.querySelector('#cd-checkbox1').classList.remove("t-is-checked")
    }
    if (tabData.check2) {
        document.querySelector('#cd-checkbox2').classList.add("t-is-checked")
    } else {
        document.querySelector('#cd-checkbox2').classList.remove("t-is-checked")
    }
    if (tabData.check3) {
        document.querySelector('#cd-checkbox3').classList.add("t-is-checked")
    } else {
        document.querySelector('#cd-checkbox3').classList.remove("t-is-checked")
    }
    if (tabData.radio1) {
        document.querySelector('#cd-radio1').classList.add("t-is-checked")
        document.querySelector('#cd-radio2').classList.remove("t-is-checked")
    } else {
        document.querySelector('#cd-radio1').classList.remove("t-is-checked")
        document.querySelector('#cd-radio2').classList.add("t-is-checked")
    }
}

function createMessage(message, cls, d) {
    const htmlStr = `
        <div class="t-message ${cls}">
        <svg
            fill="none"
            viewBox="0 0 16 16"
            width="1em"
            height="1em"
            class="t-icon t-icon-check-circle-filled"
        >
            <path
            fill="currentColor"
            d="${d}"
            fill-opacity="0.9"
            ></path></svg
        >${message}
        </div>`
    let container = document.createElement('div');
    container.innerHTML = htmlStr
    document.querySelector('.t-message__list').appendChild(container)
    setTimeout(() => {
        document.querySelector('.t-message__list').removeChild(container)
    }, 3000);
}

function rulesCheck() {
    document.querySelector("#tabSelect").classList.toggle("t-select-input--popup-visible");
    document.querySelector('#tabSelect .t-input__wrap').classList.toggle("t-popup-open");
    document.querySelector('#tabSelect .t-input').classList.toggle("t-input--focused");
    document.querySelector('#tabSelect .t-popup').classList.toggle("t-popup--animation-leave-to");
    document.querySelector('#tabSelect .t-popup').classList.toggle("t-popup--animation-enter-to");
    document.querySelector('#tabSelect .t-fake-arrow').classList.toggle("t-fake-arrow--active");
    let display = document.querySelector('#tabSelect .t-popup').style.display
    if (display === 'none') {
        document.querySelector('#tabSelect .t-popup').style.display = 'block'
    } else {
        document.querySelector('#tabSelect .t-popup').style.display = 'none'
    }
}

function tabSelect() {
    document.querySelector("#tabSelect").classList.toggle("t-select-input--popup-visible");
    document.querySelector('#tabSelect .t-input__wrap').classList.toggle("t-popup-open");
    document.querySelector('#tabSelect .t-input').classList.toggle("t-input--focused");
    document.querySelector('#tabSelect .t-popup').classList.toggle("t-popup--animation-leave-to");
    document.querySelector('#tabSelect .t-popup').classList.toggle("t-popup--animation-enter-to");
    document.querySelector('#tabSelect .t-fake-arrow').classList.toggle("t-fake-arrow--active");
    let display = document.querySelector('#tabSelect .t-popup').style.display
    if (display === 'none') {
        document.querySelector('#tabSelect .t-popup').style.display = 'block'
    } else {
        document.querySelector('#tabSelect .t-popup').style.display = 'none'
    }
}