document.addEventListener('DOMContentLoaded', function() {
    const chartContainer = document.querySelector('.chart-container');
    const API_URL = 'http://localhost:8000/api/news';

    // 기존 하드코딩된 마커 제거 (필요 시)
    // chartContainer.innerHTML = '<img src="https://i.imgur.com/G5g2f0x.png" alt="금융 시장 차트" class="chart-image">';

    async function loadNewsData() {
        try {
            console.log("Fetching news data...");
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("News data loaded:", data);

            renderMarkers(data);

        } catch (error) {
            console.error("Failed to load news data:", error);
            // 에러 발생 시 사용자에게 알림 (선택 사항)
        }
    }

    function renderMarkers(newsList) {
        // 기존 마커와 툴팁 제거 (이미지 제외)
        const existingMarkers = chartContainer.querySelectorAll('.event-marker, .tooltip');
        existingMarkers.forEach(el => el.remove());

        newsList.forEach((news, index) => {
            if (!news.analysis) return;

            // 랜덤 위치 생성 (차트 이미지 내)
            // 실제로는 날짜 등을 기반으로 X축을 결정해야 함
            const leftPos = 10 + (index * 8) + Math.random() * 5; // 10% ~ 90% 사이 분포
            const topPos = 20 + Math.random() * 60; // 20% ~ 80% 사이

            // 마커 생성
            const marker = document.createElement('div');
            marker.className = 'event-marker';
            marker.style.left = `${leftPos}%`;
            marker.style.top = `${topPos}%`;
            marker.textContent = index + 1;
            marker.setAttribute('data-event', `event-${index}`);
            
            // 감성/성향에 따른 색상 클래스 추가 (CSS 필요할 수 있음)
            // style.css의 .event-marker는 기본 네이비
            if (news.analysis.tone === 'Hawkish') {
                marker.style.backgroundColor = '#983030'; // 빨강 계열
                marker.style.borderColor = '#ffcccc';
            } else if (news.analysis.tone === 'Dovish') {
                marker.style.backgroundColor = '#306098'; // 파랑 계열
                marker.style.borderColor = '#cce5ff';
            }

            // 툴팁 생성
            const tooltip = document.createElement('div');
            tooltip.id = `event-${index}`;
            tooltip.className = 'tooltip';
            
            // 툴팁 내용 구성
            const sentimentClass = news.analysis.sentiment_score > 0 ? 'positive' : 'hawkish'; // 간단히 구분
            const sentimentLabel = news.analysis.sentiment_score > 0 ? 'Positive' : 'Negative';

            tooltip.innerHTML = `
                <h4>${news.leader} News</h4>
                <p class="news-title">"${news.title}"</p>
                <p class="news-summary">${news.analysis.summary}</p>
                <div class="nlp-tags">
                    <span class="tag" style="background-color: ${news.analysis.tone === 'Hawkish' ? '#983030' : '#306098'}">${news.analysis.tone}</span>
                    <span class="tag ${sentimentClass}">Score: ${news.analysis.sentiment_score}</span>
                </div>
                <p class="impact-assets">Impact: ${news.analysis.impact_assets.join(', ')}</p>
            `;

            chartContainer.appendChild(marker);
            chartContainer.appendChild(tooltip);

            // 이벤트 리스너 등록
            setupMarkerEvents(marker, tooltip);
        });
    }

    function setupMarkerEvents(marker, tooltip) {
        marker.addEventListener('mouseenter', () => {
            const markerRect = marker.getBoundingClientRect();
            const containerRect = chartContainer.getBoundingClientRect();

            // 툴팁 위치 계산 (기본: 마커 위쪽)
            let top = marker.offsetTop - tooltip.offsetHeight - 10;
            let left = marker.offsetLeft - (tooltip.offsetWidth / 2) + (marker.offsetWidth / 2);

            // 경계 처리 (화면 밖으로 나가는 것 방지 - 간단 버전)
            if (top < 0) top = marker.offsetTop + marker.offsetHeight + 10;
            if (left < 0) left = 10;
            if (left + tooltip.offsetWidth > chartContainer.offsetWidth) {
                left = chartContainer.offsetWidth - tooltip.offsetWidth - 10;
            }

            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            tooltip.classList.add('visible');
            
            // z-index 조정
            tooltip.style.zIndex = 100;
        });

        marker.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
    }

    // 데이터 로드 시작
    loadNewsData();
});
