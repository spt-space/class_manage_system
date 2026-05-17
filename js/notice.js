let notificationTimeout;
let icon = '';
const notification = document.getElementById('notification');

function showNotification(message, type) {
    // 清除之前的定时器和动画
    clearTimeout(notificationTimeout);
    notification.classList.remove('slide-in', 'slide-out');
    notification.style.opacity = '0';

    // 设置通知内容和样式
    notification.textContent = message;
    notification.style.opacity = '0';

    // 根据类型设置不同样式

    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            notification.style.border = '1px solid rgba(16, 174, 83, 1.0)';
            notification.style.background = 'rgba(46, 204, 113, 0.7)';
            notification.style.color = 'white';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            notification.style.border = '1px solid rgba(211, 166, 0, 1.0)';
            notification.style.background = 'rgba(241, 196, 15, 0.7)';
            notification.style.color = 'white';
            break;
        case 'error':
            icon = '<i class="fas fa-times-circle"></i>';
            notification.style.border = '1px solid rgba(181, 26, 10, 1.0)';
            notification.style.background = 'rgba(231, 76, 60, 0.7)';
            notification.style.color = 'white';
            break;
        case 'loading':
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            notification.style.border = '1px solid rgba(12, 112, 189, 1.0)';
            notification.style.background = 'rgba(42, 142, 219, 0.7)';
            notification.style.color = 'white';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
            notification.style.border = '1px solid rgba(200, 200, 200, 1.0)';
            notification.style.background = 'rgba(255, 255, 255, 0.7)';
            notification.style.color = 'black';
    }

    notification.innerHTML = icon + ' ' + message;
    // 强制重绘
    void notification.offsetWidth;

    // 添加滑入动画
    notification.classList.add('slide-in');

    // 设置3秒后自动滑出
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('slide-in');
        notification.classList.add('slide-out');
    }, 3000);
}