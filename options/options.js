// 初始化
document.addEventListener("DOMContentLoaded", async () => {
    // 加载事件

    // 设置事件监听
    document.getElementById("tabSelect").addEventListener("click", async () => {
        tabSelect()
    });
    document.querySelector('#tabSelect .cd-select-tab1').addEventListener("click", async (event) => {
        event.stopPropagation()
        document.querySelector('#tabSelect .t-input__inner').value = 'Tab1'
        tabSelect()
    });
    document.querySelector('#tabSelect .cd-select-tab2').addEventListener("click", async (event) => {
        event.stopPropagation()
        document.querySelector('#tabSelect .t-input__inner').value = 'Tab2'
        tabSelect()
    });
    document.querySelector('#tabSelect .cd-select-tab3').addEventListener("click", async (event) => {
        event.stopPropagation()
        document.querySelector('#tabSelect .t-input__inner').value = 'Tab3'
        tabSelect()
    });
    document.querySelector("#cd-checkbox1").addEventListener("click", async (event) => {
        event.stopPropagation()
        if (event.target.tagName === 'SPAN') return
        document.querySelector('#cd-checkbox1').classList.toggle("t-is-checked");
        if (document.querySelector('#cd-checkbox1 .t-checkbox__former').hasAttribute("checked")) {
            document.querySelector('#cd-checkbox1 .t-checkbox__former').removeAttribute("checked");
        } else {
            document.querySelector('#cd-checkbox1 .t-checkbox__former').setAttribute("checked", "");
        }
    }, true);
    document.querySelector("#cd-checkbox2").addEventListener("click", async (event) => {
        event.stopPropagation()
        if (event.target.tagName === 'SPAN') return
        document.querySelector('#cd-checkbox2').classList.toggle("t-is-checked");
        if (document.querySelector('#cd-checkbox2 .t-checkbox__former').hasAttribute("checked")) {
            document.querySelector('#cd-checkbox2 .t-checkbox__former').removeAttribute("checked");
        } else {
            document.querySelector('#cd-checkbox2 .t-checkbox__former').setAttribute("checked", "");
        }
    }, true);
    document.querySelector("#cd-checkbox3").addEventListener("click", async (event) => {
        event.stopPropagation()
        if (event.target.tagName === 'SPAN') return
        document.querySelector('#cd-checkbox3').classList.toggle("t-is-checked");
        if (document.querySelector('#cd-checkbox3 .t-checkbox__former').hasAttribute("checked")) {
            document.querySelector('#cd-checkbox3 .t-checkbox__former').removeAttribute("checked");
        } else {
            document.querySelector('#cd-checkbox3 .t-checkbox__former').setAttribute("checked", "");
        }
    }, true);
    document.querySelector("#cd-radio1").addEventListener("click", async (event) => {
        event.stopPropagation()
        document.getElementById('cd-radio1').classList.add("t-is-checked");
        document.getElementById('cd-radio2').classList.remove("t-is-checked");

        document.querySelector('#cd-radio1 .t-radio__former').setAttribute("checked", "");
        document.querySelector('#cd-radio2 .t-radio__former').removeAttribute("checked");
    }, true);
    document.querySelector("#cd-radio2").addEventListener("click", async (event) => {
        event.stopPropagation()
        document.getElementById('cd-radio1').classList.remove("t-is-checked");
        document.getElementById('cd-radio2').classList.add("t-is-checked");

        document.querySelector('#cd-radio1 .t-radio__former').removeAttribute("checked");
        document.querySelector('#cd-radio2 .t-radio__former').setAttribute("checked", "");
    }, true);
})

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