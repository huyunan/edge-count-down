// 初始化
document.addEventListener("DOMContentLoaded", async () => {
  // 加载事件

  // 设置事件监听
  document.getElementById("tabSelect").addEventListener("click", async () => {
    document.querySelector("#tabSelect").classList.toggle("t-select-input--popup-visible");
    document.querySelector('#tabSelect .t-input__wrap').classList.toggle("t-popup-open");
    document.querySelector('#tabSelect .t-input').classList.toggle("t-input--focused");
    document.querySelector('#tabSelect .t-popup').classList.toggle("t-popup--animation-leave-to");
    document.querySelector('#tabSelect .t-popup').classList.toggle("t-popup--animation-enter-to");
    let display = document.querySelector('#tabSelect .t-popup').style.display
    if (display === 'none') {
        document.querySelector('#tabSelect .t-popup').style.display = 'block'
    } else {
        document.querySelector('#tabSelect .t-popup').style.display = 'none'
    }
  });
})