import React from 'react';
import styled from 'styled-components';

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: var(--color-bg-card);
    border-radius: 10px;
    overflow: hidden;
    font-family: var(--font-ko);

    th, td {
        padding: 1.2rem;
        text-align: left;
        border-bottom: 1px solid var(--color-border);
        color: var(--color-text-muted);
    }

    thead {
        background-color: rgba(255, 255, 255, 0.05);
    }

    th {
        color: var(--color-text-main);
        font-weight: bold;
    }

    tbody tr:hover {
        background-color: rgba(100, 255, 218, 0.05);
    }

    td:last-child {
        font-weight: bold;
        color: var(--color-text-main);
        font-family: var(--font-en);
    }

    td.rank-1 {
        color: var(--color-gold);
    }
`;

const PowerRanking = () => {
    return (
        <section id="ranking" className="container section-padding">
            <h2 className="section-title">Leader's Power Ranking</h2>
            <p className="section-subtitle">지난 7일간 시장에 가장 큰 영향을 미친 리더 순위입니다.</p>
            <Table>
                <thead>
                    <tr>
                        <th>순위</th>
                        <th>리더</th>
                        <th>소속</th>
                        <th>주요 발언 주제</th>
                        <th>영향력 점수</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="rank-1">1</td>
                        <td>Jerome Powell</td>
                        <td>미국 연방준비제도</td>
                        <td>통화 정책 및 금리 전망</td>
                        <td>95.8</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>Andrew Bailey</td>
                        <td>영국 중앙은행 (BoE)</td>
                        <td>영국 인플레이션 보고서</td>
                        <td>81.2</td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>우에다 가즈오</td>
                        <td>일본은행 (BoJ)</td>
                        <td>수익률 곡선 제어(YCC) 정책</td>
                        <td>77.5</td>
                    </tr>
                    <tr>
                        <td>4</td>
                        <td>Justin Trudeau</td>
                        <td>캐나다 총리</td>
                        <td>탄소세 및 에너지 정책</td>
                        <td>64.0</td>
                    </tr>
                </tbody>
            </Table>
        </section>
    );
};

export default PowerRanking;

