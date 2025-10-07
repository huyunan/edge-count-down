// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const snoozeButton = document.getElementById('snooze-btn');
  const sittingTimeDisplay = document.getElementById('set-message');
  
  // 从URL参数获取久坐时间
  const urlParams = new URLSearchParams(window.location.search);
  const sittingTime = urlParams.get('message') || '起来休息一下吧！';
  sittingTimeDisplay.textContent = sittingTime;
  
  // 处理"知道了"按钮点击
  snoozeButton.addEventListener('click', () => {
    window.close();
  });
}); 