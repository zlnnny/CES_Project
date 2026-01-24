import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const HeroSection = styled.section`
    position: relative;
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #030712; /* Solid deep dark background */
    overflow: hidden;
    text-align: center;
`;

const CanvasBackground = styled.canvas`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
`;

const ContentWrapper = styled.div`
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    max-width: 1100px;
    padding: 0 24px;
`;

const Badge = styled.div`
    background: rgba(103, 232, 249, 0.08);
    color: #67e8f9;
    padding: 0.6rem 1.5rem;
    border-radius: 50px;
    border: 1px solid rgba(103, 232, 249, 0.2);
    font-size: 0.9rem;
    font-weight: 500; /* Thinner */
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    backdrop-filter: blur(8px);
    text-transform: uppercase;
`;

const Title = styled.h1`
    font-size: 5.2rem; /* Slightly reduced from 5.8rem */
    font-weight: 500; /* Thinner */
    margin: 0;
    color: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: -0.03em;
    line-height: 1.1;
    max-width: 950px;
    
    /* Stronger Mint Gradient */
    background: linear-gradient(135deg, #ffffff 10%, #67e8f9 50%, #22d3ee 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;

    @media (max-width: 768px) {
        font-size: 2.8rem;
    }
`;

const Description = styled.p`
    font-size: 1.25rem;
    color: #94a3b8;
    max-width: 750px;
    line-height: 1.6;
    font-weight: 400; /* Thinner */
    margin-bottom: 1.5rem;
    opacity: 0.9;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 1.25rem;
    margin-top: 1rem;

    @media (max-width: 480px) {
        flex-direction: column;
        width: 100%;
    }
`;

const PrimaryButton = styled.button`
    background: var(--color-accent-gradient);
    color: #020617;
    padding: 1.1rem 2.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    border: none;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 20px rgba(34, 211, 238, 0.3);

    &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(34, 211, 238, 0.5);
        filter: brightness(1.1);
    }
`;

const SecondaryButton = styled.button`
    background-color: rgba(255, 255, 255, 0.03);
    color: #ffffff;
    padding: 1.1rem 2.5rem;
    font-size: 1.1rem;
    font-weight: 500; /* Thinner */
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);

    &:hover {
        background-color: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
    }
`;

const Hero = () => {
    const canvasRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const particles = [];
        const particleCount = 25; 
        const maxDistance = 450; 
        
        const colors = [
            '#3b82f6', // Blue
            '#f97316', // Orange
            '#10b981', // Green
            '#6366f1'  // Indigo
        ];

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.25;
                this.vy = (Math.random() - 0.5) * 0.25;
                this.radius = Math.random() * 6 + 4; 
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            draw() {
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = 0.6;
                ctx.shadowBlur = 25;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        for (let i = 0; i < particleCount; i++) particles.push(new Particle());

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            
            // Background fill - SOLID DARK
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, width, height);

            // Draw lines (Edges) - Darker and clearer
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < maxDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; 
                        ctx.globalAlpha = (1 - distance / maxDistance);
                        ctx.lineWidth = 1.2;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            particles.forEach(p => {
                p.update();
                p.draw();
            });
            
            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        render();
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <HeroSection>
            <CanvasBackground ref={canvasRef} />
            <ContentWrapper>
                <Badge>AI-Powered Financial Intelligence</Badge>
                <Title>
                    Person-Market<br />
                    Influence Graph
                </Title>
                <Description>
                    Track how real-world news events affect relationships between public figures and financial assets using NLP, embeddings, and graph-based scoring.
                </Description>
                <ButtonGroup>
                    <PrimaryButton onClick={() => navigate('/power-rankings')}>View Power Rankings</PrimaryButton>
                    <SecondaryButton onClick={() => navigate('/markets')}>Explore Markets</SecondaryButton>
                </ButtonGroup>
            </ContentWrapper>
        </HeroSection>
    );
};

export default Hero;
