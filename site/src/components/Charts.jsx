import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const ChartSectionTitle = styled.h3`
    color: var(--color-accent);
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    border-left: 4px solid var(--color-accent);
    padding-left: 15px;
    font-family: var(--font-en);
    margin-top: ${props => props.marginTop ? '4rem' : '0'};
`;

const IndicesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: 400px 300px;
    gap: 20px;
`;

const LargeChart = styled.div`
    grid-column: ${props => props.gridColumn};
    grid-row: ${props => props.gridRow};
    height: 100%;
`;

const SmallChart = styled.div`
    grid-column: ${props => props.gridColumn};
    grid-row: ${props => props.gridRow};
    height: 100%;
`;

const Top10Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
`;

const Top10Largest = styled.div`
    grid-column: 1 / 3;
    grid-row: 1 / 3;
    min-height: 500px;
    height: 100%;
`;

const Top10Medium = styled.div`
    grid-column: 3 / 5;
    grid-row: ${props => props.row};
    height: 240px;
`;

const Top10Small = styled.div`
    height: 200px;
`;

const MarketListContainer = styled.div`
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    overflow: hidden;
    height: 600px;
`;

// TradingView Widget Component
const TradingViewWidget = ({ type, settings, style }) => {
    const containerRef = useRef();

    useEffect(() => {
        const script = document.createElement('script');
        script.src = type === 'advanced' 
            ? 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
            : type === 'screener'
            ? 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js'
            : 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify(settings);
        
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
            const widgetContainer = document.createElement('div');
            widgetContainer.className = 'tradingview-widget-container';
            widgetContainer.style.width = '100%';
            widgetContainer.style.height = '100%';
            
            const widgetDiv = document.createElement('div');
            widgetDiv.className = 'tradingview-widget-container__widget';
            
            widgetContainer.appendChild(widgetDiv);
            widgetContainer.appendChild(script);
            containerRef.current.appendChild(widgetContainer);
        }
    }, []); // Empty dependency array means this runs once on mount

    return <div ref={containerRef} style={{ width: '100%', height: '100%', ...style }} />;
};

const Charts = () => {
    return (
        <section id="charts" className="container section-padding">
            <h2 className="section-title">Charts</h2>
            <p className="section-subtitle">주요 지수 및 우량주의 실시간 시장 동향을 확인하세요.</p>
            
            {/* 1. Global Indices */}
            <ChartSectionTitle>Global Indices</ChartSectionTitle>
            <IndicesGrid>
                {/* S&P 500 */}
                <LargeChart gridColumn="1 / 4" gridRow="1">
                    <TradingViewWidget type="advanced" settings={{
                        "symbols": [["S&P 500","FOREXCOM:SPXUSD|1D"]],
                        "chartOnly": false,
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "colorTheme": "dark",
                        "autosize": true,
                        "showVolume": false,
                        "showMA": false,
                        "hideDateRanges": false,
                        "hideMarketStatus": false,
                        "hideSymbolLogo": false,
                        "scalePosition": "right",
                        "scaleMode": "Normal",
                        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
                        "fontSize": "10",
                        "noTimeScale": false,
                        "valuesTracking": "1",
                        "changeMode": "price-and-percent",
                        "chartType": "candlesticks",
                        "headerFontSize": "medium"
                    }} />
                </LargeChart>
                
                {/* NASDAQ */}
                <LargeChart gridColumn="4 / 7" gridRow="1">
                    <TradingViewWidget type="advanced" settings={{
                        "symbols": [["NASDAQ","NASDAQ:NDX|1D"]],
                        "chartOnly": false,
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "colorTheme": "dark",
                        "autosize": true,
                        "showVolume": false,
                        "showMA": false,
                        "hideDateRanges": false,
                        "hideMarketStatus": false,
                        "hideSymbolLogo": false,
                        "scalePosition": "right",
                        "scaleMode": "Normal",
                        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
                        "fontSize": "10",
                        "noTimeScale": false,
                        "valuesTracking": "1",
                        "changeMode": "price-and-percent",
                        "chartType": "candlesticks",
                        "headerFontSize": "medium"
                    }} />
                </LargeChart>

                {/* Dow Jones */}
                <SmallChart gridColumn="1 / 3" gridRow="2">
                    <TradingViewWidget type="mini" settings={{
                        "symbol": "FOREXCOM:DJI",
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "dateRange": "12M",
                        "colorTheme": "dark",
                        "isTransparent": false,
                        "autosize": true,
                        "largeChartUrl": ""
                    }} />
                </SmallChart>

                {/* Gold */}
                <SmallChart gridColumn="3 / 5" gridRow="2">
                    <TradingViewWidget type="mini" settings={{
                        "symbol": "OANDA:XAUUSD",
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "dateRange": "12M",
                        "colorTheme": "dark",
                        "isTransparent": false,
                        "autosize": true,
                        "largeChartUrl": ""
                    }} />
                </SmallChart>

                {/* Silver */}
                <SmallChart gridColumn="5 / 7" gridRow="2">
                    <TradingViewWidget type="mini" settings={{
                        "symbol": "OANDA:XAGUSD",
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "dateRange": "12M",
                        "colorTheme": "dark",
                        "isTransparent": false,
                        "autosize": true,
                        "largeChartUrl": ""
                    }} />
                </SmallChart>
            </IndicesGrid>

            {/* 2. Top 11 Market Cap */}
            <ChartSectionTitle marginTop>Top 11 Market Cap</ChartSectionTitle>
            <Top10Grid>
                {/* Rank 1: Nvidia */}
                <Top10Largest>
                    <TradingViewWidget type="advanced" settings={{
                        "symbols": [["Nvidia","NASDAQ:NVDA|1D"]],
                        "chartOnly": false,
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "colorTheme": "dark",
                        "autosize": true,
                        "showVolume": false,
                        "showMA": false,
                        "hideDateRanges": false,
                        "hideMarketStatus": false,
                        "hideSymbolLogo": false,
                        "scalePosition": "right",
                        "scaleMode": "Normal",
                        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
                        "fontSize": "10",
                        "noTimeScale": false,
                        "valuesTracking": "1",
                        "changeMode": "price-and-percent",
                        "chartType": "candlesticks",
                        "headerFontSize": "medium"
                    }} />
                </Top10Largest>

                {/* Rank 2: Apple */}
                <Top10Medium row="1">
                    <TradingViewWidget type="advanced" settings={{
                        "symbols": [["Apple","NASDAQ:AAPL|1D"]],
                        "chartOnly": false,
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "colorTheme": "dark",
                        "autosize": true,
                        "showVolume": false,
                        "showMA": false,
                        "hideDateRanges": false,
                        "hideMarketStatus": false,
                        "hideSymbolLogo": false,
                        "scalePosition": "right",
                        "scaleMode": "Normal",
                        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
                        "fontSize": "10",
                        "noTimeScale": false,
                        "valuesTracking": "1",
                        "changeMode": "price-and-percent",
                        "chartType": "candlesticks",
                        "headerFontSize": "medium"
                    }} />
                </Top10Medium>

                {/* Rank 3: Google (Alphabet) */}
                <Top10Medium row="2">
                    <TradingViewWidget type="advanced" settings={{
                        "symbols": [["Google","NASDAQ:GOOGL|1D"]],
                        "chartOnly": false,
                        "width": "100%",
                        "height": "100%",
                        "locale": "en",
                        "colorTheme": "dark",
                        "autosize": true,
                        "showVolume": false,
                        "showMA": false,
                        "hideDateRanges": false,
                        "hideMarketStatus": false,
                        "hideSymbolLogo": false,
                        "scalePosition": "right",
                        "scaleMode": "Normal",
                        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
                        "fontSize": "10",
                        "noTimeScale": false,
                        "valuesTracking": "1",
                        "changeMode": "price-and-percent",
                        "chartType": "candlesticks",
                        "headerFontSize": "medium"
                    }} />
                </Top10Medium>

                {/* Next 8 Small (Rank 4-11) */}
                {/* 4. Microsoft */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NASDAQ:MSFT", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
                {/* 5. Amazon */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NASDAQ:AMZN", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
                {/* 6. Broadcom */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NASDAQ:AVGO", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
                {/* 7. Meta */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NASDAQ:META", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
                {/* 8. Tesla */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NASDAQ:TSLA", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
                {/* 9. Berkshire */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NYSE:BRK.B", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
                {/* 10. TSMC */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NYSE:TSM", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
                {/* 11. Eli Lilly */}
                <Top10Small>
                    <TradingViewWidget type="mini" settings={{ "symbol": "NYSE:LLY", "width": "100%", "height": "100%", "locale": "en", "dateRange": "12M", "colorTheme": "dark", "isTransparent": false, "autosize": true, "largeChartUrl": "" }} />
                </Top10Small>
            </Top10Grid>

            {/* 3. Market Cap Rank */}
            <ChartSectionTitle marginTop>Market Cap Rank</ChartSectionTitle>
            <MarketListContainer>
                <TradingViewWidget type="screener" settings={{
                    "width": "100%",
                    "height": "100%",
                    "defaultColumn": "overview",
                    "defaultScreen": "most_capitalized",
                    "market": "america",
                    "showToolbar": true,
                    "colorTheme": "dark",
                    "locale": "en"
                }} />
            </MarketListContainer>
        </section>
    );
};

export default Charts;

