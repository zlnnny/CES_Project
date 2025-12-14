document.addEventListener('DOMContentLoaded', function() {

    const markers = document.querySelectorAll('.event-marker');
    const chartContainer = document.querySelector('.chart-container');

    markers.forEach(marker => {
        const eventId = marker.getAttribute('data-event');
        const tooltip = document.getElementById(eventId);

        if (!tooltip) return;

        // 마우스가 마커 위에 올라갈 때
        marker.addEventListener('mouseenter', () => {
            // 툴팁 위치 계산
            const markerRect = marker.getBoundingClientRect();
            const containerRect = chartContainer.getBoundingClientRect();

            // 툴팁을 마커 오른쪽 위에 위치시킴
            let top = markerRect.top - containerRect.top - tooltip.offsetHeight - 10;
            let left = markerRect.left - containerRect.left + marker.offsetWidth / 2;

            // 툴팁이 화면 위로 벗어나는 경우, 아래에 표시
            if (top < 0) {
                top = markerRect.top - containerRect.top + marker.offsetHeight + 10;
            }

            // 툴팁이 화면 오른쪽으로 벗어나는 경우, 왼쪽에 표시
            if (left + tooltip.offsetWidth > containerRect.width) {
                left = markerRect.left - containerRect.left - tooltip.offsetWidth + marker.offsetWidth / 2;
            }

            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            
            tooltip.classList.add('visible');
        });

        // 마우스가 마커에서 벗어날 때
        marker.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
    });

});

